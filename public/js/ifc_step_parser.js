// js/ifc_step_parser.js
/**
 * Adaptive Twin — Complete Client-Side BIM IFC & CAD Parser (ISO 10303-21 STEP)
 * 
 * Works 100% in-browser on static platforms (GitHub Pages, offline, Streamlit, etc.)
 * Parses IFC files from Autodesk Revit, ArchiCAD, BlenderBIM, Vectorworks, etc.
 * Extracts:
 *  - Storeys & Levels with true elevations and Arabic names
 *  - Architectural Walls (Standard, Elemented, Curtain Walls) with 3D start/end coordinates
 *  - Floor Slabs & Roof Slabs with true profile polygons and boundaries
 *  - Structural Columns & Beams
 *  - Doors & Windows with dimensions, wall host associations, and 3D positions
 *  - Architectural Stairs & Landings
 *  - Spatial Rooms (Spaces) with areas, functional classifications, and capacities
 *  - Automatic Geometric Centering to (0, 0, 0) in the axial screen grid
 */

(function(window) {
    'use strict';

    class IFCStepParser {
        constructor(rawContent) {
            this.rawContent = rawContent || '';
            this.entities = {};
            this.entitiesByType = {};
            this.scale = 1.0;
            this.unitName = "METRE";
            this.projectName = "مشروع BIM معماري";
            this.buildingName = "مبنى معماري مستورد";
            this.storeys = {};
            this.containment = {};
            this.walls = {};
            this.slabs = {};
            this.columns = {};
            this.beams = {};
            this.openings = {};
            this.stairs = {};
            this.spaces = {};
            this.extractedAreas = [];
            this.relVoids = {};
            this.relFills = {};
            this.elementToWall = {};
            this.decomposedParents = new Set();
            this.aggregatedChildren = new Map();
        }

        static parse(ifcContent) {
            const parser = new IFCStepParser(ifcContent);
            return parser.parse();
        }

        parse() {
            this._tokenizeAndBuildGraph();
            this._detectUnits();
            this._extractProjectInfo();
            this._extractStoreys();
            this._extractContainment();
            this._extractRelationships();
            this._extractWalls();
            this._extractSlabs();
            this._extractColumns();
            this._extractBeams();
            this._extractOpenings();
            this._extractStairs();
            this._extractSpaces();
            const model = this._buildModelDict();
            return IFCStepParser.centerModelDict(model);
        }

        _tokenizeAndBuildGraph() {
            // 1. تنظيف التعليقات /* ... */
            let clean = this.rawContent.replace(/\/\*[\s\S]*?\*\//g, '');
            
            // 2. استخراج قسم البيانات DATA ... ENDSEC
            const dataMatch = clean.match(/DATA\s*;([\s\S]*?)ENDSEC\s*;/i);
            const dataText = dataMatch ? dataMatch[1] : clean;

            // 3. استخراج المساحات المسجلة بـ IFCQUANTITYAREA
            const areaRegex = /IFCQUANTITYAREA\s*\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)/gi;
            let mArea;
            while ((mArea = areaRegex.exec(clean)) !== null) {
                const val = parseFloat(mArea[1]);
                if (!isNaN(val)) this.extractedAreas.push(val);
            }

            // 4. تقسيم السجلات باستخدام مؤشرات #digits =
            const recordRegex = /#\d+\s*=/g;
            const starts = [];
            let mRec;
            while ((mRec = recordRegex.exec(dataText)) !== null) {
                starts.push(mRec.index);
            }

            const totalStarts = starts.length;
            for (let i = 0; i < totalStarts; i++) {
                const startIdx = starts[i];
                const endIdx = (i + 1 < totalStarts) ? starts[i + 1] : dataText.length;
                const chunk = dataText.substring(startIdx, endIdx).trim().replace(/;[\s\r\n]*$/, '');

                const m = chunk.match(/^#(\d+)\s*=\s*([A-Za-z0-9_]+)\s*\(([\s\S]*)\)$/);
                if (m) {
                    const eid = parseInt(m[1], 10);
                    const etype = m[2].toUpperCase();
                    const rawArgs = m[3];
                    const args = this._parseArgs(rawArgs);

                    this.entities[eid] = { type: etype, args: args };
                    if (!this.entitiesByType[etype]) {
                        this.entitiesByType[etype] = [];
                    }
                    this.entitiesByType[etype].push(eid);
                }
            }
        }

        _parseArgs(argsStr) {
            const args = [];
            let current = [];
            let depth = 0;
            let inStr = false;
            let i = 0;
            const n = argsStr.length;

            while (i < n) {
                const c = argsStr[i];
                if (c === "'" && (i === 0 || argsStr[i - 1] !== "\\")) {
                    if (inStr && i + 1 < n && argsStr[i + 1] === "'") {
                        current.push("'");
                        i += 2;
                        continue;
                    }
                    inStr = !inStr;
                    current.push(c);
                } else if (!inStr) {
                    if (c === '(') {
                        depth++;
                        current.push(c);
                    } else if (c === ')') {
                        depth--;
                        current.push(c);
                    } else if (c === ',' && depth === 0) {
                        args.push(current.join("").trim());
                        current = [];
                    } else {
                        current.push(c);
                    }
                } else {
                    current.push(c);
                }
                i++;
            }
            if (current.length > 0) {
                args.push(current.join("").trim());
            }

            return args.map(a => this._convertToken(a));
        }

        _convertToken(token) {
            token = (token || "").trim();
            if (!token || token === '$' || token === '*') return null;
            if (token.startsWith("'") && token.endsWith("'")) {
                return token.slice(1, -1).replace(/''/g, "'");
            }
            if (token.startsWith("(") && token.endsWith(")")) {
                const inner = token.slice(1, -1).trim();
                if (!inner) return [];
                return this._parseArgs(inner);
            }
            if (token.startsWith("#")) {
                const parsed = parseInt(token.slice(1), 10);
                return isNaN(parsed) ? token : parsed;
            }
            if (token.startsWith(".") && token.endsWith(".")) {
                return token.slice(1, -1).toUpperCase();
            }
            if (token.includes('.') || token.toUpperCase().includes('E')) {
                const f = parseFloat(token);
                if (!isNaN(f)) return f;
            }
            const intVal = parseInt(token, 10);
            if (!isNaN(intVal) && String(intVal) === token) return intVal;
            return token;
        }

        _getEntity(ref) {
            if (typeof ref === 'number') {
                return this.entities[ref] || null;
            }
            if (typeof ref === 'string' && ref.startsWith("#")) {
                const eid = parseInt(ref.slice(1), 10);
                return this.entities[eid] || null;
            }
            return null;
        }

        _detectUnits() {
            const units = this.entitiesByType['IFCSIUNIT'] || [];
            for (const eid of units) {
                const ent = this.entities[eid];
                const args = ent.args || [];
                if (args.length >= 3 && String(args[1]).includes('LENGTHUNIT')) {
                    const prefix = args[2];
                    const unit = args.length > 3 ? args[3] : args[2];
                    if (prefix === 'MILLI' || unit === 'MILLI') {
                        this.scale = 0.001;
                        this.unitName = "MILLIMETRE";
                        return;
                    } else if (prefix === 'CENTI') {
                        this.scale = 0.01;
                        this.unitName = "CENTIMETRE";
                        return;
                    } else if (unit === 'METRE' && !prefix) {
                        this.scale = 1.0;
                        this.unitName = "METRE";
                        return;
                    }
                }
            }
        }

        _extractProjectInfo() {
            const projects = this.entitiesByType['IFCPROJECT'] || [];
            if (projects.length > 0) {
                const ent = this.entities[projects[0]];
                if (ent.args && ent.args.length > 2 && ent.args[2]) {
                    this.projectName = String(ent.args[2]);
                }
            }
            const buildings = this.entitiesByType['IFCBUILDING'] || [];
            if (buildings.length > 0) {
                const ent = this.entities[buildings[0]];
                if (ent.args && ent.args.length > 2 && ent.args[2]) {
                    this.buildingName = String(ent.args[2]);
                }
            }
        }

        _extractStoreys() {
            const storeyEids = this.entitiesByType['IFCBUILDINGSTOREY'] || [];
            const found = [];

            for (const eid of storeyEids) {
                const ent = this.entities[eid];
                const args = ent.args || [];
                const guid = (args.length > 0 && args[0]) ? String(args[0]) : `storey_${eid}`;
                const name = (args.length > 2 && args[2]) ? String(args[2]) : `Level ${found.length}`;
                let elev = 0.0;

                if (args.length > 9 && args[9] !== null && typeof args[9] === 'number') {
                    elev = args[9];
                } else {
                    const placementRef = args.length > 5 ? args[5] : null;
                    const [, , pz] = this._resolvePlacement(placementRef);
                    elev = pz;
                }

                found.push({ eid, guid, name, rawElev: elev });
            }

            if (found.length > 0) {
                const maxE = Math.max(...found.map(f => Math.abs(f.rawElev)));
                if (maxE > 200.0 && this.scale === 1.0) {
                    this.scale = 0.001;
                    this.unitName = "MILLIMETRE (auto-detected)";
                }
            }

            found.sort((a, b) => a.rawElev - b.rawElev);

            for (let i = 0; i < found.length; i++) {
                const f = found[i];
                const sId = `storey_${f.eid}`;
                const elevM = f.rawElev * this.scale;
                let heightM = 3.5;

                if (i + 1 < found.length) {
                    const nextE = found[i + 1].rawElev * this.scale;
                    heightM = Math.max(2.5, +(nextE - elevM).toFixed(2));
                } else if (Object.keys(this.storeys).length > 0) {
                    const last = Object.values(this.storeys).pop();
                    heightM = +(last.height).toFixed(2);
                }

                const nameEn = f.name;
                const nameAr = this._translateStoreyName(nameEn, i, elevM);

                this.storeys[sId] = {
                    id: sId,
                    eid: f.eid,
                    name_ar: nameAr,
                    name_en: nameEn,
                    elevation: +elevM.toFixed(2),
                    height: heightM
                };
            }

            if (Object.keys(this.storeys).length === 0) {
                this.storeys['storey_ground'] = {
                    id: 'storey_ground',
                    eid: 0,
                    name_ar: 'الطابق الأرضي (Level 0)',
                    name_en: 'Ground Floor',
                    elevation: 0.0,
                    height: 3.5
                };
            }
        }

        _translateStoreyName(nameEn, index, elevM) {
            const nl = (nameEn || "").toLowerCase();
            const sign = elevM >= 0 ? `+${elevM.toFixed(2)}` : `${elevM.toFixed(2)}`;

            if (nl.includes('basement') || nl.includes('underground') || nl.includes('قبو') || elevM < -0.5) {
                return `طابق القبو (${nameEn} ${sign}م)`;
            }
            if (nl.includes('ground') || nl.includes('level 0') || nl.includes('floor 0') || nl.includes('أرضي') || Math.abs(elevM) < 0.2) {
                return `الطابق الأرضي (${nameEn} ${elevM.toFixed(2)}م)`;
            }
            if (nl.includes('roof') || nl.includes('سطح') || nl.includes('terrace')) {
                return `منسوب السطح / الروف (${nameEn} ${sign}م)`;
            }
            if (nl.includes('first') || nl.includes('level 1') || nl.includes('floor 1')) {
                return `الطابق الأول (${nameEn} ${sign}م)`;
            }
            if (nl.includes('second') || nl.includes('level 2') || nl.includes('floor 2')) {
                return `الطابق الثاني (${nameEn} ${sign}م)`;
            }
            return `طابق معماري: ${nameEn} (${sign}م)`;
        }

        _extractContainment() {
            const rels = this.entitiesByType['IFCRELCONTAINEDINSPATIALSTRUCTURE'] || [];
            for (const eid of rels) {
                const ent = this.entities[eid];
                const args = ent.args || [];
                if (args.length >= 6) {
                    const elems = Array.isArray(args[4]) ? args[4] : [args[4]];
                    const structRef = args[5];
                    const sId = `storey_${structRef}`;
                    for (const el of elems) {
                        if (el !== null && el !== undefined) {
                            this.containment[el] = sId;
                        }
                    }
                }
            }
        }

        _extractRelationships() {
            // 1. IFCRELVOIDSELEMENT: الجدار الحاضن ينشئ فتحة فراغية
            const relVoids = this.entitiesByType['IFCRELVOIDSELEMENT'] || [];
            for (const eid of relVoids) {
                const ent = this.entities[eid];
                const args = ent.args || [];
                if (args.length >= 6) {
                    const wallRef = args[4];
                    const openingRef = args[5];
                    this.relVoids[openingRef] = wallRef;
                }
            }

            // 2. IFCRELFILLSELEMENT: الفتحة الفراغية تستضيف باباً أو نافذة
            const relFills = this.entitiesByType['IFCRELFILLSELEMENT'] || [];
            for (const eid of relFills) {
                const ent = this.entities[eid];
                const args = ent.args || [];
                if (args.length >= 6) {
                    const openingRef = args[4];
                    const elementRef = args[5];
                    this.relFills[elementRef] = openingRef;
                    const wallRef = this.relVoids[openingRef];
                    if (wallRef) {
                        this.elementToWall[elementRef] = wallRef;
                    }
                }
            }

            // 3. IFCRELAGGREGATES & IFCRELDECOMPOSES: تفكيك الحاويات والتجميع الهيكلي
            this.decomposedParents = new Set();
            this.aggregatedChildren = new Map();
            const relAggregates = [
                ...(this.entitiesByType['IFCRELAGGREGATES'] || []),
                ...(this.entitiesByType['IFCRELDECOMPOSES'] || [])
            ];
            for (const eid of relAggregates) {
                const ent = this.entities[eid];
                const args = ent ? ent.args || [] : [];
                if (args.length >= 6) {
                    const parentRef = args[4];
                    const childrenRefs = Array.isArray(args[5]) ? args[5] : [args[5]];
                    if (parentRef) {
                        this.decomposedParents.add(parentRef);
                        for (const cRef of childrenRefs) {
                            if (cRef) this.aggregatedChildren.set(cRef, parentRef);
                        }
                    }
                }
            }
        }

        _resolvePlacement(placementRef) {
            let x = 0.0, y = 0.0, z = 0.0, rot = 0.0;
            if (!placementRef) return [x, y, z, rot];

            let curr = this._getEntity(placementRef);
            let loopGuard = 0;
            const matrices = [];

            while (curr && curr.type === 'IFCLOCALPLACEMENT' && loopGuard < 12) {
                loopGuard++;
                const relPlacementRef = curr.args && curr.args.length > 1 ? curr.args[1] : null;
                const parentRef = curr.args && curr.args.length > 0 ? curr.args[0] : null;

                if (relPlacementRef) {
                    const axisEnt = this._getEntity(relPlacementRef);
                    if (axisEnt && (axisEnt.type === 'IFCAXIS2PLACEMENT3D' || axisEnt.type === 'IFCAXIS2PLACEMENT2D')) {
                        const ptRef = axisEnt.args && axisEnt.args.length > 0 ? axisEnt.args[0] : null;
                        const refDirRef = axisEnt.args && axisEnt.args.length > 2 ? axisEnt.args[2] : null;

                        let lx = 0.0, ly = 0.0, lz = 0.0;
                        if (ptRef) {
                            const [px, py, pz] = this._resolvePoint(ptRef);
                            lx = px; ly = py; lz = pz;
                        }
                        let lrot = 0.0;
                        if (refDirRef) {
                            const dirEnt = this._getEntity(refDirRef);
                            if (dirEnt && dirEnt.type === 'IFCDIRECTION') {
                                const dargs = dirEnt.args && dirEnt.args.length > 0 ? dirEnt.args[0] : [];
                                if (Array.isArray(dargs) && dargs.length >= 2) {
                                    lrot = Math.atan2(dargs[1], dargs[0]);
                                }
                            }
                        }
                        matrices.unshift({ x: lx, y: ly, z: lz, rot: lrot });
                    }
                }
                curr = parentRef ? this._getEntity(parentRef) : null;
            }

            // تطبيق التحويلات التراكمية
            for (const m of matrices) {
                const cosR = Math.cos(rot);
                const sinR = Math.sin(rot);
                x += (m.x * cosR - m.y * sinR);
                y += (m.x * sinR + m.y * cosR);
                z += m.z;
                rot += m.rot;
            }

            return [x, y, z, rot];
        }

        _resolvePoint(ptRef) {
            const ent = this._getEntity(ptRef);
            if (!ent) return [0.0, 0.0, 0.0];
            if (ent.type === 'IFCCARTESIANPOINT') {
                const coords = (ent.args && ent.args.length > 0 && Array.isArray(ent.args[0])) ? ent.args[0] : [];
                return [
                    coords.length > 0 ? coords[0] : 0.0,
                    coords.length > 1 ? coords[1] : 0.0,
                    coords.length > 2 ? coords[2] : 0.0
                ];
            }
            return [0.0, 0.0, 0.0];
        }

        _resolveCurveEndpoints(curveRef) {
            const ent = this._getEntity(curveRef);
            if (!ent) return null;
            const etype = ent.type;
            const args = ent.args || [];

            if (etype === 'IFCPOLYLINE') {
                const ptRefs = (args.length > 0 && Array.isArray(args[0])) ? args[0] : [];
                if (ptRefs.length >= 2) {
                    const p1 = this._resolvePoint(ptRefs[0]);
                    const p2 = this._resolvePoint(ptRefs[ptRefs.length - 1]);
                    return [p1, p2];
                }
            } else if (etype === 'IFCTRIMMEDCURVE') {
                const basisRef = args.length > 0 ? args[0] : null;
                const trim1 = args.length > 1 ? args[1] : null;
                const trim2 = args.length > 2 ? args[2] : null;
                let p1 = null, p2 = null;
                if (Array.isArray(trim1)) {
                    for (const t of trim1) {
                        const pt = this._resolvePoint(t);
                        if (pt[0] !== 0 || pt[1] !== 0) { p1 = pt; break; }
                    }
                }
                if (Array.isArray(trim2)) {
                    for (const t of trim2) {
                        const pt = this._resolvePoint(t);
                        if (pt[0] !== 0 || pt[1] !== 0) { p2 = pt; break; }
                    }
                }
                if (p1 && p2) return [p1, p2];
                return basisRef ? this._resolveCurveEndpoints(basisRef) : null;
            } else if (etype === 'IFCLINE') {
                const p1Ref = args.length > 0 ? args[0] : null;
                const dirRef = args.length > 1 ? args[1] : null;
                const p1 = p1Ref ? this._resolvePoint(p1Ref) : [0.0, 0.0, 0.0];
                let dx = 1.0, dy = 0.0, mag = 10.0;
                if (dirRef) {
                    const dent = this._getEntity(dirRef);
                    if (dent && dent.type === 'IFCVECTOR') {
                        mag = (dent.args && dent.args.length > 1) ? dent.args[1] : 10.0;
                        const dref = dent.args && dent.args.length > 0 ? dent.args[0] : null;
                        if (dref) {
                            const dsub = this._getEntity(dref);
                            if (dsub && dsub.type === 'IFCDIRECTION') {
                                const dcoords = (dsub.args && Array.isArray(dsub.args[0])) ? dsub.args[0] : [1.0, 0.0];
                                dx = dcoords[0] || 1.0;
                                dy = dcoords[1] || 0.0;
                            }
                        }
                    }
                }
                const p2 = [p1[0] + dx * mag, p1[1] + dy * mag, p1.length > 2 ? p1[2] : 0.0];
                return [p1, p2];
            } else if (etype === 'IFCCOMPOSITECURVE') {
                const segs = (args.length > 0 && Array.isArray(args[0])) ? args[0] : [];
                if (segs.length > 0) {
                    const firstSeg = this._getEntity(segs[0]);
                    const lastSeg = this._getEntity(segs[segs.length - 1]);
                    const c1 = firstSeg && firstSeg.args && firstSeg.args.length > 2 ? firstSeg.args[2] : null;
                    const c2 = lastSeg && lastSeg.args && lastSeg.args.length > 2 ? lastSeg.args[2] : null;
                    const pts1 = c1 ? this._resolveCurveEndpoints(c1) : null;
                    const pts2 = c2 ? this._resolveCurveEndpoints(c2) : null;
                    if (pts1 && pts2) return [pts1[0], pts2[1]];
                    if (pts1) return pts1;
                }
            }
            return null;
        }

        _findAllCartesianPoints(ref, maxDepth = 4) {
            if (maxDepth <= 0) return [];
            const ent = this._getEntity(ref);
            if (!ent) return [];
            if (ent.type === 'IFCCARTESIANPOINT') {
                return [this._resolvePoint(ref)];
            }
            const results = [];
            for (const arg of (ent.args || [])) {
                if (typeof arg === 'number') {
                    results.push(...this._findAllCartesianPoints(arg, maxDepth - 1));
                } else if (Array.isArray(arg)) {
                    for (const sub of arg) {
                        if (typeof sub === 'number') {
                            results.push(...this._findAllCartesianPoints(sub, maxDepth - 1));
                        }
                    }
                }
            }
            return results;
        }

        _resolveWallGeometry(shapeRef) {
            let axisPts = null;
            let length = 0.0;
            let thickness = 0.25 / Math.max(1e-5, this.scale);
            let height = 3.0 / Math.max(1e-5, this.scale);

            const ent = this._getEntity(shapeRef);
            if (!ent) return [axisPts, length, thickness, height];

            let reps = [];
            if (ent.type === 'IFCPRODUCTDEFINITIONSHAPE') {
                const repList = (ent.args && ent.args.length > 2 && Array.isArray(ent.args[2])) ? ent.args[2] : [];
                reps = repList;
            } else if (ent.type === 'IFCSHAPEREPRESENTATION') {
                reps = [shapeRef];
            }

            for (const rRef of reps) {
                const rEnt = this._getEntity(rRef);
                if (!rEnt || rEnt.type !== 'IFCSHAPEREPRESENTATION') continue;

                const repId = (rEnt.args && rEnt.args.length > 1 && rEnt.args[1]) ? String(rEnt.args[1]) : "";
                const items = (rEnt.args && rEnt.args.length > 3 && Array.isArray(rEnt.args[3])) ? rEnt.args[3] : [];

                if (repId.includes('Axis') || repId.includes('Curve2D')) {
                    for (const itemRef of items) {
                        const pts = this._resolveCurveEndpoints(itemRef);
                        if (pts) {
                            axisPts = pts;
                            break;
                        }
                    }
                } else if (repId.includes('SweptSolid') || repId.includes('Body') || repId.includes('Brep') || repId.includes('SurfaceModel')) {
                    for (const itemRef of items) {
                        const itemEnt = this._getEntity(itemRef);
                        if (!itemEnt) continue;

                        if (itemEnt.type === 'IFCEXTRUDEDAREASOLID') {
                            const eargs = itemEnt.args || [];
                            const profRef = eargs.length > 0 ? eargs[0] : null;
                            const depth = (eargs.length > 3 && typeof eargs[3] === 'number') ? eargs[3] : height;
                            height = depth;

                            if (profRef) {
                                const prof = this._getEntity(profRef);
                                if (prof && prof.type === 'IFCRECTANGLEPROFILEDEF') {
                                    const pargs = prof.args || [];
                                    const xdim = (pargs.length > 3 && typeof pargs[3] === 'number') ? pargs[3] : 0.0;
                                    const ydim = (pargs.length > 4 && typeof pargs[4] === 'number') ? pargs[4] : 0.0;
                                    length = Math.max(xdim, ydim);
                                    thickness = Math.min(xdim, ydim) > 0 ? Math.min(xdim, ydim) : thickness;
                                } else if (prof && (prof.type === 'IFCARBITRARYCLOSEDPROFILEDEF' || prof.type === 'IFCARBITRARYPROFILEDEFWITHVOIDS')) {
                                    const outerCurveRef = prof.args && prof.args.length > 2 ? prof.args[2] : null;
                                    const outerEnt = this._getEntity(outerCurveRef);
                                    if (outerEnt && outerEnt.type === 'IFCPOLYLINE') {
                                        const ptRefs = (outerEnt.args && Array.isArray(outerEnt.args[0])) ? outerEnt.args[0] : [];
                                        const polyPts = ptRefs.map(pr => this._resolvePoint(pr));
                                        if (polyPts.length > 0) {
                                            const pxs = polyPts.map(p => p[0]);
                                            const pys = polyPts.map(p => p[1]);
                                            const dx = Math.max(...pxs) - Math.min(...pxs);
                                            const dy = Math.max(...pys) - Math.min(...pys);
                                            if (dx > 0 || dy > 0) {
                                                length = Math.max(dx, dy);
                                                thickness = Math.min(dx, dy) > 0 ? Math.min(dx, dy) : thickness;
                                                if (!axisPts && polyPts.length >= 2) {
                                                    let bestSeg = [polyPts[0], polyPts[1]];
                                                    let bestLen = 0.0;
                                                    for (let k = 0; k < polyPts.length; k++) {
                                                        const ka = polyPts[k];
                                                        const kb = polyPts[(k + 1) % polyPts.length];
                                                        const slen = Math.hypot(kb[0] - ka[0], kb[1] - ka[1]);
                                                        if (slen > bestLen) {
                                                            bestLen = slen;
                                                            bestSeg = [ka, kb];
                                                        }
                                                    }
                                                    if (bestLen > 0.5) axisPts = bestSeg;
                                                }
                                            }
                                        }
                                    }
                                } else if (prof && prof.type === 'IFCCIRCLEPROFILEDEF') {
                                    const rad = (prof.args && prof.args.length > 2) ? prof.args[2] : 0.5;
                                    length = rad * 2.0;
                                    thickness = rad * 2.0;
                                }
                            }
                        } else if (itemEnt.type === 'IFCFACETEDBREP' || itemEnt.type === 'IFCSHELLBASEDSURFACEMODEL') {
                            const ptsFound = this._findAllCartesianPoints(itemRef);
                            if (ptsFound.length > 0) {
                                const pxs = ptsFound.map(p => p[0]);
                                const pys = ptsFound.map(p => p[1]);
                                const pzs = ptsFound.map(p => p[2]);
                                const dx = Math.max(...pxs) - Math.min(...pxs);
                                const dy = Math.max(...pys) - Math.min(...pys);
                                const dz = Math.max(...pzs) - Math.min(...pzs);
                                if (dx > 0 || dy > 0) {
                                    length = Math.max(dx, dy);
                                    thickness = Math.min(dx, dy) > 0 ? Math.min(dx, dy) : thickness;
                                }
                                if (dz > 0) height = dz;
                            }
                        }
                    }
                }
            }
            return [axisPts, length, thickness, height];
        }

        _extractWalls() {
            const wallEids = [
                ...(this.entitiesByType['IFCWALLSTANDARDCASE'] || []),
                ...(this.entitiesByType['IFCWALL'] || []),
                ...(this.entitiesByType['IFCWALLELEMENTEDCASE'] || []),
                ...(this.entitiesByType['IFCCURTAINWALL'] || [])
            ];

            for (const eid of wallEids) {
                const ent = this.entities[eid];
                if (!ent) continue;

                // استبعاد الجدران الحاضنة المفككة لعناصر فرعية IFCWALLELEMENTEDCASE لمنع التكرار والتداخل
                if (this.decomposedParents && this.decomposedParents.has(eid) && (ent.type === 'IFCWALLELEMENTEDCASE' || ent.type === 'IFCCURTAINWALL')) {
                    continue;
                }

                const args = ent.args || [];
                const wId = `wall_${eid}`;
                const wName = (args.length > 2 && args[2]) ? String(args[2]) : `Wall_${eid}`;

                let storeyId = this.containment[eid];
                if (!storeyId || !this.storeys[storeyId]) {
                    storeyId = Object.keys(this.storeys)[0];
                }
                const storeyElev = this.storeys[storeyId] ? this.storeys[storeyId].elevation : 0.0;

                const placementRef = args.length > 5 ? args[5] : null;
                const [px, py, pz, rot] = this._resolvePlacement(placementRef);

                const shapeRef = args.length > 6 ? args[6] : null;
                const [axisPts, length, thickness, height] = this._resolveWallGeometry(shapeRef);

                let sx = 0.0, sz = 0.0, ex = 0.0, ez = 0.0;

                if (axisPts) {
                    const p1 = axisPts[0], p2 = axisPts[1];
                    const cosR = Math.cos(rot), sinR = Math.sin(rot);
                    sx = (px + (p1[0] * cosR - p1[1] * sinR)) * this.scale;
                    sz = (py + (p1[0] * sinR + p1[1] * cosR)) * this.scale;
                    ex = (px + (p2[0] * cosR - p2[1] * sinR)) * this.scale;
                    ez = (py + (p2[0] * sinR + p2[1] * cosR)) * this.scale;
                } else if (length > 0) {
                    const cosR = Math.cos(rot), sinR = Math.sin(rot);
                    sx = px * this.scale;
                    sz = py * this.scale;
                    ex = (px + (length * cosR)) * this.scale;
                    ez = (py + (length * sinR)) * this.scale;
                } else {
                    continue;
                }

                const wallT = thickness > 0 ? Math.max(0.15, thickness * this.scale) : 0.25;
                const wallH = height > 0 ? Math.max(2.0, height * this.scale) : (this.storeys[storeyId] ? this.storeys[storeyId].height : 3.5);
                const baseY = Math.abs(pz * this.scale - storeyElev) < 0.2 ? storeyElev : (pz * this.scale);

                // فحص التكرار الشامل (Deduplication) مع معالجة تطابق IFCWALL و IFCWALLSTANDARDCASE
                let isDup = false;
                const currIfcType = ent.type;
                for (const existingW of Object.values(this.walls)) {
                    if (existingW.storey_id === storeyId) {
                        const sEx = existingW.start;
                        const eEx = existingW.end;
                        const dDirect = Math.hypot(sx - sEx[0], sz - sEx[1]) + Math.hypot(ex - eEx[0], ez - eEx[1]);
                        const dReverse = Math.hypot(sx - eEx[0], sz - eEx[1]) + Math.hypot(ex - sEx[0], ez - sEx[1]);
                        if (dDirect < 0.35 || dReverse < 0.35) {
                            const prevIfcType = existingW.ifc_type || '';
                            const isWallDup = (
                                (currIfcType.includes('WALL') && prevIfcType.includes('WALL') && !currIfcType.includes('CURTAIN') && !prevIfcType.includes('CURTAIN'))
                                || (currIfcType === prevIfcType)
                                || (currIfcType.includes('ELEMENTED') || prevIfcType.includes('ELEMENTED'))
                            );
                            if (isWallDup) {
                                isDup = true;
                                break;
                            }
                        }
                    }
                }
                if (isDup) continue;

                const isCurtain = ent.type === 'IFCCURTAINWALL';
                const isExt = ['ext', 'outer', 'exterior', 'خارجي'].some(k => wName.toLowerCase().includes(k)) || isCurtain;

                this.walls[wId] = {
                    id: wId,
                    name_ar: `${isCurtain ? 'واجهة زجاجية ستائرية' : 'جدار معماري'} (${wName})`,
                    name_en: wName,
                    start: [+sx.toFixed(2), +sz.toFixed(2)],
                    end: [+ex.toFixed(2), +ez.toFixed(2)],
                    thickness: +wallT.toFixed(2),
                    height: +wallH.toFixed(2),
                    base_elevation: +baseY.toFixed(2),
                    storey_id: storeyId,
                    type: isExt ? 'exterior' : 'interior',
                    is_curtain_wall: isCurtain,
                    ifc_type: ent.type
                };
            }
        }

        _resolveSlabGeometry(shapeRef) {
            let width = 0.0, depth = 0.0;
            let thickness = 0.25 / Math.max(1e-5, this.scale);
            let polygon = null;

            const ent = this._getEntity(shapeRef);
            if (!ent) return [width, depth, thickness, polygon];

            let reps = [];
            if (ent.type === 'IFCPRODUCTDEFINITIONSHAPE') {
                reps = (ent.args && Array.isArray(ent.args[2])) ? ent.args[2] : [];
            } else if (ent.type === 'IFCSHAPEREPRESENTATION') {
                reps = [shapeRef];
            }

            for (const rRef of reps) {
                const rEnt = this._getEntity(rRef);
                if (!rEnt || rEnt.type !== 'IFCSHAPEREPRESENTATION') continue;

                const items = (rEnt.args && Array.isArray(rEnt.args[3])) ? rEnt.args[3] : [];
                for (const itemRef of items) {
                    const itemEnt = this._getEntity(itemRef);
                    if (!itemEnt) continue;

                    if (itemEnt.type === 'IFCEXTRUDEDAREASOLID') {
                        const eargs = itemEnt.args || [];
                        const profRef = eargs.length > 0 ? eargs[0] : null;
                        const extDepth = (eargs.length > 3 && typeof eargs[3] === 'number') ? eargs[3] : 0.25;
                        thickness = extDepth;

                        if (profRef) {
                            const prof = this._getEntity(profRef);
                            if (prof) {
                                const ptype = prof.type;
                                const pargs = prof.args || [];
                                if (ptype === 'IFCRECTANGLEPROFILEDEF') {
                                    const xdim = (pargs.length > 3 && typeof pargs[3] === 'number') ? pargs[3] : 0.0;
                                    const ydim = (pargs.length > 4 && typeof pargs[4] === 'number') ? pargs[4] : 0.0;
                                    width = xdim;
                                    depth = ydim;
                                    const hx = xdim / 2.0, hy = ydim / 2.0;
                                    polygon = [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]];
                                } else if (ptype === 'IFCARBITRARYCLOSEDPROFILEDEF' || ptype === 'IFCARBITRARYPROFILEDEFWITHVOIDS') {
                                    const outerCurveRef = pargs.length > 2 ? pargs[2] : null;
                                    const outerEnt = this._getEntity(outerCurveRef);
                                    if (outerEnt && outerEnt.type === 'IFCPOLYLINE') {
                                        const ptRefs = (outerEnt.args && Array.isArray(outerEnt.args[0])) ? outerEnt.args[0] : [];
                                        const pts = ptRefs.map(pr => this._resolvePoint(pr));
                                        if (pts.length > 0) {
                                            polygon = pts.map(p => [p[0], p[1]]);
                                            const pxs = pts.map(p => p[0]);
                                            const pys = pts.map(p => p[1]);
                                            width = Math.max(...pxs) - Math.min(...pxs);
                                            depth = Math.max(...pys) - Math.min(...pys);
                                        }
                                    }
                                } else if (ptype === 'IFCCIRCLEPROFILEDEF') {
                                    const rad = (pargs.length > 2 && typeof pargs[2] === 'number') ? pargs[2] : 1.0;
                                    width = rad * 2.0;
                                    depth = rad * 2.0;
                                }
                            }
                        }
                    } else if (itemEnt.type === 'IFCFACETEDBREP' || itemEnt.type === 'IFCSHELLBASEDSURFACEMODEL' || itemEnt.type === 'IFCTRIANGULATEDFACESET') {
                        const ptsFound = this._findAllCartesianPoints(itemRef);
                        if (ptsFound.length > 0) {
                            const pxs = ptsFound.map(p => p[0]);
                            const pys = ptsFound.map(p => p[1]);
                            const pzs = ptsFound.map(p => p[2]);
                            const dx = Math.max(...pxs) - Math.min(...pxs);
                            const dy = Math.max(...pys) - Math.min(...pys);
                            const dz = Math.max(...pzs) - Math.min(...pzs);
                            const dims = [dx, dy, dz].sort((a, b) => a - b);
                            if (dims[2] > 0 && dims[1] > 0) {
                                thickness = dims[0] > 0 ? dims[0] : 0.25;
                                width = dims[2];
                                depth = dims[1];
                            }
                        }
                    }
                }
            }
            return [width, depth, thickness, polygon];
        }

        _extractSlabs() {
            const slabEids = [
                ...(this.entitiesByType['IFCSLAB'] || []),
                ...(this.entitiesByType['IFCROOF'] || [])
            ];

            // التحقق المسبق مما إذا كانت هناك بلاطات سقف صريحة (IFCSLAB of type ROOF)
            let hasExplicitRoofSlab = false;
            for (const eid of (this.entitiesByType['IFCSLAB'] || [])) {
                const ent = this.entities[eid];
                const args = ent ? ent.args || [] : [];
                const pType = (args.length > 8 && args[8]) ? String(args[8]) : "";
                const sName = (args.length > 2 && args[2]) ? String(args[2]).toLowerCase() : "";
                if (pType.toUpperCase().includes('ROOF') || sName.includes('roof') || sName.includes('سطح')) {
                    hasExplicitRoofSlab = true;
                    break;
                }
            }

            for (const eid of slabEids) {
                const ent = this.entities[eid];
                if (!ent) continue;

                // استبعاد حاوية السقف المفككة IFCROOF إذا كانت تحوي عناصر فرعية أو توجد بلاطات سقف صريحة
                if (ent.type === 'IFCROOF') {
                    if (this.decomposedParents && this.decomposedParents.has(eid)) continue;
                    if (hasExplicitRoofSlab) continue;
                }
                if (this.decomposedParents && this.decomposedParents.has(eid) && ent.type === 'IFCSLAB') {
                    continue;
                }

                const args = ent.args || [];
                const sId = `slab_${eid}`;
                const sName = (args.length > 2 && args[2]) ? String(args[2]) : `Slab_${eid}`;
                const pType = (args.length > 8 && args[8]) ? String(args[8]) : "FLOOR";

                let storeyId = this.containment[eid];
                if (!storeyId || !this.storeys[storeyId]) {
                    storeyId = Object.keys(this.storeys)[0];
                }
                const storeyElev = this.storeys[storeyId] ? this.storeys[storeyId].elevation : 0.0;

                const placementRef = args.length > 5 ? args[5] : null;
                const [px, py, pz, rot] = this._resolvePlacement(placementRef);

                const baseY = Math.abs(pz * this.scale - storeyElev) < 0.2 ? storeyElev : (pz * this.scale);
                const isRoof = pType.toUpperCase().includes('ROOF') || sName.toLowerCase().includes('roof') || ent.type === 'IFCROOF';
                const isBase = pType.toUpperCase().includes('BASESLAB') || sName.toLowerCase().includes('base') || sName.toLowerCase().includes('ground');

                const shapeRef = args.length > 6 ? args[6] : null;
                const [width, depth, thickness, polygon] = this._resolveSlabGeometry(shapeRef);

                if (width <= 0 || depth <= 0) continue;

                const sw = +(width * this.scale).toFixed(2);
                const sd = +(depth * this.scale).toFixed(2);
                const st = thickness > 0 ? +(thickness * this.scale).toFixed(2) : 0.25;

                // فحص ما إذا كانت البلاطة تمثل موقعاً عاماً أو قطعة أرض شاسعة (Site / Terrain footprint)
                const isSite = ['site', 'terrain', 'lot', 'plot', 'earth', 'land', 'property', 'موقع', 'ارض', 'أرض', 'محيط'].some(k => sName.toLowerCase().includes(k)) || (sw > 100 && sd > 100);

                let polyWorld = null;
                if (polygon) {
                    const cosR = Math.cos(rot), sinR = Math.sin(rot);
                    polyWorld = [];
                    for (const pt of polygon) {
                        const wx = (px + (pt[0] * cosR - pt[1] * sinR)) * this.scale;
                        const wz = (py + (pt[0] * sinR + pt[1] * cosR)) * this.scale;
                        polyWorld.push([+wx.toFixed(2), +wz.toFixed(2)]);
                    }
                }

                const slabDict = {
                    id: sId,
                    name_ar: isSite ? `موقع عام / أرضية (${sName})` : `بلاطة (${isRoof ? 'السطح' : (isBase ? 'الأساسات' : 'الطابق')})`,
                    name_en: sName,
                    type: isSite ? 'site' : (isRoof ? 'roof' : (isBase ? 'foundation' : 'floor')),
                    is_site: isSite,
                    base_elevation: +baseY.toFixed(2),
                    thickness: Math.max(0.15, Math.min(0.6, st)),
                    storey_id: storeyId,
                    bounds: {
                        x: +(px * this.scale - sw / 2.0).toFixed(2),
                        z: +(py * this.scale - sd / 2.0).toFixed(2),
                        width: sw,
                        depth: sd
                    }
                };
                if (polyWorld && polyWorld.length >= 3) {
                    slabDict.polygon = polyWorld;
                }

                this.slabs[sId] = slabDict;
            }
        }

        _extractColumns() {
            const colEids = [
                ...(this.entitiesByType['IFCCOLUMN'] || []),
                ...(this.entitiesByType['IFCCOLUMNSTANDARDCASE'] || [])
            ];

            for (const eid of colEids) {
                const ent = this.entities[eid];
                const args = ent.args || [];
                const cId = `col_${eid}`;
                const cName = (args.length > 2 && args[2]) ? String(args[2]) : `Col_${eid}`;

                let storeyId = this.containment[eid];
                if (!storeyId || !this.storeys[storeyId]) {
                    storeyId = Object.keys(this.storeys)[0];
                }
                const storeyElev = this.storeys[storeyId] ? this.storeys[storeyId].elevation : 0.0;

                const placementRef = args.length > 5 ? args[5] : null;
                const [px, py, pz] = this._resolvePlacement(placementRef);

                const shapeRef = args.length > 6 ? args[6] : null;
                let cw = 0.45, cd = 0.45;
                if (shapeRef) {
                    const [, length, thickness] = this._resolveWallGeometry(shapeRef);
                    if (length > 0 && thickness > 0) {
                        cw = +(Math.min(length, thickness) * this.scale).toFixed(2);
                        cd = +(Math.max(length, thickness) * this.scale).toFixed(2);
                    }
                }

                const baseY = Math.abs(pz * this.scale - storeyElev) < 0.2 ? storeyElev : (pz * this.scale);
                this.columns[cId] = {
                    id: cId,
                    name_ar: `عمود إنشائي (${cName})`,
                    name_en: cName,
                    position: [+(px * this.scale).toFixed(2), +(py * this.scale).toFixed(2)],
                    base_elevation: +baseY.toFixed(2),
                    width: Math.max(0.2, cw),
                    depth: Math.max(0.2, cd),
                    height: this.storeys[storeyId] ? this.storeys[storeyId].height : 3.5,
                    storey_id: storeyId
                };
            }
        }

        _extractBeams() {
            const beamEids = [
                ...(this.entitiesByType['IFCBEAM'] || []),
                ...(this.entitiesByType['IFCBEAMSTANDARDCASE'] || [])
            ];

            for (const eid of beamEids) {
                const ent = this.entities[eid];
                const args = ent.args || [];
                const bId = `beam_${eid}`;
                const bName = (args.length > 2 && args[2]) ? String(args[2]) : `Beam_${eid}`;

                let storeyId = this.containment[eid];
                if (!storeyId || !this.storeys[storeyId]) {
                    storeyId = Object.keys(this.storeys)[0];
                }
                const storeyElev = this.storeys[storeyId] ? this.storeys[storeyId].elevation : 0.0;

                const placementRef = args.length > 5 ? args[5] : null;
                const [px, py, pz, rot] = this._resolvePlacement(placementRef);

                const shapeRef = args.length > 6 ? args[6] : null;
                const [axisPts, length] = this._resolveWallGeometry(shapeRef);

                let sx = 0.0, sz = 0.0, ex = 0.0, ez = 0.0;
                if (axisPts) {
                    const p1 = axisPts[0], p2 = axisPts[1];
                    const cosR = Math.cos(rot), sinR = Math.sin(rot);
                    sx = (px + (p1[0] * cosR - p1[1] * sinR)) * this.scale;
                    sz = (py + (p1[0] * sinR + p1[1] * cosR)) * this.scale;
                    ex = (px + (p2[0] * cosR - p2[1] * sinR)) * this.scale;
                    ez = (py + (p2[0] * sinR + p2[1] * cosR)) * this.scale;
                } else if (length > 0) {
                    const cosR = Math.cos(rot), sinR = Math.sin(rot);
                    sx = px * this.scale;
                    sz = py * this.scale;
                    ex = (px + (length * cosR)) * this.scale;
                    ez = (py + (length * sinR)) * this.scale;
                } else {
                    sx = px * this.scale;
                    sz = py * this.scale;
                    ex = sx + 5.0;
                    ez = sz;
                }

                const beamElev = Math.abs(pz * this.scale - storeyElev) > 0.2
                    ? (pz * this.scale)
                    : storeyElev + (this.storeys[storeyId] ? this.storeys[storeyId].height : 3.5) - 0.5;

                this.beams[bId] = {
                    id: bId,
                    name_ar: `جسر إنشائي (${bName})`,
                    name_en: bName,
                    start: [+sx.toFixed(2), +sz.toFixed(2)],
                    end: [+ex.toFixed(2), +ez.toFixed(2)],
                    width: 0.35,
                    depth: 0.60,
                    elevation: +beamElev.toFixed(2),
                    storey_id: storeyId
                };
            }
        }

        _extractOpenings() {
            // الأبواب
            const doorEids = [
                ...(this.entitiesByType['IFCDOOR'] || []),
                ...(this.entitiesByType['IFCDOORSTANDARDCASE'] || [])
            ];

            for (const eid of doorEids) {
                const ent = this.entities[eid];
                const args = ent.args || [];
                const dId = `door_${eid}`;
                const dName = (args.length > 2 && args[2]) ? String(args[2]) : `Door_${eid}`;

                let overallH = 2200.0, overallW = 900.0;
                if (args.length > 9 && typeof args[8] === 'number' && typeof args[9] === 'number') {
                    overallH = args[8];
                    overallW = args[9];
                } else if (args.length > 10 && typeof args[9] === 'number' && typeof args[10] === 'number') {
                    overallH = args[9];
                    overallW = args[10];
                } else if (args.length > 8 && typeof args[8] === 'number') {
                    overallH = args[8];
                }

                const placementRef = args.length > 5 ? args[5] : null;
                const [px, py] = this._resolvePlacement(placementRef);

                let wallEid = this.elementToWall[eid] || this.relVoids[eid];
                let wallId = (wallEid && this.walls[`wall_${wallEid}`]) ? `wall_${wallEid}` : null;

                if (!wallId) {
                    const targetWall = this._findClosestWall(px * this.scale, py * this.scale);
                    wallId = targetWall ? targetWall.id : null;
                }

                let posX = +(px * this.scale).toFixed(2);
                let posZ = +(py * this.scale).toFixed(2);
                if (Math.abs(posX) < 0.01 && Math.abs(posZ) < 0.01 && wallId && this.walls[wallId]) {
                    const hw = this.walls[wallId];
                    posX = +((hw.start[0] + hw.end[0]) / 2.0).toFixed(2);
                    posZ = +((hw.start[1] + hw.end[1]) / 2.0).toFixed(2);
                }

                this.openings[dId] = {
                    id: dId,
                    name_ar: `باب (${dName})`,
                    name_en: dName,
                    type: 'door',
                    wall_id: wallId,
                    position: [posX, posZ],
                    width: +Math.max(0.8, overallW * this.scale).toFixed(2),
                    height: +Math.max(2.0, overallH * this.scale).toFixed(2)
                };
            }

            // النوافذ
            const winEids = [
                ...(this.entitiesByType['IFCWINDOW'] || []),
                ...(this.entitiesByType['IFCWINDOWSTANDARDCASE'] || [])
            ];

            for (const eid of winEids) {
                const ent = this.entities[eid];
                const args = ent.args || [];
                const wId = `win_${eid}`;
                const wName = (args.length > 2 && args[2]) ? String(args[2]) : `Win_${eid}`;

                let overallH = 1500.0, overallW = 1200.0;
                if (args.length > 9 && typeof args[8] === 'number' && typeof args[9] === 'number') {
                    overallH = args[8];
                    overallW = args[9];
                } else if (args.length > 10 && typeof args[9] === 'number' && typeof args[10] === 'number') {
                    overallH = args[9];
                    overallW = args[10];
                } else if (args.length > 8 && typeof args[8] === 'number') {
                    overallH = args[8];
                }

                const placementRef = args.length > 5 ? args[5] : null;
                const [px, py] = this._resolvePlacement(placementRef);

                let wallEid = this.elementToWall[eid] || this.relVoids[eid];
                let wallId = (wallEid && this.walls[`wall_${wallEid}`]) ? `wall_${wallEid}` : null;

                if (!wallId) {
                    const targetWall = this._findClosestWall(px * this.scale, py * this.scale);
                    wallId = targetWall ? targetWall.id : null;
                }

                let posX = +(px * this.scale).toFixed(2);
                let posZ = +(py * this.scale).toFixed(2);
                if (Math.abs(posX) < 0.01 && Math.abs(posZ) < 0.01 && wallId && this.walls[wallId]) {
                    const hw = this.walls[wallId];
                    posX = +((hw.start[0] + hw.end[0]) / 2.0).toFixed(2);
                    posZ = +((hw.start[1] + hw.end[1]) / 2.0).toFixed(2);
                }

                this.openings[wId] = {
                    id: wId,
                    name_ar: `نافذة (${wName})`,
                    name_en: wName,
                    type: 'window',
                    wall_id: wallId,
                    position: [posX, posZ],
                    width: +Math.max(0.9, overallW * this.scale).toFixed(2),
                    height: +Math.max(1.0, overallH * this.scale).toFixed(2),
                    sill_height: 0.9
                };
            }
        }

        _findClosestWall(x, z, maxDist = 5.0) {
            let bestW = null;
            let bestD = Infinity;

            for (const w of Object.values(this.walls)) {
                const s = w.start, e = w.end;
                const dx = e[0] - s[0], dz = e[1] - s[1];
                const l2 = dx * dx + dz * dz;
                let dist = 0.0;
                if (l2 === 0) {
                    dist = Math.hypot(x - s[0], z - s[1]);
                } else {
                    const t = Math.max(0.0, Math.min(1.0, ((x - s[0]) * dx + (z - s[1]) * dz) / l2));
                    const px = s[0] + t * dx;
                    const pz = s[1] + t * dz;
                    dist = Math.hypot(x - px, z - pz);
                }
                if (dist < bestD) {
                    bestD = dist;
                    bestW = w;
                }
            }
            return bestD <= maxDist ? bestW : null;
        }

        _extractStairs() {
            const stairEids = [
                ...(this.entitiesByType['IFCSTAIR'] || []),
                ...(this.entitiesByType['IFCSTAIRFLIGHT'] || [])
            ];

            for (const eid of stairEids) {
                const ent = this.entities[eid];
                const args = ent.args || [];
                const sId = `stair_${eid}`;
                const sName = (args.length > 2 && args[2]) ? String(args[2]) : `Stair_${eid}`;

                const placementRef = args.length > 5 ? args[5] : null;
                const [px, py, , rot] = this._resolvePlacement(placementRef);

                this.stairs[sId] = {
                    id: sId,
                    name_ar: `سلم معماري (${sName})`,
                    name_en: sName,
                    position: [+(px * this.scale).toFixed(2), +(py * this.scale).toFixed(2)],
                    width: 2.4,
                    depth: 4.8,
                    height: 3.5,
                    num_steps: 18,
                    rotation: +(rot * (180 / Math.PI)).toFixed(1),
                    landing_pos: [+(px * this.scale).toFixed(2), +((py * this.scale) + 2.4).toFixed(2)],
                    connects_storeys: Object.keys(this.storeys).slice(0, 2)
                };
            }
        }

        _extractSpaces() {
            const spaceEids = this.entitiesByType['IFCSPACE'] || [];
            const foundSpaces = [];

            for (const eid of spaceEids) {
                const ent = this.entities[eid];
                const args = ent.args || [];
                const guid = (args.length > 0 && args[0]) ? String(args[0]) : `sp_${eid}`;
                const name = (args.length > 2 && args[2]) ? String(args[2]) : `Space_${eid}`;
                const desc = (args.length > 3 && args[3]) ? String(args[3]) : "";
                foundSpaces.push({ guid, name, desc, eid });
            }

            if (foundSpaces.length > 0) {
                for (let idx = 0; idx < foundSpaces.length; idx++) {
                    const item = foundSpaces[idx];
                    const sId = `ifc_sp_${idx + 1}`;

                    let storeyId = this.containment[item.eid];
                    if (!storeyId || !this.storeys[storeyId]) {
                        storeyId = Object.keys(this.storeys)[0];
                    }
                    const elev = this.storeys[storeyId] ? this.storeys[storeyId].elevation : 0.0;

                    const displayName = (/^\d+$/.test(item.name) && item.desc) ? `${item.desc} (${item.name})` : item.name;
                    const nl = displayName.toLowerCase();

                    let stype = 'workspace';
                    let w = 14.0, d = 10.0, a = 80.0;

                    if (['corridor', 'hallway', 'ممر', 'circulation'].some(k => nl.includes(k))) {
                        stype = 'circulation';
                        w = 30.0; d = 3.5; a = 75.0;
                    } else if (['waiting', 'انتظار', 'reception', 'lobby', 'استقبال'].some(k => nl.includes(k))) {
                        stype = 'public';
                        w = 12.0; d = 9.0; a = 60.0;
                    } else if (['meeting', 'conference', 'اجتماع', 'مرن'].some(k => nl.includes(k))) {
                        stype = 'flexible';
                        w = 11.0; d = 9.0; a = 55.0;
                    } else if (['lounge', 'break', 'استراحة', 'خدمات'].some(k => nl.includes(k))) {
                        stype = 'amenity';
                        w = 10.0; d = 8.0; a = 45.0;
                    }

                    if (idx < this.extractedAreas.length && this.extractedAreas[idx] > 5) {
                        a = this.extractedAreas[idx];
                    }

                    const ent = this.entities[item.eid];
                    const placementRef = (ent && ent.args && ent.args.length > 5) ? ent.args[5] : null;
                    const [spX, spY] = this._resolvePlacement(placementRef);

                    let px = 0.0, pz = 0.0;
                    const hasPlacement = (Math.abs(spX) > 0.01 || Math.abs(spY) > 0.01);
                    if (hasPlacement) {
                        px = +((spX * this.scale) - (w / 2.0)).toFixed(2);
                        pz = +((spY * this.scale) - (d / 2.0)).toFixed(2);
                    } else {
                        const hasRealArch = (Object.keys(this.walls).length > 0 || Object.keys(this.slabs).length > 0);
                        if (hasRealArch) {
                            px = 0.0;
                            pz = 0.0;
                        } else {
                            const cols = 2;
                            const row = Math.floor(idx / cols);
                            const col = idx % cols;
                            px = -15.0 + col * 16.0;
                            pz = -12.0 + row * 14.0;
                        }
                    }

                    this.spaces[sId] = {
                        id: sId,
                        name_ar: displayName,
                        name_en: item.name,
                        type: stype,
                        capacity: Math.max(2, Math.floor(a / 3.2)),
                        area_m2: +a.toFixed(1),
                        bounds: {
                            x: px,
                            z: pz,
                            width: w,
                            depth: d,
                            height: this.storeys[storeyId] ? this.storeys[storeyId].height : 3.5
                        },
                        base_elevation: elev,
                        storey_id: storeyId,
                        is_fallback: !hasPlacement,
                        color: stype === "public" ? "#00b894" : (stype === "workspace" ? "#0984e3" : "#7ed321")
                    };
                }
            }
        }

        _buildModelDict() {
            // إذا لم يتم استخراج جدران ولكن توجد فضاءات، نولد غلافاً معمارياً متوافقاً
            if (Object.keys(this.walls).length === 0 && Object.keys(this.spaces).length > 0) {
                const [genWalls, genOpenings] = IFCStepParser.generateArchitecturalEnvelope(this.spaces);
                this.walls = genWalls;
                if (Object.keys(this.openings).length === 0) {
                    this.openings = genOpenings;
                }
            }

            const edges = [];
            const spaceKeys = Object.keys(this.spaces);
            for (let i = 0; i < spaceKeys.length - 1; i++) {
                edges.push({
                    u: spaceKeys[i],
                    v: spaceKeys[i + 1],
                    distance: 5.0,
                    width: 2.2,
                    status: "active"
                });
            }

            return {
                id: "imported_ifc_bim",
                name_ar: `نموذج BIM مستورد: ${this.buildingName}`,
                name_en: `BIM Model: ${this.projectName}`,
                building_type: "imported_bim",
                storeys: this.storeys,
                slabs: this.slabs,
                columns: this.columns,
                beams: this.beams,
                walls: this.walls,
                openings: this.openings,
                stairs: this.stairs,
                spaces: this.spaces,
                partitions: {},
                edges: edges
            };
        }

        static centerModelDict(model) {
            const xs = [];
            const zs = [];

            const walls = model.walls || {};
            for (const w of Object.values(walls)) {
                if (w.start && w.start.length >= 2) {
                    xs.push(w.start[0]);
                    zs.push(w.start[1]);
                }
                if (w.end && w.end.length >= 2) {
                    xs.push(w.end[0]);
                    zs.push(w.end[1]);
                }
            }

            const slabs = model.slabs || {};
            for (const s of Object.values(slabs)) {
                if (s.bounds) {
                    const bx = s.bounds.x || 0;
                    const bz = s.bounds.z || 0;
                    const bw = s.bounds.width || 0;
                    const bd = s.bounds.depth || 0;
                    xs.push(bx, bx + bw);
                    zs.push(bz, bz + bd);
                }
                if (s.polygon && Array.isArray(s.polygon)) {
                    for (const pt of s.polygon) {
                        if (pt && pt.length >= 2) {
                            xs.push(pt[0]);
                            zs.push(pt[1]);
                        }
                    }
                }
            }

            const columns = model.columns || {};
            for (const c of Object.values(columns)) {
                if (c.position && c.position.length >= 2) {
                    xs.push(c.position[0]);
                    zs.push(c.position[1]);
                }
            }

            const beams = model.beams || {};
            for (const b of Object.values(beams)) {
                if (b.start && b.start.length >= 2) {
                    xs.push(b.start[0]);
                    zs.push(b.start[1]);
                }
                if (b.end && b.end.length >= 2) {
                    xs.push(b.end[0]);
                    zs.push(b.end[1]);
                }
            }

            const stairs = model.stairs || {};
            for (const st of Object.values(stairs)) {
                if (st.position && st.position.length >= 2) {
                    xs.push(st.position[0]);
                    zs.push(st.position[1]);
                }
                if (st.landing_pos && st.landing_pos.length >= 2) {
                    xs.push(st.landing_pos[0]);
                    zs.push(st.landing_pos[1]);
                }
            }

            const spaces = model.spaces || {};
            const hasRealArch = (Object.keys(walls).length > 0 || Object.keys(slabs).length > 0 || Object.keys(columns).length > 0);
            for (const sp of Object.values(spaces)) {
                // استبعاد الفضاءات الافتراضية غير محددة الموضع عند حساب مركز المبنى الحقيقي
                if (hasRealArch && sp.is_fallback) continue;

                if (sp.bounds) {
                    const bx = sp.bounds.x || 0;
                    const bz = sp.bounds.z || 0;
                    const bw = sp.bounds.width || 0;
                    const bd = sp.bounds.depth || 0;
                    xs.push(bx, bx + bw);
                    zs.push(bz, bz + bd);
                }
                if (sp.polygon && Array.isArray(sp.polygon)) {
                    for (const pt of sp.polygon) {
                        if (pt && pt.length >= 2) {
                            xs.push(pt[0]);
                            zs.push(pt[1]);
                        }
                    }
                }
            }

            if (xs.length === 0 || zs.length === 0) return model;

            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minZ = Math.min(...zs);
            const maxZ = Math.max(...zs);

            const cx = +((minX + maxX) / 2.0).toFixed(3);
            const cz = +((minZ + maxZ) / 2.0).toFixed(3);

            if (Math.abs(cx) < 0.01 && Math.abs(cz) < 0.01) return model;

            // إزاحة الجدران
            for (const w of Object.values(walls)) {
                if (w.start && w.start.length >= 2) {
                    w.start = [+(w.start[0] - cx).toFixed(2), +(w.start[1] - cz).toFixed(2)];
                }
                if (w.end && w.end.length >= 2) {
                    w.end = [+(w.end[0] - cx).toFixed(2), +(w.end[1] - cz).toFixed(2)];
                }
            }

            // إزاحة البلاطات
            for (const s of Object.values(slabs)) {
                if (s.bounds) {
                    s.bounds.x = +(s.bounds.x - cx).toFixed(2);
                    s.bounds.z = +(s.bounds.z - cz).toFixed(2);
                }
                if (s.polygon && Array.isArray(s.polygon)) {
                    s.polygon = s.polygon.map(pt => [+(pt[0] - cx).toFixed(2), +(pt[1] - cz).toFixed(2)]);
                }
            }

            // إزاحة الأعمدة
            for (const c of Object.values(columns)) {
                if (c.position && c.position.length >= 2) {
                    c.position = [+(c.position[0] - cx).toFixed(2), +(c.position[1] - cz).toFixed(2)];
                }
            }

            // إزاحة الجسور
            for (const b of Object.values(beams)) {
                if (b.start && b.start.length >= 2) {
                    b.start = [+(b.start[0] - cx).toFixed(2), +(b.start[1] - cz).toFixed(2)];
                }
                if (b.end && b.end.length >= 2) {
                    b.end = [+(b.end[0] - cx).toFixed(2), +(b.end[1] - cz).toFixed(2)];
                }
            }

            // إزاحة السلالم
            for (const st of Object.values(stairs)) {
                if (st.position && st.position.length >= 2) {
                    st.position = [+(st.position[0] - cx).toFixed(2), +(st.position[1] - cz).toFixed(2)];
                }
                if (st.landing_pos && st.landing_pos.length >= 2) {
                    st.landing_pos = [+(st.landing_pos[0] - cx).toFixed(2), +(st.landing_pos[1] - cz).toFixed(2)];
                }
            }

            // إزاحة الفتحات
            const openings = model.openings || {};
            for (const op of Object.values(openings)) {
                if (op.position && op.position.length >= 2) {
                    op.position = [+(op.position[0] - cx).toFixed(2), +(op.position[1] - cz).toFixed(2)];
                }
            }

            // إزاحة الفضاءات
            for (const sp of Object.values(spaces)) {
                if (sp.bounds) {
                    sp.bounds.x = +(sp.bounds.x - cx).toFixed(2);
                    sp.bounds.z = +(sp.bounds.z - cz).toFixed(2);
                }
                if (sp.centroid && sp.centroid.length >= 2) {
                    sp.centroid = [+(sp.centroid[0] - cx).toFixed(2), +(sp.centroid[1] - cz).toFixed(2)];
                }
                if (sp.polygon && Array.isArray(sp.polygon)) {
                    sp.polygon = sp.polygon.map(pt => [+(pt[0] - cx).toFixed(2), +(pt[1] - cz).toFixed(2)]);
                }
            }

            // إزاحة القواطع
            const partitions = model.partitions || {};
            for (const p of Object.values(partitions)) {
                if (p.position) {
                    if ('x' in p.position) p.position.x = +(p.position.x - cx).toFixed(2);
                    if ('z' in p.position) p.position.z = +(p.position.z - cz).toFixed(2);
                }
            }

            return model;
        }

        static generateArchitecturalEnvelope(spaces, partitions = {}) {
            const walls = {};
            const openings = {};

            for (const [sid, s] of Object.entries(spaces)) {
                const b = s.bounds || { x: 0, z: 0, width: 10, depth: 8 };
                const bx = b.x || 0;
                const bz = b.z || 0;
                const bw = b.width || 10;
                const bd = b.depth || 8;

                const wn = `w_${sid}_n`;
                const ws = `w_${sid}_s`;
                const ww = `w_${sid}_w`;
                const we = `w_${sid}_e`;

                walls[wn] = { id: wn, name_ar: `جدار شمالي (${s.name_ar || sid})`, start: [+(bx).toFixed(1), +(bz).toFixed(1)], end: [+(bx + bw).toFixed(1), +(bz).toFixed(1)], thickness: 0.25, height: 3.0, type: "exterior" };
                walls[ws] = { id: ws, name_ar: `جدار جنوبي (${s.name_ar || sid})`, start: [+(bx).toFixed(1), +(bz + bd).toFixed(1)], end: [+(bx + bw).toFixed(1), +(bz + bd).toFixed(1)], thickness: 0.25, height: 3.0, type: "interior" };
                walls[ww] = { id: ww, name_ar: `جدار غربي (${s.name_ar || sid})`, start: [+(bx).toFixed(1), +(bz).toFixed(1)], end: [+(bx).toFixed(1), +(bz + bd).toFixed(1)], thickness: 0.25, height: 3.0, type: "interior" };
                walls[we] = { id: we, name_ar: `جدار شرقي (${s.name_ar || sid})`, start: [+(bx + bw).toFixed(1), +(bz).toFixed(1)], end: [+(bx + bw).toFixed(1), +(bz + bd).toFixed(1)], thickness: 0.25, height: 3.0, type: "interior" };

                // فتحة باب في الجدار الجنوبي
                const dId = `door_${sid}`;
                openings[dId] = {
                    id: dId,
                    name_ar: `باب (${s.name_ar || sid})`,
                    type: "door",
                    wall_id: ws,
                    position: [+(bx + (bw * 0.5)).toFixed(1), +(bz + bd).toFixed(1)],
                    width: 1.2,
                    height: 2.2,
                    connects: [sid, "circulation"],
                    flow_capacity_per_min: 40
                };

                // فتحة نافذة زجاجية في الجدار الشمالي
                const winId = `win_${sid}`;
                openings[winId] = {
                    id: winId,
                    name_ar: `نافذة (${s.name_ar || sid})`,
                    type: "window",
                    wall_id: wn,
                    position: [+(bx + (bw * 0.5)).toFixed(1), +(bz).toFixed(1)],
                    width: Math.max(1.5, +(bw * 0.4).toFixed(1)),
                    height: 1.5,
                    sill_height: 0.9
                };
            }

            return [walls, openings];
        }

        static parseDXF(dxfContent) {
            const lines = dxfContent.split(/\r?\n/).map(l => l.trim());
            const polylines = [];
            let i = 0;
            let inEntities = false;

            while (i < lines.length) {
                const code = lines[i];
                const val = i + 1 < lines.length ? lines[i + 1] : "";

                if (code === "2" && val === "ENTITIES") {
                    inEntities = true;
                    i += 2;
                    continue;
                }
                if (code === "0" && val === "ENDSEC" && inEntities) {
                    break;
                }

                if (inEntities) {
                    if (code === "0" && val === "LWPOLYLINE") {
                        i += 2;
                        const verts = [];
                        let layer = "default";
                        while (i < lines.length && lines[i] !== "0") {
                            if (lines[i] === "8") {
                                layer = lines[i + 1];
                                i += 2;
                            } else if (lines[i] === "10") {
                                const vx = parseFloat(lines[i + 1]);
                                const vy = (i + 3 < lines.length && lines[i + 2] === "20") ? parseFloat(lines[i + 3]) : 0.0;
                                verts.push([vx, vy]);
                                i += 4;
                            } else {
                                i += 2;
                            }
                        }
                        if (verts.length >= 3) {
                            polylines.push({ layer, verts });
                        }
                        continue;
                    }
                }
                i += 2;
            }

            const spaces = {};
            for (let idx = 0; idx < polylines.length; idx++) {
                const p = polylines[idx];
                const xs = p.verts.map(v => v[0]);
                const ys = p.verts.map(v => v[1]);
                const minX = Math.min(...xs), maxX = Math.max(...xs);
                const minY = Math.min(...ys), maxY = Math.max(...ys);
                const w = maxX - minX;
                const d = maxY - minY;
                const area = w * d;
                const sId = `dxf_sp_${idx + 1}`;

                spaces[sId] = {
                    id: sId,
                    name_ar: `فضاء CAD (${p.layer})`,
                    name_en: `CAD Space ${idx + 1}`,
                    type: "workspace",
                    capacity: Math.max(2, Math.floor(area / 3.0)),
                    area_m2: +area.toFixed(1),
                    bounds: { x: +minX.toFixed(1), z: +minY.toFixed(1), width: +w.toFixed(1), depth: +d.toFixed(1), height: 3.5 },
                    color: "#0984e3"
                };
            }

            if (Object.keys(spaces).length === 0) {
                spaces['dxf_sp_1'] = {
                    id: 'dxf_sp_1',
                    name_ar: 'فضاء مخطط DXF مستورد',
                    name_en: 'Imported DXF Space',
                    type: 'public',
                    capacity: 25,
                    area_m2: 80,
                    bounds: { x: -10, z: -8, width: 20, depth: 16, height: 3.5 },
                    color: '#00b894'
                };
            }

            const [walls, openings] = IFCStepParser.generateArchitecturalEnvelope(spaces);
            const model = {
                id: "imported_dxf_cad",
                name_ar: "مخطط AutoCAD DXF مستورد",
                name_en: "Imported AutoCAD DXF Plan",
                building_type: "imported_dxf",
                spaces,
                walls,
                openings,
                partitions: {},
                edges: []
            };
            return IFCStepParser.centerModelDict(model);
        }
    }

    window.IFCStepParser = IFCStepParser;
})(typeof window !== 'undefined' ? window : globalThis);
