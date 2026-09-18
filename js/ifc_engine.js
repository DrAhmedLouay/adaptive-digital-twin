// js/ifc_engine.js
/**
 * Adaptive Spatial Twin — Professional BIM IFC 3D WebAssembly Engine
 * Powered by web-ifc (buildingSMART / That Open Company)
 * 
 * Capable of parsing real-world complex IFC models (IFC2X3, IFC4, IFC4X3)
 * from Autodesk Revit, Graphisoft ArchiCAD, BlenderBIM, Vectorworks, Tekla, etc.
 * Generates true 3D Solid Breps, Extrusions, CSG Clippings, Multi-Storey Hierarchies,
 * and Materials directly in Three.js at native C++/WASM performance.
 */

(function(window) {
    'use strict';

    class BIMIFCEngine {
        constructor() {
            this.ifcApi = null;
            this.isInitialized = false;
            this.initPromise = null;
            this.wasmLocalPath = 'js/libs/web-ifc/';
            this.wasmCdnPath = 'https://cdn.jsdelivr.net/npm/web-ifc@0.0.58/';
            
            // قاموس تصنيف الفئات المعمارية والإنشائية
            this.categoryMap = {
                // الجدران والواجهات
                'IFCWALL': 'walls',
                'IFCWALLSTANDARDCASE': 'walls',
                'IFCWALLELEMENTEDCASE': 'walls',
                'IFCCURTAINWALL': 'walls',
                'IFCPLATE': 'walls',
                
                // البلاطات والأسقف والأساسات
                'IFCSLAB': 'slabs_floor',
                'IFCFOOTING': 'slabs_floor',
                'IFCROOF': 'slabs_roof',
                'IFCSITE': 'slabs_site',
                'IFCGEOMETRICCURVESET': 'slabs_site',

                // الأعمدة الإنشائية
                'IFCCOLUMN': 'columns',
                'IFCCOLUMNSTANDARDCASE': 'columns',

                // الجسور والكمرات
                'IFCBEAM': 'beams',
                'IFCBEAMSTANDARDCASE': 'beams',
                'IFCMEMBER': 'beams',

                // الأبواب والفتحات
                'IFCDOOR': 'doors',
                'IFCDOORSTANDARDCASE': 'doors',

                // النوافذ والفتحات الزجاجية
                'IFCWINDOW': 'windows',
                'IFCWINDOWSTANDARDCASE': 'windows',

                // الأدراج والسلالم والممرات المائلة
                'IFCSTAIR': 'stairs',
                'IFCSTAIRFLIGHT': 'stairs',
                'IFCRAMP': 'stairs',
                'IFCRAMPFLIGHT': 'stairs',
                'IFCRAILING': 'stairs',

                // الفضاءات والمناطق الوظيفية
                'IFCSPACE': 'spaces',

                // الفرش والتجهيزات المعمارية
                'IFCFURNISHINGELEMENT': 'furniture',
                'IFCBUILDINGELEMENTPROXY': 'other',
                'IFCFLOWTERMINAL': 'other',
                'IFCDUCTSEGMENT': 'other',
                'IFCPIPESEGMENT': 'other'
            };

            // خامات وألوان المواد المعمارية الافتراضية
            this.materialPalette = {
                walls: {
                    color: 0x94a3b8,
                    roughness: 0.65,
                    metalness: 0.1,
                    edgeColor: 0x38bdf8,
                    edgeOpacity: 0.7
                },
                slabs_floor: {
                    color: 0x1e293b,
                    roughness: 0.45,
                    metalness: 0.2,
                    edgeColor: 0x00d2ff,
                    edgeOpacity: 0.65
                },
                slabs_roof: {
                    color: 0x0f172a,
                    roughness: 0.35,
                    metalness: 0.3,
                    edgeColor: 0x64748b,
                    edgeOpacity: 0.6
                },
                slabs_site: {
                    color: 0x0f172a,
                    roughness: 0.9,
                    metalness: 0.05,
                    edgeColor: 0x334155,
                    edgeOpacity: 0.3
                },
                columns: {
                    color: 0x334155,
                    roughness: 0.35,
                    metalness: 0.45,
                    edgeColor: 0x60a5fa,
                    edgeOpacity: 0.7
                },
                beams: {
                    color: 0x1e293b,
                    roughness: 0.35,
                    metalness: 0.45,
                    edgeColor: 0x93c5fd,
                    edgeOpacity: 0.6
                },
                doors: {
                    color: 0xb45309,
                    roughness: 0.4,
                    metalness: 0.25,
                    edgeColor: 0xf59e0b,
                    edgeOpacity: 0.8
                },
                windows: {
                    color: 0x38bdf8,
                    roughness: 0.08,
                    metalness: 0.92,
                    transparent: true,
                    opacity: 0.45,
                    edgeColor: 0x7dd3fc,
                    edgeOpacity: 0.9
                },
                stairs: {
                    color: 0x475569,
                    roughness: 0.5,
                    metalness: 0.3,
                    edgeColor: 0x94a3b8,
                    edgeOpacity: 0.7
                },
                spaces: {
                    color: 0x10b981,
                    roughness: 0.3,
                    metalness: 0.1,
                    transparent: true,
                    opacity: 0.35,
                    edgeColor: 0x34d399,
                    edgeOpacity: 0.8
                },
                furniture: {
                    color: 0x8b5cf6,
                    roughness: 0.5,
                    metalness: 0.2,
                    edgeColor: 0xa78bfa,
                    edgeOpacity: 0.6
                },
                other: {
                    color: 0x64748b,
                    roughness: 0.5,
                    metalness: 0.2,
                    edgeColor: 0x94a3b8,
                    edgeOpacity: 0.5
                }
            };
        }

        /**
         * تهيئة محرك WebAssembly
         */
        async init() {
            if (this.isInitialized) return true;
            if (this.initPromise) return this.initPromise;

            this.initPromise = (async () => {
                if (typeof WebIFC === 'undefined' || !WebIFC.IfcAPI) {
                    throw new Error("مكتبة WebIFC غير محملة في المتصفح.");
                }

                this.ifcApi = new WebIFC.IfcAPI();

                // 1. محاولة التهيئة من المسار المحلي أولاً
                try {
                    this.ifcApi.SetWasmPath(this.wasmLocalPath, false);
                    await this.ifcApi.Init();
                    console.log("✓ تم تهيئة محرك BIM WebAssembly (web-ifc) محلياً.");
                    this.isInitialized = true;
                    return true;
                } catch (localErr) {
                    console.warn("تعذر تحميل ملف web-ifc.wasm محلياً، جاري التبديل إلى المسار السحابي CDN:", localErr);
                }

                // 2. محاولة المسار السحابي الاحتياطي (CDN Fallback)
                try {
                    this.ifcApi = new WebIFC.IfcAPI();
                    this.ifcApi.SetWasmPath(this.wasmCdnPath, true);
                    await this.ifcApi.Init();
                    console.log("✓ تم تهيئة محرك BIM WebAssembly (web-ifc) عبر شبكة CDN.");
                    this.isInitialized = true;
                    return true;
                } catch (cdnErr) {
                    console.error("فشل تهيئة محرك WebAssembly محلياً وعبر CDN:", cdnErr);
                    throw new Error("تعذر تحميل محرك الـ WebAssembly (web-ifc). يرجى التحقق من اتصال الإنترنت أو الملفات المحلية.");
                }
            })();

            return this.initPromise;
        }

        /**
         * قراءة وتحليل ملف IFC وتوليد مجسمات Three.js ونموذج التوأم الرقمي المتكامل
         * @param {ArrayBuffer|Uint8Array|string} ifcData محتوى ملف الـ IFC
         * @param {string} fileName اسم الملف المستورد
         * @param {function} onProgress رد نداء لتحديث شريط التقدم في الواجهة
         * @returns {Promise<Object>} نموذج البناء المعماري المتكامل
         */
        async parseAndBuildModel(ifcData, fileName = 'BIM_Model.ifc', onProgress = null) {
            await this.init();

            if (onProgress) onProgress("جاري قراءة بنية الـ IFC وتحميلها في ذاكرة WebAssembly...", 10);

            // تحويل البيانات إلى Uint8Array
            let uint8;
            if (ifcData instanceof Uint8Array) {
                uint8 = ifcData;
            } else if (ifcData instanceof ArrayBuffer) {
                uint8 = new Uint8Array(ifcData);
            } else if (typeof ifcData === 'string') {
                uint8 = new TextEncoder().encode(ifcData);
            } else {
                throw new Error("صيغة بيانات الـ IFC غير مدعومة.");
            }

            // فتح النموذج داخل C++/WASM
            const modelID = this.ifcApi.OpenModel(uint8, {
                COORDINATE_TO_ORIGIN: false
            });

            if (onProgress) onProgress("جاري استخراج الطوابق والمستويات المعمارية...", 25);

            // 1. استخراج الطوابق المعمارية (Building Storeys)
            const storeys = {};
            const storeyMap = new Map(); // mapping expressID -> storey object
            const elementToStorey = new Map(); // element expressID -> storeyId

            try {
                const storeyIDs = this.ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCBUILDINGSTOREY);
                const storeyCount = storeyIDs.size();

                for (let i = 0; i < storeyCount; i++) {
                    const sId = storeyIDs.get(i);
                    const line = this.ifcApi.GetLine(modelID, sId);
                    const rawName = line.Name?.value || `الطابق ${i + 1}`;
                    const elev = (typeof line.Elevation?.value === 'number') ? line.Elevation.value : (i * 3.5);
                    
                    let arabicName = rawName;
                    if (rawName.toLowerCase().includes('ground') || i === 0) arabicName = 'الطابق الأرضي (Ground)';
                    else if (rawName.toLowerCase().includes('first') || rawName.includes('1')) arabicName = 'الطابق الأول (Level 1)';
                    else if (rawName.toLowerCase().includes('second') || rawName.includes('2')) arabicName = 'الطابق الثاني (Level 2)';
                    else if (rawName.toLowerCase().includes('third') || rawName.includes('3')) arabicName = 'الطابق الثالث (Level 3)';
                    else if (rawName.toLowerCase().includes('roof')) arabicName = 'طابق السطح (Roof)';

                    const sKey = `st_${i}`;
                    const sObj = {
                        id: sKey,
                        expressID: sId,
                        name: rawName,
                        name_ar: arabicName,
                        elevation: elev / 1000.0 > 50 ? elev / 1000.0 : elev // ضبط المقياس إذا كان بالمليمتر
                    };
                    storeys[sKey] = sObj;
                    storeyMap.set(sId, sObj);
                }

                // استخراج علاقات الاحتواء المكاني IFCRELCONTAINEDINSPATIALSTRUCTURE
                const relIDs = this.ifcApi.GetLineIDsWithType(modelID, WebIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE);
                for (let r = 0; r < relIDs.size(); r++) {
                    const rel = this.ifcApi.GetLine(modelID, relIDs.get(r));
                    const parentStorey = storeyMap.get(rel.RelatingStructure?.value);
                    if (parentStorey && rel.RelatedElements) {
                        for (let e = 0; e < rel.RelatedElements.length; e++) {
                            elementToStorey.set(rel.RelatedElements[e].value, parentStorey.id);
                        }
                    }
                }
            } catch (sErr) {
                console.warn("Storey extraction notice:", sErr);
            }

            // في حال عدم وجود طوابق مسجلة، إنشاء طابق أرضي افتراضي
            if (Object.keys(storeys).length === 0) {
                storeys['st_g'] = {
                    id: 'st_g',
                    name: 'Ground Floor',
                    name_ar: 'الطابق الرئيسي',
                    elevation: 0
                };
            }

            if (onProgress) onProgress("جاري استخراج وتوليد الكتل الهندسية ثلاثية الأبعاد (Solid Breps & CSG)...", 45);

            // 2. استخراج المجسمات وتصنيفها معمارياً
            const meshesByCategory = {
                walls: [],
                slabs_floor: [],
                slabs_roof: [],
                slabs_site: [],
                columns: [],
                beams: [],
                doors: [],
                windows: [],
                stairs: [],
                spaces: [],
                furniture: [],
                other: []
            };

            const rawMeshes = [];
            const elementStats = {};

            this.ifcApi.StreamAllMeshes(modelID, (mesh) => {
                const expressID = mesh.expressID;
                let elemType = 'IFCBUILDINGELEMENTPROXY';
                let elemName = `BIM Element #${expressID}`;
                let storeyId = elementToStorey.get(expressID) || Object.keys(storeys)[0];

                try {
                    const line = this.ifcApi.GetLine(modelID, expressID);
                    if (line) {
                        const typeCode = line.type;
                        elemType = this.ifcApi.GetNameFromTypeCode(typeCode) || elemType;
                        elemName = line.Name?.value || line.ObjectType?.value || elemType;
                    }
                } catch (e) {}

                // تحديد الفئة المعمارية المناسبة
                let catKey = this.categoryMap[elemType.toUpperCase()] || 'other';
                if (catKey === 'slabs_floor' && (elemName.toLowerCase().includes('roof') || elemName.includes('سطح'))) {
                    catKey = 'slabs_roof';
                }

                elementStats[catKey] = (elementStats[catKey] || 0) + 1;

                const palette = this.materialPalette[catKey] || this.materialPalette.other;

                // معالجة كل هندسة مجسمة تابعة للعنصر
                const geomSize = mesh.geometries.size();
                for (let g = 0; g < geomSize; g++) {
                    const placedGeo = mesh.geometries.get(g);
                    let geometry = null;
                    try {
                        geometry = this.ifcApi.GetGeometry(modelID, placedGeo.geometryExpressID);
                        if (!geometry) continue;

                        const vData = this.ifcApi.GetVertexArray(geometry.GetVertexData(), geometry.GetVertexDataSize());
                        const iData = this.ifcApi.GetIndexArray(geometry.GetIndexData(), geometry.GetIndexDataSize());

                        if (!vData || vData.length === 0 || !iData || iData.length === 0) continue;

                        // فك تشابك الرؤوس ونواقل التعامد (De-interleave: [x, y, z, nx, ny, nz])
                        const numVerts = Math.floor(vData.length / 6);
                        const posArray = new Float32Array(numVerts * 3);
                        const normArray = new Float32Array(numVerts * 3);

                        for (let v = 0; v < numVerts; v++) {
                            const v6 = v * 6;
                            const v3 = v * 3;
                            posArray[v3]     = vData[v6];
                            posArray[v3 + 1] = vData[v6 + 1];
                            posArray[v3 + 2] = vData[v6 + 2];

                            normArray[v3]     = vData[v6 + 3];
                            normArray[v3 + 1] = vData[v6 + 4];
                            normArray[v3 + 2] = vData[v6 + 5];
                        }

                        const bufferGeo = new THREE.BufferGeometry();
                        bufferGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
                        bufferGeo.setAttribute('normal', new THREE.BufferAttribute(normArray, 3));
                        bufferGeo.setIndex(new THREE.BufferAttribute(new Uint32Array(iData), 1));

                        // تطبيق مصفوفة التحويل الفراغي للعنصر (4x4 Matrix)
                        if (placedGeo.flatTransformation && placedGeo.flatTransformation.length === 16) {
                            const m = new THREE.Matrix4().fromArray(placedGeo.flatTransformation);
                            bufferGeo.applyMatrix4(m);
                        }

                        // تحويل محاور الإحداثيات الهندسية من IFC Z-Up إلى Three.js Y-Up:
                        bufferGeo.rotateX(-Math.PI / 2);

                        // تجهيز خامة العنصر ولونه
                        let meshMat;
                        const ifcColor = placedGeo.color;
                        if (palette.transparent) {
                            meshMat = new THREE.MeshPhysicalMaterial({
                                color: palette.color,
                                roughness: palette.roughness,
                                metalness: palette.metalness,
                                transmission: 0.85,
                                transparent: true,
                                opacity: palette.opacity,
                                side: THREE.DoubleSide
                            });
                        } else {
                            let matColor = palette.color;
                            if (ifcColor && (ifcColor.x > 0.05 || ifcColor.y > 0.05 || ifcColor.z > 0.05)) {
                                matColor = new THREE.Color(ifcColor.x, ifcColor.y, ifcColor.z);
                            }
                            meshMat = new THREE.MeshStandardMaterial({
                                color: matColor,
                                roughness: palette.roughness,
                                metalness: palette.metalness,
                                side: THREE.DoubleSide
                            });
                        }

                        const threeMesh = new THREE.Mesh(bufferGeo, meshMat);
                        threeMesh.castShadow = !palette.transparent;
                        threeMesh.receiveShadow = true;

                        // بيانات فاحص الخصائص وتفكيك الطبقات (userData)
                        threeMesh.userData = {
                            isBIMElement: true,
                            expressID: expressID,
                            ifcType: elemType,
                            category: catKey,
                            name: elemName,
                            storeyId: storeyId,
                            edgeColor: palette.edgeColor
                        };

                        // إضافة خطوط الحواف المعمارية الأنيقة (Crisp Architectural Edges)
                        if (numVerts < 8000 && catKey !== 'slabs_site') {
                            const edgeGeo = new THREE.EdgesGeometry(bufferGeo, 30);
                            const edgeMat = new THREE.LineBasicMaterial({
                                color: palette.edgeColor,
                                transparent: true,
                                opacity: palette.edgeOpacity || 0.6
                            });
                            const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
                            threeMesh.add(edgeLines);
                        }

                        meshesByCategory[catKey].push(threeMesh);
                        rawMeshes.push(threeMesh);

                    } catch (gErr) {
                        // تجاوز أي هندسة مفردة تالفة ومتابعة باقي عناصر المبنى
                    } finally {
                        if (geometry && typeof geometry.delete === 'function') {
                            try { geometry.delete(); } catch(e) {}
                        }
                    }
                }
            });

            if (onProgress) onProgress("جاري محاذاة وتوسيط المبنى في منتصف الشبكة المعمارية...", 80);

            // 3. حساب الصندوق المحيط الإجمالي وتوسيط المبنى عند (0, 0, 0)
            const globalBox = new THREE.Box3();
            for (const mesh of rawMeshes) {
                mesh.geometry.computeBoundingBox();
                if (mesh.geometry.boundingBox) {
                    globalBox.union(mesh.geometry.boundingBox);
                }
            }

            const center = new THREE.Vector3();
            globalBox.getCenter(center);
            const minY = globalBox.min.y;

            // إزاحة الرؤوس هندسياً ليجلس المبنى بدقة على أرضية المشهد (Y=0) وفي المنتصف (X=0, Z=0)
            const offsetX = -center.x;
            const offsetY = -minY;
            const offsetZ = -center.z;

            for (const mesh of rawMeshes) {
                mesh.geometry.translate(offsetX, offsetY, offsetZ);
                mesh.geometry.computeBoundingBox();
                mesh.geometry.computeBoundingSphere();
            }

            // تحديث الصندوق المحيط بعد التوسيط
            globalBox.min.x += offsetX;
            globalBox.max.x += offsetX;
            globalBox.min.y += offsetY;
            globalBox.max.y += offsetY;
            globalBox.min.z += offsetZ;
            globalBox.max.z += offsetZ;

            // 4. توليد فضاءات ومسارات الحركة التكيفية التلقائية من البلاطات والجدران
            const spaces = {};
            let spaceCounter = 1;
            const floorMeshes = meshesByCategory.slabs_floor;

            if (floorMeshes.length > 0) {
                floorMeshes.forEach((slabMesh, idx) => {
                    const sBox = slabMesh.geometry.boundingBox;
                    if (sBox) {
                        const w = Math.max(6, sBox.max.x - sBox.min.x);
                        const d = Math.max(6, sBox.max.z - sBox.min.z);
                        const area = Math.round(w * d);
                        const sId = `ifc_zone_${spaceCounter}`;
                        spaces[sId] = {
                            id: sId,
                            name_ar: `فضاء تشغيلي ${spaceCounter} (${slabMesh.userData.storeyId || 'طابق'})`,
                            name_en: `Operational Zone ${spaceCounter}`,
                            type: idx === 0 ? 'reception' : (idx % 2 === 0 ? 'workspace' : 'public'),
                            capacity: Math.max(15, Math.round(area / 4)),
                            area_m2: area,
                            storey_id: slabMesh.userData.storeyId,
                            base_elevation: sBox.min.y,
                            bounds: {
                                x: sBox.min.x,
                                z: sBox.min.z,
                                width: w,
                                depth: d,
                                height: 3.5
                            }
                        };
                        spaceCounter++;
                    }
                });
            } else {
                spaces['ifc_main_zone'] = {
                    id: 'ifc_main_zone',
                    name_ar: 'الفضاء المعماري الرئيسي للنموذج المستورد',
                    name_en: 'Primary Imported BIM Zone',
                    type: 'public',
                    capacity: 50,
                    area_m2: Math.round((globalBox.max.x - globalBox.min.x) * (globalBox.max.z - globalBox.min.z)),
                    base_elevation: 0,
                    bounds: {
                        x: globalBox.min.x,
                        z: globalBox.min.z,
                        width: Math.max(10, globalBox.max.x - globalBox.min.x),
                        depth: Math.max(10, globalBox.max.z - globalBox.min.z),
                        height: Math.max(3.5, globalBox.max.y - globalBox.min.y)
                    }
                };
            }

            // إغلاق النموذج في C++ لتحرير الذاكرة
            this.ifcApi.CloseModel(modelID);

            if (onProgress) onProgress("اكتمل تجهيز وتجسيم نموذج الـ IFC بنجاح!", 100);

            // تجميع كائن النموذج النهائي
            const modelData = {
                id: `ifc_model_${Date.now()}`,
                building_type: 'imported_ifc_wasm',
                is_wasm_ifc: true,
                name_ar: `مشروع BIM مستورد: ${fileName}`,
                name_en: `Imported BIM Project: ${fileName}`,
                fileName: fileName,
                storeys: storeys,
                spaces: spaces,
                meshesByCategory: meshesByCategory,
                rawMeshes: rawMeshes,
                stats: elementStats,
                totalElements: rawMeshes.length,
                boundingBox: {
                    min: { x: globalBox.min.x, y: globalBox.min.y, z: globalBox.min.z },
                    max: { x: globalBox.max.x, y: globalBox.max.y, z: globalBox.max.z },
                    width: globalBox.max.x - globalBox.min.x,
                    depth: globalBox.max.z - globalBox.min.z,
                    height: globalBox.max.y - globalBox.min.y
                }
            };

            return modelData;
        }
    }

    // إتاحة الفئة عالمياً
    window.BIMIFCEngine = BIMIFCEngine;

})(typeof window !== 'undefined' ? window : this);
