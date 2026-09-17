# backend/plan_importer.py
"""
Architectural Plan Importer & Universal BIM Parser.
Parses:
1. BIM IFC files (ISO 10303-21) exported from Autodesk Revit & Graphisoft ArchiCAD.
2. Architectural PDF drawings (Vector paths & Text Room tags).
3. AutoCAD DXF drawings (LWPOLYLINE, TEXT, MTEXT).
4. Structured BIM JSON models.
"""

import json
import os
import math
import re
import base64
from typing import Dict, Any, List, Optional, Tuple

class IFCStepParser:
    """
    محلل متقدم لملفات BIM ISO 10303-21 STEP الصادرة من Autodesk Revit و Graphisoft ArchiCAD.
    يستخرج:
    1. مقياس الرسم ووحدات القياس الحقيقية (IFCSIUNIT / IFCUNITASSIGNMENT).
    2. كافة طوابق ومستويات المبنى ومناسيبها (IFCBUILDINGSTOREY).
    3. الجدران المعمارية الحقيقية (IFCWALL, IFCWALLSTANDARDCASE) ومناسيبها وارتفاعاتها.
    4. بلاطات الأرضيات والأسقف والكتلة الخرسانية (IFCSLAB, IFCROOF).
    5. الأعمدة الإنشائية (IFCCOLUMN) والجسور (IFCBEAM).
    6. السلالم المعمارية (IFCSTAIR, IFCSTAIRFLIGHT).
    7. فتحات الأبواب والشبابيك (IFCDOOR, IFCWINDOW) وربطها بالجدران الحاضنة.
    8. الفضاءات المعمارية (IFCSPACE) أو توليدها لكل طابق.
    """
    def __init__(self, content: str):
        self.raw_content = content
        self.entities: Dict[int, Dict[str, Any]] = {}
        self.entities_by_type: Dict[str, List[int]] = {}
        self.scale = 1.0
        self.unit_name = "METRE"
        self.project_name = "BIM Project"
        self.building_name = "مبنى BIM مستورد (Revit / ArchiCAD)"
        self.storeys: Dict[str, Dict[str, Any]] = {}
        self.containment: Dict[int, str] = {}
        self.walls: Dict[str, Dict[str, Any]] = {}
        self.slabs: Dict[str, Dict[str, Any]] = {}
        self.columns: Dict[str, Dict[str, Any]] = {}
        self.beams: Dict[str, Dict[str, Any]] = {}
        self.openings: Dict[str, Dict[str, Any]] = {}
        self.stairs: Dict[str, Dict[str, Any]] = {}
        self.spaces: Dict[str, Dict[str, Any]] = {}
        self.extracted_areas: List[float] = []
        self.rel_voids: Dict[int, int] = {}
        self.rel_fills: Dict[int, int] = {}
        self.element_to_wall: Dict[int, int] = {}
        self.decomposed_parents: Set[int] = set()
        self.aggregated_children: Dict[int, int] = {}

    def parse(self) -> Dict[str, Any]:
        self._tokenize_and_build_graph()
        self._detect_units()
        self._extract_project_info()
        self._extract_storeys()
        self._extract_containment()
        self._extract_relationships()
        self._extract_walls()
        self._extract_slabs()
        self._extract_columns()
        self._extract_beams()
        self._extract_openings()
        self._extract_stairs()
        self._extract_spaces()
        model = self._build_model_dict()
        return PlanImporter.center_model_dict(model)

    def _tokenize_and_build_graph(self):
        clean = re.sub(r'/\*.*?\*/', '', self.raw_content, flags=re.DOTALL)
        data_match = re.search(r'DATA\s*;(.*?)ENDSEC\s*;', clean, re.DOTALL | re.IGNORECASE)
        data_text = data_match.group(1) if data_match else clean

        area_pattern = re.compile(r"IFCQUANTITYAREA\s*\([^,]+,[^,]+,[^,]+,\s*([0-9\.]+)", re.IGNORECASE)
        self.extracted_areas = [float(a) for a in area_pattern.findall(clean)]

        record_starts = [m.start() for m in re.finditer(r'#\d+\s*=', data_text)]
        for i, start_idx in enumerate(record_starts):
            end_idx = record_starts[i+1] if i+1 < len(record_starts) else len(data_text)
            chunk = data_text[start_idx:end_idx].strip().rstrip('; \t\r\n')
            m = re.match(r'#(\d+)\s*=\s*([A-Za-z0-9_]+)\s*\((.*)\)\s*;?$', chunk, re.DOTALL)
            if m:
                eid = int(m.group(1))
                etype = m.group(2).upper()
                raw_args = m.group(3)
                args = self._parse_args(raw_args)
                self.entities[eid] = {'type': etype, 'args': args}
                if etype not in self.entities_by_type:
                    self.entities_by_type[etype] = []
                self.entities_by_type[etype].append(eid)

    def _parse_args(self, args_str: str) -> list:
        args = []
        current = []
        depth = 0
        in_str = False
        i = 0
        n = len(args_str)
        while i < n:
            c = args_str[i]
            if c == "'" and (i == 0 or args_str[i-1] != "\\"):
                if in_str and i + 1 < n and args_str[i+1] == "'":
                    current.append("'")
                    i += 2
                    continue
                in_str = not in_str
                current.append(c)
            elif not in_str:
                if c == '(':
                    depth += 1
                    current.append(c)
                elif c == ')':
                    depth -= 1
                    current.append(c)
                elif c == ',' and depth == 0:
                    args.append("".join(current).strip())
                    current = []
                else:
                    current.append(c)
            else:
                current.append(c)
            i += 1
        if current:
            args.append("".join(current).strip())
        return [self._convert_token(a) for a in args]

    def _convert_token(self, token: str):
        token = token.strip()
        if not token or token == '$' or token == '*':
            return None
        if token.startswith("'") and token.endswith("'"):
            return token[1:-1].replace("''", "'")
        if token.startswith("(") and token.endswith(")"):
            inner = token[1:-1].strip()
            if not inner:
                return []
            return self._parse_args(inner)
        if token.startswith("#"):
            try:
                return int(token[1:])
            except ValueError:
                return token
        if token.startswith(".") and token.endswith("."):
            return token[1:-1].upper()
        try:
            if '.' in token or 'E' in token.upper():
                return float(token)
            return int(token)
        except ValueError:
            return token

    def _get_entity(self, ref):
        if isinstance(ref, int):
            return self.entities.get(ref)
        if isinstance(ref, str) and ref.startswith("#"):
            try:
                return self.entities.get(int(ref[1:]))
            except ValueError:
                pass
        return None

    def _detect_units(self):
        for eid in self.entities_by_type.get('IFCSIUNIT', []):
            ent = self.entities[eid]
            args = ent['args']
            if len(args) >= 3 and ('LENGTHUNIT' in str(args[1])):
                prefix = args[2] if len(args) > 2 else None
                unit = args[3] if len(args) > 3 else (args[2] if len(args) > 2 else None)
                if prefix == 'MILLI' or unit == 'MILLI':
                    self.scale = 0.001
                    self.unit_name = "MILLIMETRE"
                    return
                elif prefix == 'CENTI':
                    self.scale = 0.01
                    self.unit_name = "CENTIMETRE"
                    return
                elif unit == 'METRE' and not prefix:
                    self.scale = 1.0
                    self.unit_name = "METRE"
                    return

    def _extract_project_info(self):
        for eid in self.entities_by_type.get('IFCBUILDING', []):
            ent = self.entities[eid]
            if len(ent['args']) > 2 and ent['args'][2]:
                self.building_name = str(ent['args'][2])
                break
        for eid in self.entities_by_type.get('IFCPROJECT', []):
            ent = self.entities[eid]
            if len(ent['args']) > 2 and ent['args'][2]:
                self.project_name = str(ent['args'][2])
                break

    def _resolve_placement(self, placement_ref):
        if not placement_ref:
            return 0.0, 0.0, 0.0, 0.0
        ent = self._get_entity(placement_ref)
        if not ent:
            return 0.0, 0.0, 0.0, 0.0
        
        px, py, pz, rot = 0.0, 0.0, 0.0, 0.0
        if ent['type'] == 'IFCLOCALPLACEMENT':
            rel_placement = ent['args'][0] if len(ent['args']) > 0 else None
            axis2_ref = ent['args'][1] if len(ent['args']) > 1 else None
            
            if rel_placement:
                ppx, ppy, ppz, prot = self._resolve_placement(rel_placement)
                px += ppx
                py += ppy
                pz += ppz
                rot += prot
                
            if axis2_ref:
                apx, apy, apz, arot = self._resolve_axis2placement(axis2_ref)
                cos_r = math.cos(rot)
                sin_r = math.sin(rot)
                rx = apx * cos_r - apy * sin_r
                ry = apx * sin_r + apy * cos_r
                px += rx
                py += ry
                pz += apz
                rot += arot
        elif ent['type'] in ('IFCAXIS2PLACEMENT3D', 'IFCAXIS2PLACEMENT2D'):
            px, py, pz, rot = self._resolve_axis2placement(placement_ref)
        return px, py, pz, rot

    def _resolve_axis2placement(self, axis_ref):
        ent = self._get_entity(axis_ref)
        if not ent:
            return 0.0, 0.0, 0.0, 0.0
        args = ent['args']
        loc_ref = args[0] if len(args) > 0 else None
        ref_dir_ref = args[2] if len(args) > 2 else (args[1] if ent['type'] == 'IFCAXIS2PLACEMENT2D' and len(args) > 1 else None)
        
        x, y, z = 0.0, 0.0, 0.0
        if loc_ref:
            pt = self._resolve_point(loc_ref)
            x, y, z = pt[0], pt[1], pt[2] if len(pt) > 2 else 0.0
            
        rot = 0.0
        if ref_dir_ref:
            dir_ent = self._get_entity(ref_dir_ref)
            if dir_ent and dir_ent['type'] == 'IFCDIRECTION':
                dargs = dir_ent['args'][0] if len(dir_ent['args']) > 0 else []
                if isinstance(dargs, list) and len(dargs) >= 2:
                    dx, dy = float(dargs[0]), float(dargs[1])
                    rot = math.atan2(dy, dx)
        return x, y, z, rot

    def _resolve_point(self, pt_ref):
        ent = self._get_entity(pt_ref)
        if not ent:
            return [0.0, 0.0, 0.0]
        if ent['type'] == 'IFCCARTESIANPOINT':
            coords = ent['args'][0] if len(ent['args']) > 0 else []
            if isinstance(coords, list):
                return [float(c) for c in coords]
        return [0.0, 0.0, 0.0]

    def _extract_storeys(self):
        storey_ids = self.entities_by_type.get('IFCBUILDINGSTOREY', [])
        found = []
        for eid in storey_ids:
            ent = self.entities[eid]
            args = ent['args']
            guid = str(args[0]) if len(args) > 0 and args[0] else f"storey_{eid}"
            name = str(args[2]) if len(args) > 2 and args[2] else f"Level {len(found)}"
            elev = 0.0
            if len(args) > 9 and args[9] is not None and isinstance(args[9], (int, float)):
                elev = float(args[9])
            else:
                placement_ref = args[5] if len(args) > 5 else None
                _, _, pz, _ = self._resolve_placement(placement_ref)
                elev = pz
            found.append({
                'eid': eid,
                'guid': guid,
                'name': name,
                'raw_elev': elev
            })
            
        if found:
            max_e = max(abs(f['raw_elev']) for f in found)
            if max_e > 200.0 and self.scale == 1.0:
                self.scale = 0.001
                self.unit_name = "MILLIMETRE (auto-detected)"

        found.sort(key=lambda x: x['raw_elev'])
        
        for i, f in enumerate(found):
            s_id = f"storey_{f['eid']}"
            elev_m = f['raw_elev'] * self.scale
            if i + 1 < len(found):
                next_e = found[i+1]['raw_elev'] * self.scale
                height_m = max(2.5, round(next_e - elev_m, 2))
            else:
                height_m = round(list(self.storeys.values())[-1]['height'], 2) if self.storeys else 3.5
            
            name_en = f['name']
            name_ar = self._translate_storey_name(name_en, i, elev_m)
            
            self.storeys[s_id] = {
                'id': s_id,
                'eid': f['eid'],
                'name_ar': name_ar,
                'name_en': name_en,
                'elevation': round(elev_m, 2),
                'height': height_m
            }
            
        if not self.storeys:
            self.storeys['storey_ground'] = {
                'id': 'storey_ground',
                'eid': 0,
                'name_ar': 'الطابق الأرضي (Level 0)',
                'name_en': 'Ground Floor',
                'elevation': 0.0,
                'height': 3.5
            }

    def _translate_storey_name(self, name_en: str, index: int, elev_m: float) -> str:
        nl = name_en.lower()
        if 'basement' in nl or 'underground' in nl or 'قبو' in nl or elev_m < -0.5:
            return f"طابق القبو ({name_en} {elev_m:+.2f}م)"
        if 'ground' in nl or 'level 0' in nl or 'floor 0' in nl or 'أرضي' in nl or abs(elev_m) < 0.2:
            return f"الطابق الأرضي ({name_en} {elev_m:.2f}م)"
        if 'roof' in nl or 'سطح' in nl or 'terrace' in nl:
            return f"منسوب السطح / الروف ({name_en} {elev_m:+.2f}م)"
        if 'first' in nl or 'level 1' in nl or 'floor 1' in nl:
            return f"الطابق الأول ({name_en} {elev_m:+.2f}م)"
        if 'second' in nl or 'level 2' in nl or 'floor 2' in nl:
            return f"الطابق الثاني ({name_en} {elev_m:+.2f}م)"
        return f"طابق معماري: {name_en} ({elev_m:+.2f}م)"

    def _extract_containment(self):
        for eid in self.entities_by_type.get('IFCRELCONTAINEDINSPATIALSTRUCTURE', []):
            ent = self.entities[eid]
            args = ent['args']
            if len(args) >= 6:
                elems = args[4] if isinstance(args[4], list) else [args[4]]
                struct_ref = args[5]
                s_id = f"storey_{struct_ref}"
                for el in elems:
                    if el is not None:
                        self.containment[el] = s_id

    def _extract_relationships(self):
        """استخراج علاقات الفتحات والجدران (IFCRELVOIDSELEMENT و IFCRELFILLSELEMENT)"""
        # 1. IFCRELVOIDSELEMENT: الجدار الحاضن ينشئ فتحة فراغية
        for eid in self.entities_by_type.get('IFCRELVOIDSELEMENT', []):
            ent = self.entities[eid]
            args = ent['args']
            if len(args) >= 6:
                wall_ref = args[4]
                opening_ref = args[5]
                if isinstance(wall_ref, int) and isinstance(opening_ref, int):
                    self.rel_voids[opening_ref] = wall_ref

        # 2. IFCRELFILLSELEMENT: فتحة الفراغ يملؤها باب أو شباك
        for eid in self.entities_by_type.get('IFCRELFILLSELEMENT', []):
            ent = self.entities[eid]
            args = ent['args']
            if len(args) >= 6:
                opening_ref = args[4]
                elem_ref = args[5]
                if isinstance(opening_ref, int) and isinstance(elem_ref, int):
                    self.rel_fills[elem_ref] = opening_ref

        # دمج المسارين للربط المباشر بين الباب/الشباك والجدار الحاضن
        for elem_ref, opening_ref in self.rel_fills.items():
            if opening_ref in self.rel_voids:
                self.element_to_wall[elem_ref] = self.rel_voids[opening_ref]

        # فحص إضافي: بعض المصدرات تربط الباب أو الشباك مباشرة بـ IFCRELVOIDSELEMENT
        for opening_ref, wall_ref in self.rel_voids.items():
            if opening_ref not in self.element_to_wall:
                o_ent = self._get_entity(opening_ref)
                if o_ent and o_ent['type'] in ('IFCDOOR', 'IFCDOORSTANDARDCASE', 'IFCWINDOW', 'IFCWINDOWSTANDARDCASE'):
                    self.element_to_wall[opening_ref] = wall_ref

        # 3. IFCRELAGGREGATES & IFCRELDECOMPOSES: تفكيك الحاويات والتجميع الهيكلي
        self.decomposed_parents = set()
        self.aggregated_children = {}
        for rel_type in ('IFCRELAGGREGATES', 'IFCRELDECOMPOSES'):
            for eid in self.entities_by_type.get(rel_type, []):
                ent = self.entities[eid]
                args = ent.get('args', [])
                if len(args) >= 6:
                    parent_ref = args[4]
                    children_refs = args[5] if isinstance(args[5], list) else [args[5]]
                    if isinstance(parent_ref, int):
                        self.decomposed_parents.add(parent_ref)
                        for c_ref in children_refs:
                            if isinstance(c_ref, int):
                                self.aggregated_children[c_ref] = parent_ref

    def _extract_walls(self):
        wall_eids = (
            self.entities_by_type.get('IFCWALLSTANDARDCASE', []) +
            self.entities_by_type.get('IFCWALL', []) +
            self.entities_by_type.get('IFCWALLELEMENTEDCASE', []) +
            self.entities_by_type.get('IFCCURTAINWALL', [])
        )
        for eid in wall_eids:
            ent = self.entities[eid]
            if not ent:
                continue

            # استبعاد الجدران الحاضنة المفككة لعناصر فرعية IFCWALLELEMENTEDCASE لمنع التكرار والتداخل
            if eid in self.decomposed_parents and ent['type'] in ('IFCWALLELEMENTEDCASE', 'IFCCURTAINWALL'):
                continue

            args = ent['args']
            w_id = f"wall_{eid}"
            w_name = str(args[2]) if len(args) > 2 and args[2] else f"Wall_{eid}"
            
            storey_id = self.containment.get(eid)
            if not storey_id or storey_id not in self.storeys:
                storey_id = list(self.storeys.keys())[0]
            storey_elev = self.storeys[storey_id]['elevation']
            
            placement_ref = args[5] if len(args) > 5 else None
            px, py, pz, rot = self._resolve_placement(placement_ref)
            
            shape_ref = args[6] if len(args) > 6 else None
            axis_pts, length, thickness, height = self._resolve_wall_geometry(shape_ref)
            
            if axis_pts:
                p1, p2 = axis_pts[0], axis_pts[1]
                cos_r, sin_r = math.cos(rot), math.sin(rot)
                sx = (px + (p1[0] * cos_r - p1[1] * sin_r)) * self.scale
                sz = (py + (p1[0] * sin_r + p1[1] * cos_r)) * self.scale
                ex = (px + (p2[0] * cos_r - p2[1] * sin_r)) * self.scale
                ez = (py + (p2[0] * sin_r + p2[1] * cos_r)) * self.scale
            elif length > 0:
                cos_r, sin_r = math.cos(rot), math.sin(rot)
                sx = px * self.scale
                sz = py * self.scale
                ex = (px + (length * cos_r)) * self.scale
                ez = (py + (length * sin_r)) * self.scale
            else:
                continue
                
            wall_t = max(0.15, thickness * self.scale) if thickness > 0 else 0.25
            wall_h = max(2.0, height * self.scale) if height > 0 else self.storeys[storey_id]['height']
            base_y = (pz * self.scale) if abs(pz * self.scale - storey_elev) < 0.2 else storey_elev

            # فحص التكرار الشامل (Deduplication) مع معالجة تطابق IFCWALL و IFCWALLSTANDARDCASE
            is_dup = False
            curr_ifc_type = ent['type']
            for existing_w in self.walls.values():
                if existing_w.get('storey_id') == storey_id:
                    s_ex = existing_w['start']
                    e_ex = existing_w['end']
                    d_direct = math.hypot(sx - s_ex[0], sz - s_ex[1]) + math.hypot(ex - e_ex[0], ez - e_ex[1])
                    d_reverse = math.hypot(sx - e_ex[0], sz - e_ex[1]) + math.hypot(ex - s_ex[0], ez - s_ex[1])
                    if d_direct < 0.35 or d_reverse < 0.35:
                        prev_ifc_type = existing_w.get('ifc_type', '')
                        is_wall_dup = (
                            ('WALL' in curr_ifc_type and 'WALL' in prev_ifc_type and 'CURTAIN' not in curr_ifc_type and 'CURTAIN' not in prev_ifc_type)
                            or (curr_ifc_type == prev_ifc_type)
                            or ('ELEMENTED' in curr_ifc_type or 'ELEMENTED' in prev_ifc_type)
                        )
                        if is_wall_dup:
                            is_dup = True
                            break
            if is_dup:
                continue
            
            is_curtain = ent['type'] == 'IFCCURTAINWALL'
            is_ext = any(k in w_name.lower() for k in ['ext', 'outer', 'exterior', 'خارجي']) or is_curtain
            self.walls[w_id] = {
                'id': w_id,
                'name_ar': f"{'واجهة زجاجية ستائرية' if is_curtain else 'جدار معماري'} ({w_name})",
                'name_en': w_name,
                'start': [round(sx, 2), round(sz, 2)],
                'end': [round(ex, 2), round(ez, 2)],
                'thickness': round(wall_t, 2),
                'height': round(wall_h, 2),
                'base_elevation': round(base_y, 2),
                'storey_id': storey_id,
                'type': 'exterior' if is_ext else 'interior',
                'ifc_type': ent['type']
            }

    def _resolve_curve_endpoints(self, curve_ref) -> Optional[Tuple[List[float], List[float]]]:
        """استخراج نقطتي البداية والنهاية من مختلف أنواع منحنيات IFC (Polyline, TrimmedCurve, CompositeCurve)"""
        ent = self._get_entity(curve_ref)
        if not ent:
            return None
        etype = ent['type']
        args = ent['args']
        if etype == 'IFCPOLYLINE':
            pt_refs = args[0] if len(args) > 0 and isinstance(args[0], list) else []
            if len(pt_refs) >= 2:
                p1 = self._resolve_point(pt_refs[0])
                p2 = self._resolve_point(pt_refs[-1])
                return (p1, p2)
        elif etype == 'IFCTRIMMEDCURVE':
            p1, p2 = None, None
            for trim_spec, is_end in [(args[1] if len(args) > 1 else None, False),
                                      (args[2] if len(args) > 2 else None, True)]:
                items = trim_spec if isinstance(trim_spec, list) else [trim_spec]
                for it in items:
                    tent = self._get_entity(it)
                    if tent and tent['type'] == 'IFCCARTESIANPOINT':
                        pt = self._resolve_point(it)
                        if not is_end:
                            p1 = pt
                        else:
                            p2 = pt
                        break
            if p1 and p2:
                return (p1, p2)
            basis = args[0] if len(args) > 0 else None
            if basis:
                b_pts = self._resolve_curve_endpoints(basis)
                if b_pts:
                    return b_pts
        elif etype == 'IFCLINE':
            p1 = self._resolve_point(args[0]) if len(args) > 0 else [0.0, 0.0, 0.0]
            dir_ref = args[1] if len(args) > 1 else None
            mag = 10.0
            dx, dy = 1.0, 0.0
            if dir_ref:
                dent = self._get_entity(dir_ref)
                if dent and dent['type'] == 'IFCVECTOR':
                    mag = float(dent['args'][1]) if len(dent['args']) > 1 and dent['args'][1] else 10.0
                    dref = dent['args'][0] if len(dent['args']) > 0 else None
                    if dref:
                        dsub = self._get_entity(dref)
                        if dsub and dsub['type'] == 'IFCDIRECTION':
                            dcoords = dsub['args'][0] if len(dsub['args']) > 0 and isinstance(dsub['args'][0], list) else [1.0, 0.0]
                            dx, dy = float(dcoords[0]), float(dcoords[1])
            p2 = [p1[0] + dx * mag, p1[1] + dy * mag, p1[2] if len(p1) > 2 else 0.0]
            return (p1, p2)
        elif etype == 'IFCCOMPOSITECURVE':
            segs = args[0] if len(args) > 0 and isinstance(args[0], list) else []
            if segs:
                first_seg = self._get_entity(segs[0])
                last_seg = self._get_entity(segs[-1])
                c1 = first_seg['args'][2] if first_seg and len(first_seg['args']) > 2 else None
                c2 = last_seg['args'][2] if last_seg and len(last_seg['args']) > 2 else None
                pts1 = self._resolve_curve_endpoints(c1) if c1 else None
                pts2 = self._resolve_curve_endpoints(c2) if c2 else None
                if pts1 and pts2:
                    return (pts1[0], pts2[1])
                elif pts1:
                    return pts1
        return None

    def _find_all_cartesian_points(self, ref, max_depth: int = 4) -> List[List[float]]:
        if max_depth <= 0:
            return []
        ent = self._get_entity(ref)
        if not ent:
            return []
        if ent['type'] == 'IFCCARTESIANPOINT':
            return [self._resolve_point(ref)]
        results = []
        for arg in ent.get('args', []):
            if isinstance(arg, int):
                results.extend(self._find_all_cartesian_points(arg, max_depth - 1))
            elif isinstance(arg, list):
                for sub in arg:
                    if isinstance(sub, int):
                        results.extend(self._find_all_cartesian_points(sub, max_depth - 1))
        return results

    def _resolve_wall_geometry(self, shape_ref):
        axis_pts = None
        length = 0.0
        thickness = 0.25 / max(1e-5, self.scale)
        height = 3.0 / max(1e-5, self.scale)
        
        ent = self._get_entity(shape_ref)
        if not ent:
            return axis_pts, length, thickness, height
            
        reps = []
        if ent['type'] == 'IFCPRODUCTDEFINITIONSHAPE':
            rep_list = ent['args'][2] if len(ent['args']) > 2 else []
            if isinstance(rep_list, list):
                reps = rep_list
        elif ent['type'] == 'IFCSHAPEREPRESENTATION':
            reps = [shape_ref]
            
        for r_ref in reps:
            r_ent = self._get_entity(r_ref)
            if not r_ent or r_ent['type'] != 'IFCSHAPEREPRESENTATION':
                continue
            rep_id = str(r_ent['args'][1]) if len(r_ent['args']) > 1 and r_ent['args'][1] else ""
            items = r_ent['args'][3] if len(r_ent['args']) > 3 and isinstance(r_ent['args'][3], list) else []
            
            if 'Axis' in rep_id or 'Curve2D' in rep_id:
                for item_ref in items:
                    pts = self._resolve_curve_endpoints(item_ref)
                    if pts:
                        axis_pts = pts
                        break
            elif 'SweptSolid' in rep_id or 'Body' in rep_id or 'Brep' in rep_id or 'SurfaceModel' in rep_id:
                for item_ref in items:
                    item_ent = self._get_entity(item_ref)
                    if not item_ent:
                        continue
                    if item_ent['type'] == 'IFCEXTRUDEDAREASOLID':
                        eargs = item_ent['args']
                        prof_ref = eargs[0] if len(eargs) > 0 else None
                        depth = float(eargs[3]) if len(eargs) > 3 and eargs[3] else height
                        height = depth
                        if prof_ref:
                            prof = self._get_entity(prof_ref)
                            if prof and prof['type'] == 'IFCRECTANGLEPROFILEDEF':
                                pargs = prof['args']
                                xdim = float(pargs[3]) if len(pargs) > 3 and pargs[3] else 0.0
                                ydim = float(pargs[4]) if len(pargs) > 4 and pargs[4] else 0.0
                                length = max(xdim, ydim)
                                thickness = min(xdim, ydim) if min(xdim, ydim) > 0 else thickness
                            elif prof and prof['type'] in ('IFCARBITRARYCLOSEDPROFILEDEF', 'IFCARBITRARYPROFILEDEFWITHVOIDS'):
                                outer_curve_ref = prof['args'][2] if len(prof['args']) > 2 else None
                                outer_ent = self._get_entity(outer_curve_ref)
                                if outer_ent and outer_ent['type'] == 'IFCPOLYLINE':
                                    pt_refs = outer_ent['args'][0] if len(outer_ent['args']) > 0 and isinstance(outer_ent['args'][0], list) else []
                                    poly_pts = [self._resolve_point(pr) for pr in pt_refs]
                                    if poly_pts:
                                        pxs = [p[0] for p in poly_pts]
                                        pys = [p[1] for p in poly_pts]
                                        dx = max(pxs) - min(pxs)
                                        dy = max(pys) - min(pys)
                                        if dx > 0 or dy > 0:
                                            length = max(dx, dy)
                                            thickness = min(dx, dy) if min(dx, dy) > 0 else thickness
                                            if not axis_pts and len(poly_pts) >= 2:
                                                best_seg = (poly_pts[0], poly_pts[1])
                                                best_len = 0.0
                                                for k in range(len(poly_pts)):
                                                    ka = poly_pts[k]
                                                    kb = poly_pts[(k + 1) % len(poly_pts)]
                                                    slen = math.hypot(kb[0] - ka[0], kb[1] - ka[1])
                                                    if slen > best_len:
                                                        best_len = slen
                                                        best_seg = (ka, kb)
                                                if best_len > 0.5:
                                                    axis_pts = best_seg
                            elif prof and prof['type'] == 'IFCCIRCLEPROFILEDEF':
                                pargs = prof['args']
                                rad = float(pargs[2]) if len(pargs) > 2 and pargs[2] else 0.5
                                length = rad * 2.0
                                thickness = rad * 2.0
                    elif item_ent['type'] in ('IFCFACETEDBREP', 'IFCSHELLBASEDSURFACEMODEL'):
                        pts_found = self._find_all_cartesian_points(item_ref)
                        if pts_found:
                            pxs = [p[0] for p in pts_found]
                            pys = [p[1] for p in pts_found]
                            pzs = [p[2] for p in pts_found]
                            dx = max(pxs) - min(pxs)
                            dy = max(pys) - min(pys)
                            dz = max(pzs) - min(pzs)
                            if dx > 0 or dy > 0:
                                length = max(dx, dy)
                                thickness = min(dx, dy) if min(dx, dy) > 0 else thickness
                            if dz > 0:
                                height = dz
        return axis_pts, length, thickness, height

    def _resolve_slab_geometry(self, shape_ref) -> Tuple[float, float, float, Optional[List[List[float]]]]:
        """
        استخراج أبعاد وبوليجون البلاطة المعمارية بدقة من تعريفات IFC الهندسية
        (IfcExtrudedAreaSolid, IfcArbitraryClosedProfileDef, IfcRectangleProfileDef, IfcFacetedBrep)
        """
        width = 0.0
        depth = 0.0
        thickness = 0.25 / max(1e-5, self.scale)
        polygon = None

        ent = self._get_entity(shape_ref)
        if not ent:
            return width, depth, thickness, polygon

        reps = []
        if ent['type'] == 'IFCPRODUCTDEFINITIONSHAPE':
            rep_list = ent['args'][2] if len(ent['args']) > 2 else []
            if isinstance(rep_list, list):
                reps = rep_list
        elif ent['type'] == 'IFCSHAPEREPRESENTATION':
            reps = [shape_ref]

        for r_ref in reps:
            r_ent = self._get_entity(r_ref)
            if not r_ent or r_ent['type'] != 'IFCSHAPEREPRESENTATION':
                continue
            items = r_ent['args'][3] if len(r_ent['args']) > 3 and isinstance(r_ent['args'][3], list) else []

            for item_ref in items:
                item_ent = self._get_entity(item_ref)
                if not item_ent:
                    continue

                if item_ent['type'] == 'IFCEXTRUDEDAREASOLID':
                    eargs = item_ent['args']
                    prof_ref = eargs[0] if len(eargs) > 0 else None
                    ext_depth = float(eargs[3]) if len(eargs) > 3 and eargs[3] else 0.25
                    thickness = ext_depth

                    if prof_ref:
                        prof = self._get_entity(prof_ref)
                        if prof:
                            ptype = prof['type']
                            pargs = prof['args']
                            if ptype == 'IFCRECTANGLEPROFILEDEF':
                                xdim = float(pargs[3]) if len(pargs) > 3 and pargs[3] else 0.0
                                ydim = float(pargs[4]) if len(pargs) > 4 and pargs[4] else 0.0
                                width = xdim
                                depth = ydim
                                hx, hy = xdim / 2.0, ydim / 2.0
                                polygon = [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]]
                            elif ptype in ('IFCARBITRARYCLOSEDPROFILEDEF', 'IFCARBITRARYPROFILEDEFWITHVOIDS'):
                                outer_curve_ref = pargs[2] if len(pargs) > 2 else None
                                outer_ent = self._get_entity(outer_curve_ref)
                                if outer_ent and outer_ent['type'] == 'IFCPOLYLINE':
                                    pt_refs = outer_ent['args'][0] if len(outer_ent['args']) > 0 and isinstance(outer_ent['args'][0], list) else []
                                    pts = [self._resolve_point(pr) for pr in pt_refs]
                                    if pts:
                                        polygon = [[p[0], p[1]] for p in pts]
                                        pxs = [p[0] for p in pts]
                                        pys = [p[1] for p in pts]
                                        width = max(pxs) - min(pxs)
                                        depth = max(pys) - min(pys)
                            elif ptype == 'IFCCIRCLEPROFILEDEF':
                                rad = float(pargs[2]) if len(pargs) > 2 and pargs[2] else 1.0
                                width = rad * 2.0
                                depth = rad * 2.0

                elif item_ent['type'] in ('IFCFACETEDBREP', 'IFCSHELLBASEDSURFACEMODEL', 'IFCTRIANGULATEDFACESET'):
                    pts_found = self._find_all_cartesian_points(item_ref)
                    if pts_found:
                        pxs = [p[0] for p in pts_found]
                        pys = [p[1] for p in pts_found]
                        pzs = [p[2] for p in pts_found]
                        dx = max(pxs) - min(pxs)
                        dy = max(pys) - min(pys)
                        dz = max(pzs) - min(pzs)
                        dims = sorted([dx, dy, dz])
                        if dims[2] > 0 and dims[1] > 0:
                            thickness = dims[0] if dims[0] > 0 else 0.25
                            width = dims[2]
                            depth = dims[1]

        return width, depth, thickness, polygon

    def _extract_slabs(self):
        # استخراج البلاطات والأسقف الحقيقية فقط (IFCSLAB و IFCROOF)
        # واستبعاد عناصر الألواح IFCPLATE والقواعد IFCFOOTING لمنع ظهور أسطح وهمية تبرز خارج المبنى
        slab_eids = (
            self.entities_by_type.get('IFCSLAB', []) +
            self.entities_by_type.get('IFCROOF', [])
        )

        has_explicit_roof_slab = False
        for eid in self.entities_by_type.get('IFCSLAB', []):
            ent = self.entities.get(eid)
            if not ent:
                continue
            args = ent.get('args', [])
            p_type = str(args[8]) if len(args) > 8 and args[8] else ""
            s_name = str(args[2]).lower() if len(args) > 2 and args[2] else ""
            if 'ROOF' in p_type.upper() or 'roof' in s_name or 'سطح' in s_name:
                has_explicit_roof_slab = True
                break

        for eid in slab_eids:
            ent = self.entities[eid]
            if not ent:
                continue

            # استبعاد حاوية السقف المفككة IFCROOF إذا كانت تحوي عناصر فرعية أو توجد بلاطات سقف صريحة
            if ent['type'] == 'IFCROOF':
                if eid in self.decomposed_parents:
                    continue
                if has_explicit_roof_slab:
                    continue
            if eid in self.decomposed_parents and ent['type'] == 'IFCSLAB':
                continue

            args = ent['args']
            s_id = f"slab_{eid}"
            s_name = str(args[2]) if len(args) > 2 and args[2] else f"Slab_{eid}"
            p_type = str(args[8]) if len(args) > 8 and args[8] else "FLOOR"
            
            storey_id = self.containment.get(eid)
            if not storey_id or storey_id not in self.storeys:
                storey_id = list(self.storeys.keys())[0]
            storey_elev = self.storeys[storey_id]['elevation']
            
            placement_ref = args[5] if len(args) > 5 else None
            px, py, pz, rot = self._resolve_placement(placement_ref)
            
            base_y = (pz * self.scale) if abs(pz * self.scale - storey_elev) < 0.2 else storey_elev
            is_roof = 'ROOF' in p_type.upper() or 'roof' in s_name.lower() or ent['type'] == 'IFCROOF'
            is_base = 'BASESLAB' in p_type.upper() or 'base' in s_name.lower() or 'ground' in s_name.lower()
            
            shape_ref = args[6] if len(args) > 6 else None
            width, depth, thickness, polygon = self._resolve_slab_geometry(shape_ref)
            
            # إذا لم يتم العثور على أبعاد هندسية حقيقية للبلاطة، يتم تجاوزها تماماً بدلاً من افتراض 20x15 متر
            if width <= 0 or depth <= 0:
                continue
                
            sw = round(width * self.scale, 2)
            sd = round(depth * self.scale, 2)
            st = round(thickness * self.scale, 2) if thickness > 0 else 0.25
            
            # فحص ما إذا كانت البلاطة تمثل موقعاً عاماً أو أرضية شاسعة (Site / Terrain footprint)
            is_site = any(k in s_name.lower() for k in ['site', 'terrain', 'lot', 'plot', 'earth', 'land', 'property', 'موقع', 'ارض', 'أرض', 'محيط']) or (sw > 100 and sd > 100)

            poly_world = None
            if polygon:
                cos_r, sin_r = math.cos(rot), math.sin(rot)
                poly_world = []
                for pt in polygon:
                    wx = (px + (pt[0] * cos_r - pt[1] * sin_r)) * self.scale
                    wz = (py + (pt[0] * sin_r + pt[1] * cos_r)) * self.scale
                    poly_world.append([round(wx, 2), round(wz, 2)])

            slab_dict = {
                'id': s_id,
                'name_ar': f"موقع عام / أرضية ({s_name})" if is_site else f"بلاطة ({'السطح' if is_roof else ('الأساسات' if is_base else 'الطابق')})",
                'name_en': s_name,
                'type': 'site' if is_site else ('roof' if is_roof else ('foundation' if is_base else 'floor')),
                'is_site': is_site,
                'base_elevation': round(base_y, 2),
                'thickness': max(0.15, min(0.6, st)),
                'storey_id': storey_id,
                'bounds': {
                    'x': round(px * self.scale - sw / 2.0, 2),
                    'z': round(py * self.scale - sd / 2.0, 2),
                    'width': sw,
                    'depth': sd
                }
            }
            if poly_world and len(poly_world) >= 3:
                slab_dict['polygon'] = poly_world

            self.slabs[s_id] = slab_dict

    def _extract_columns(self):
        col_eids = self.entities_by_type.get('IFCCOLUMN', []) + self.entities_by_type.get('IFCCOLUMNSTANDARDCASE', [])
        for eid in col_eids:
            ent = self.entities[eid]
            args = ent['args']
            c_id = f"col_{eid}"
            c_name = str(args[2]) if len(args) > 2 and args[2] else f"Col_{eid}"
            
            storey_id = self.containment.get(eid)
            if not storey_id or storey_id not in self.storeys:
                storey_id = list(self.storeys.keys())[0]
            storey_elev = self.storeys[storey_id]['elevation']
            
            placement_ref = args[5] if len(args) > 5 else None
            px, py, pz, _ = self._resolve_placement(placement_ref)
            
            shape_ref = args[6] if len(args) > 6 else None
            cw, cd = 0.45, 0.45
            if shape_ref:
                _, length, thickness, _ = self._resolve_wall_geometry(shape_ref)
                if length > 0 and thickness > 0:
                    cw = round(min(length, thickness) * self.scale, 2)
                    cd = round(max(length, thickness) * self.scale, 2)
            
            base_y = (pz * self.scale) if abs(pz * self.scale - storey_elev) < 0.2 else storey_elev
            self.columns[c_id] = {
                'id': c_id,
                'name_ar': f"عمود إنشائي ({c_name})",
                'name_en': c_name,
                'position': [round(px * self.scale, 2), round(py * self.scale, 2)],
                'base_elevation': round(base_y, 2),
                'width': max(0.2, cw),
                'depth': max(0.2, cd),
                'height': self.storeys[storey_id]['height'],
                'storey_id': storey_id
            }

    def _extract_beams(self):
        beam_eids = self.entities_by_type.get('IFCBEAM', []) + self.entities_by_type.get('IFCBEAMSTANDARDCASE', [])
        for eid in beam_eids:
            ent = self.entities[eid]
            args = ent['args']
            b_id = f"beam_{eid}"
            b_name = str(args[2]) if len(args) > 2 and args[2] else f"Beam_{eid}"
            
            storey_id = self.containment.get(eid)
            if not storey_id or storey_id not in self.storeys:
                storey_id = list(self.storeys.keys())[0]
            storey_elev = self.storeys[storey_id]['elevation']
            
            placement_ref = args[5] if len(args) > 5 else None
            px, py, pz, rot = self._resolve_placement(placement_ref)
            
            shape_ref = args[6] if len(args) > 6 else None
            axis_pts, length, thickness, height = self._resolve_wall_geometry(shape_ref)
            
            if axis_pts:
                p1, p2 = axis_pts[0], axis_pts[1]
                cos_r, sin_r = math.cos(rot), math.sin(rot)
                sx = (px + (p1[0] * cos_r - p1[1] * sin_r)) * self.scale
                sz = (py + (p1[0] * sin_r + p1[1] * cos_r)) * self.scale
                ex = (px + (p2[0] * cos_r - p2[1] * sin_r)) * self.scale
                ez = (py + (p2[0] * sin_r + p2[1] * cos_r)) * self.scale
            elif length > 0:
                cos_r, sin_r = math.cos(rot), math.sin(rot)
                sx = px * self.scale
                sz = py * self.scale
                ex = (px + (length * cos_r)) * self.scale
                ez = (py + (length * sin_r)) * self.scale
            else:
                sx = px * self.scale
                sz = py * self.scale
                ex = sx + 5.0
                ez = sz
                
            beam_elev = (pz * self.scale) if abs(pz * self.scale - storey_elev) > 0.2 else storey_elev + self.storeys[storey_id]['height'] - 0.5
            
            self.beams[b_id] = {
                'id': b_id,
                'name_ar': f"جسر إنشائي ({b_name})",
                'name_en': b_name,
                'start': [round(sx, 2), round(sz, 2)],
                'end': [round(ex, 2), round(ez, 2)],
                'width': 0.35,
                'depth': 0.60,
                'elevation': round(beam_elev, 2),
                'storey_id': storey_id
            }

    def _extract_openings(self):
        door_eids = self.entities_by_type.get('IFCDOOR', []) + self.entities_by_type.get('IFCDOORSTANDARDCASE', [])
        for eid in door_eids:
            ent = self.entities[eid]
            args = ent['args']
            d_id = f"door_{eid}"
            d_name = str(args[2]) if len(args) > 2 and args[2] else f"Door_{eid}"
            
            overall_h = 2200.0
            overall_w = 900.0
            if len(args) > 9 and isinstance(args[8], (int, float)) and isinstance(args[9], (int, float)):
                overall_h = float(args[8])
                overall_w = float(args[9])
            elif len(args) > 10 and isinstance(args[9], (int, float)) and isinstance(args[10], (int, float)):
                overall_h = float(args[9])
                overall_w = float(args[10])
            elif len(args) > 8 and isinstance(args[8], (int, float)):
                overall_h = float(args[8])
            
            placement_ref = args[5] if len(args) > 5 else None
            px, py, pz, _ = self._resolve_placement(placement_ref)
            
            # 1. الربط العلائقي الدقيق أولاً (Relational IFCRELFILLSELEMENT / IFCRELVOIDSELEMENT)
            wall_eid = self.element_to_wall.get(eid)
            if not wall_eid and eid in self.rel_voids:
                wall_eid = self.rel_voids[eid]
            wall_id = f"wall_{wall_eid}" if wall_eid and f"wall_{wall_eid}" in self.walls else None
            
            # 2. فحص القرب الهندسي في حال عدم توفر الربط الصريح
            if not wall_id:
                target_wall = self._find_closest_wall(px * self.scale, py * self.scale)
                wall_id = target_wall['id'] if target_wall else None
                
            pos_x = round(px * self.scale, 2)
            pos_z = round(py * self.scale, 2)
            # إذا كانت الإحداثيات عند نقطة الأصل وكان الجدار معلوماً، نضع الفتحة في منتصف الجدار
            if abs(pos_x) < 0.01 and abs(pos_z) < 0.01 and wall_id and wall_id in self.walls:
                hw = self.walls[wall_id]
                pos_x = round((hw['start'][0] + hw['end'][0]) / 2.0, 2)
                pos_z = round((hw['start'][1] + hw['end'][1]) / 2.0, 2)
            
            self.openings[d_id] = {
                'id': d_id,
                'name_ar': f"باب ({d_name})",
                'name_en': d_name,
                'type': 'door',
                'wall_id': wall_id,
                'position': [pos_x, pos_z],
                'width': round(max(0.8, overall_w * self.scale), 2),
                'height': round(max(2.0, overall_h * self.scale), 2)
            }

        win_eids = self.entities_by_type.get('IFCWINDOW', []) + self.entities_by_type.get('IFCWINDOWSTANDARDCASE', [])
        for eid in win_eids:
            ent = self.entities[eid]
            args = ent['args']
            w_id = f"win_{eid}"
            w_name = str(args[2]) if len(args) > 2 and args[2] else f"Win_{eid}"
            
            overall_h = 1500.0
            overall_w = 1200.0
            if len(args) > 9 and isinstance(args[8], (int, float)) and isinstance(args[9], (int, float)):
                overall_h = float(args[8])
                overall_w = float(args[9])
            elif len(args) > 10 and isinstance(args[9], (int, float)) and isinstance(args[10], (int, float)):
                overall_h = float(args[9])
                overall_w = float(args[10])
            elif len(args) > 8 and isinstance(args[8], (int, float)):
                overall_h = float(args[8])
            
            placement_ref = args[5] if len(args) > 5 else None
            px, py, pz, _ = self._resolve_placement(placement_ref)
            
            wall_eid = self.element_to_wall.get(eid)
            if not wall_eid and eid in self.rel_voids:
                wall_eid = self.rel_voids[eid]
            wall_id = f"wall_{wall_eid}" if wall_eid and f"wall_{wall_eid}" in self.walls else None
            
            if not wall_id:
                target_wall = self._find_closest_wall(px * self.scale, py * self.scale)
                wall_id = target_wall['id'] if target_wall else None
                
            pos_x = round(px * self.scale, 2)
            pos_z = round(py * self.scale, 2)
            if abs(pos_x) < 0.01 and abs(pos_z) < 0.01 and wall_id and wall_id in self.walls:
                hw = self.walls[wall_id]
                pos_x = round((hw['start'][0] + hw['end'][0]) / 2.0, 2)
                pos_z = round((hw['start'][1] + hw['end'][1]) / 2.0, 2)
            
            self.openings[w_id] = {
                'id': w_id,
                'name_ar': f"نافذة ({w_name})",
                'name_en': w_name,
                'type': 'window',
                'wall_id': wall_id,
                'position': [pos_x, pos_z],
                'width': round(max(0.9, overall_w * self.scale), 2),
                'height': round(max(1.0, overall_h * self.scale), 2),
                'sill_height': 0.9
            }

    def _find_closest_wall(self, x: float, z: float, max_dist: float = 5.0):
        best_w = None
        best_d = float('inf')
        for w in self.walls.values():
            s, e = w['start'], w['end']
            dx, dz = e[0] - s[0], e[1] - s[1]
            l2 = dx * dx + dz * dz
            if l2 == 0:
                dist = math.hypot(x - s[0], z - s[1])
            else:
                t = max(0.0, min(1.0, ((x - s[0]) * dx + (z - s[1]) * dz) / l2))
                px, pz = s[0] + t * dx, s[1] + t * dz
                dist = math.hypot(x - px, z - pz)
            if dist < best_d:
                best_d = dist
                best_w = w
        return best_w if best_d <= max_dist else None

    def _extract_stairs(self):
        stair_eids = self.entities_by_type.get('IFCSTAIR', []) + self.entities_by_type.get('IFCSTAIRFLIGHT', [])
        for eid in stair_eids:
            ent = self.entities[eid]
            args = ent['args']
            s_id = f"stair_{eid}"
            s_name = str(args[2]) if len(args) > 2 and args[2] else f"Stair_{eid}"
            placement_ref = args[5] if len(args) > 5 else None
            px, py, pz, rot = self._resolve_placement(placement_ref)
            
            self.stairs[s_id] = {
                'id': s_id,
                'name_ar': f"سلم معماري ({s_name})",
                'name_en': s_name,
                'position': [round(px * self.scale, 2), round(py * self.scale, 2)],
                'width': 2.4,
                'depth': 4.8,
                'height': 3.5,
                'num_steps': 18,
                'rotation': round(math.degrees(rot), 1),
                'landing_pos': [round(px * self.scale, 2), round((py * self.scale) + 2.4, 2)],
                'connects_storeys': list(self.storeys.keys())[:2]
            }

    def _extract_spaces(self):
        space_eids = self.entities_by_type.get('IFCSPACE', [])
        found_spaces = []
        for eid in space_eids:
            ent = self.entities[eid]
            args = ent['args']
            guid = str(args[0]) if len(args) > 0 and args[0] else f"sp_{eid}"
            name = str(args[2]) if len(args) > 2 and args[2] else f"Space_{eid}"
            desc = str(args[3]) if len(args) > 3 and args[3] else ""
            found_spaces.append((guid, name, desc, eid))
            
        if found_spaces:
            for idx, item in enumerate(found_spaces):
                guid, s_name, s_desc, eid = item
                s_id = f"ifc_sp_{idx+1}"
                storey_id = self.containment.get(eid)
                if not storey_id or storey_id not in self.storeys:
                    storey_id = list(self.storeys.keys())[0]
                elev = self.storeys[storey_id]['elevation']
                
                display_name = f"{s_desc} ({s_name})" if s_name.isdigit() and s_desc else s_name
                nl = display_name.lower()
                if any(k in nl for k in ['corridor', 'hallway', 'ممر', 'circulation']):
                    stype = 'circulation'
                    w, d, a = 30.0, 3.5, 75.0
                elif any(k in nl for k in ['waiting', 'انتظار', 'reception', 'lobby', 'استقبال']):
                    stype = 'public'
                    w, d, a = 12.0, 9.0, 60.0
                elif any(k in nl for k in ['meeting', 'conference', 'اجتماع', 'مرن']):
                    stype = 'flexible'
                    w, d, a = 11.0, 9.0, 55.0
                elif any(k in nl for k in ['lounge', 'break', 'استراحة', 'خدمات']):
                    stype = 'amenity'
                    w, d, a = 10.0, 8.0, 45.0
                else:
                    stype = 'workspace'
                    w, d, a = 14.0, 10.0, 80.0
                    
                if idx < len(self.extracted_areas) and self.extracted_areas[idx] > 5:
                    a = self.extracted_areas[idx]
                    
                # استخراج إحداثيات الفضاء الحقيقية من placement_ref إن وجدت
                ent = self.entities[eid]
                placement_ref = ent['args'][5] if len(ent['args']) > 5 else None
                sp_x, sp_y, _, _ = self._resolve_placement(placement_ref)
                
                has_placement = (abs(sp_x) > 0.01 or abs(sp_y) > 0.01)
                if has_placement:
                    px = round((sp_x * self.scale) - (w / 2.0), 2)
                    pz = round((sp_y * self.scale) - (d / 2.0), 2)
                else:
                    has_real_arch = bool(self.walls or self.slabs)
                    if has_real_arch:
                        px = 0.0
                        pz = 0.0
                    else:
                        cols = 2
                        row = idx // cols
                        col = idx % cols
                        px = -15.0 + col * 16.0
                        pz = -12.0 + row * 14.0
                
                self.spaces[s_id] = {
                    'id': s_id,
                    'name_ar': display_name,
                    'name_en': s_name,
                    'type': stype,
                    'capacity': max(2, int(a / 3.2)),
                    'area_m2': round(a, 1),
                    'bounds': {'x': px, 'z': pz, 'width': w, 'depth': d, 'height': self.storeys[storey_id]['height']},
                    'base_elevation': elev,
                    'storey_id': storey_id,
                    'is_fallback': not has_placement,
                    'color': "#00b894" if stype == "public" else ("#0984e3" if stype == "workspace" else "#7ed321")
                }
        else:
            self.spaces = {}

    def _build_model_dict(self) -> Dict[str, Any]:
                
        if not self.walls:
            from backend.plan_importer import PlanImporter
            gen_walls, gen_openings = PlanImporter.generate_architectural_envelope(self.spaces, {})
            self.walls = gen_walls
            if not self.openings:
                self.openings = gen_openings

        edges = []
        space_keys = list(self.spaces.keys())
        for i in range(len(space_keys) - 1):
            edges.append({
                "u": space_keys[i],
                "v": space_keys[i+1],
                "distance": 5.0,
                "width": 2.2,
                "status": "active"
            })

        return {
            "id": "imported_ifc_bim",
            "name_ar": f"نموذج BIM مستورد: {self.building_name}",
            "name_en": f"BIM Model: {self.project_name}",
            "building_type": "imported_bim",
            "storeys": self.storeys,
            "slabs": self.slabs,
            "columns": self.columns,
            "beams": self.beams,
            "walls": self.walls,
            "openings": self.openings,
            "stairs": self.stairs,
            "spaces": self.spaces,
            "partitions": {},
            "edges": edges
        }


class PlanImporter:
    @staticmethod
    def list_presets(presets_dir: str) -> List[Dict[str, Any]]:
        """قراءة قائمة دراسات الحالة المعمارية الجاهزة"""
        presets = []
        if os.path.exists(presets_dir):
            for filename in sorted(os.listdir(presets_dir)):
                if filename.endswith(".json"):
                    filepath = os.path.join(presets_dir, filename)
                    try:
                        with open(filepath, "r", encoding="utf-8") as f:
                            data = json.load(f)
                            presets.append({
                                "id": data.get("id", filename.replace(".json", "")),
                                "name_ar": data.get("name_ar", filename),
                                "name_en": data.get("name_en", filename),
                                "building_type": data.get("building_type", "general"),
                                "spaces_count": len(data.get("spaces", {})),
                                "partitions_count": len(data.get("partitions", {})),
                                "filename": filename
                            })
                    except Exception as e:
                        print(f"Error reading preset {filename}: {e}")
        
        if not presets:
            presets = [
                {
                    "id": "administrative_office",
                    "name_ar": "المبنى الإداري النموذجي (Case Study 1)",
                    "name_en": "Standard Administrative Office Building",
                    "building_type": "administrative",
                    "spaces_count": 9,
                    "partitions_count": 2
                },
                {
                    "id": "healthcare_clinic",
                    "name_ar": "مجمع الرعاية الصحية والعيادات الاستشارية (Case Study 2)",
                    "name_en": "Healthcare & Outpatient Consulting Center",
                    "building_type": "healthcare",
                    "spaces_count": 9,
                    "partitions_count": 1
                },
                {
                    "id": "public_service_center",
                    "name_ar": "دائرة الأحوال والخدمات العامة (Case Study 3)",
                    "name_en": "Civil Affairs & Public Citizen Services",
                    "building_type": "government_service",
                    "spaces_count": 9,
                    "partitions_count": 1
                }
            ]
        return presets

    @staticmethod
    def load_preset(presets_dir: str, preset_id: str) -> Optional[Dict[str, Any]]:
        """تحميل دراسة حالة محددة بالمعرّف"""
        target_file = os.path.join(presets_dir, f"{preset_id}.json")
        if os.path.exists(target_file):
            with open(target_file, "r", encoding="utf-8") as f:
                return json.load(f)
        return None

    @staticmethod
    def center_model_dict(model: Dict[str, Any]) -> Dict[str, Any]:
        """
        توسيط وتصفير إحداثيات النموذج المعماري هندسياً في منتصف الشبكة المحورية (Origin 0, 0).
        يقوم بحساب مركز الثقل والحدود الهندسية القصوى (Bounding Box Centroid)
        لكافة الجدران، البلاطات، الأعمدة، الفضاءات، السلالم، والفتحات،
        ونقلها بدقة ليكون مركز المبنى مطابقاً تماماً لنقطة الأصل (X=0, Z=0).
        """
        xs: List[float] = []
        zs: List[float] = []

        walls = model.get("walls", {})
        for w in walls.values():
            if "start" in w and len(w["start"]) >= 2:
                xs.append(float(w["start"][0]))
                zs.append(float(w["start"][1]))
            if "end" in w and len(w["end"]) >= 2:
                xs.append(float(w["end"][0]))
                zs.append(float(w["end"][1]))

        slabs = model.get("slabs", {})
        for s in slabs.values():
            if "bounds" in s and isinstance(s["bounds"], dict):
                b = s["bounds"]
                bx = float(b.get("x", 0))
                bz = float(b.get("z", 0))
                bw = float(b.get("width", 0))
                bd = float(b.get("depth", 0))
                xs.extend([bx, bx + bw])
                zs.extend([bz, bz + bd])
            if "polygon" in s and isinstance(s["polygon"], list):
                for pt in s["polygon"]:
                    if len(pt) >= 2:
                        xs.append(float(pt[0]))
                        zs.append(float(pt[1]))

        columns = model.get("columns", {})
        for c in columns.values():
            pos = c.get("position", [0, 0])
            if len(pos) >= 2:
                xs.append(float(pos[0]))
                zs.append(float(pos[1]))

        beams = model.get("beams", {})
        for b in beams.values():
            if "start" in b and len(b["start"]) >= 2:
                xs.append(float(b["start"][0]))
                zs.append(float(b["start"][1]))
            if "end" in b and len(b["end"]) >= 2:
                xs.append(float(b["end"][0]))
                zs.append(float(b["end"][1]))
            elif "position" in b and len(b["position"]) >= 2:
                xs.append(float(b["position"][0]))
                zs.append(float(b["position"][1]))

        stairs = model.get("stairs", {})
        for st in stairs.values():
            pos = st.get("position", [0, 0])
            if len(pos) >= 2:
                xs.append(float(pos[0]))
                zs.append(float(pos[1]))
            lpos = st.get("landing_pos")
            if lpos and len(lpos) >= 2:
                xs.append(float(lpos[0]))
                zs.append(float(lpos[1]))

        spaces = model.get("spaces", {})
        has_real_arch = bool(walls or slabs or columns)
        for sp in spaces.values():
            if has_real_arch and sp.get("is_fallback"):
                continue

            if "bounds" in sp and isinstance(sp["bounds"], dict):
                b = sp["bounds"]
                bx = float(b.get("x", 0))
                bz = float(b.get("z", 0))
                bw = float(b.get("width", 0))
                bd = float(b.get("depth", 0))
                xs.extend([bx, bx + bw])
                zs.extend([bz, bz + bd])
            if "polygon" in sp and isinstance(sp["polygon"], list):
                for pt in sp["polygon"]:
                    if len(pt) >= 2:
                        xs.append(float(pt[0]))
                        zs.append(float(pt[1]))

        if not xs or not zs:
            return model

        min_x, max_x = min(xs), max(xs)
        min_z, max_z = min(zs), max(zs)
        cx = round((min_x + max_x) / 2.0, 3)
        cz = round((min_z + max_z) / 2.0, 3)

        # إذا كان المركز بالفعل عند (0, 0) لا داعي للتعديل
        if abs(cx) < 0.01 and abs(cz) < 0.01:
            return model

        # إزاحة الجدران
        for w in walls.values():
            if "start" in w and len(w["start"]) >= 2:
                w["start"] = [round(w["start"][0] - cx, 2), round(w["start"][1] - cz, 2)]
            if "end" in w and len(w["end"]) >= 2:
                w["end"] = [round(w["end"][0] - cx, 2), round(w["end"][1] - cz, 2)]

        # إزاحة البلاطات
        for s in slabs.values():
            if "bounds" in s and isinstance(s["bounds"], dict):
                s["bounds"]["x"] = round(s["bounds"]["x"] - cx, 2)
                s["bounds"]["z"] = round(s["bounds"]["z"] - cz, 2)
            if "polygon" in s and isinstance(s["polygon"], list):
                s["polygon"] = [[round(pt[0] - cx, 2), round(pt[1] - cz, 2)] for pt in s["polygon"]]

        # إزاحة الأعمدة
        for c in columns.values():
            if "position" in c and len(c["position"]) >= 2:
                c["position"] = [round(c["position"][0] - cx, 2), round(c["position"][1] - cz, 2)]

        # إزاحة الجسور الإنشائية
        for b in beams.values():
            if "start" in b and len(b["start"]) >= 2:
                b["start"] = [round(b["start"][0] - cx, 2), round(b["start"][1] - cz, 2)]
            if "end" in b and len(b["end"]) >= 2:
                b["end"] = [round(b["end"][0] - cx, 2), round(b["end"][1] - cz, 2)]
            elif "position" in b and len(b["position"]) >= 2:
                b["position"] = [round(b["position"][0] - cx, 2), round(b["position"][1] - cz, 2)]

        # إزاحة السلالم
        for st in stairs.values():
            if "position" in st and len(st["position"]) >= 2:
                st["position"] = [round(st["position"][0] - cx, 2), round(st["position"][1] - cz, 2)]
            if "landing_pos" in st and len(st["landing_pos"]) >= 2:
                st["landing_pos"] = [round(st["landing_pos"][0] - cx, 2), round(st["landing_pos"][1] - cz, 2)]

        # إزاحة الفتحات (أبواب وشبابيك)
        openings = model.get("openings", {})
        for op in openings.values():
            if "position" in op and len(op["position"]) >= 2:
                op["position"] = [round(op["position"][0] - cx, 2), round(op["position"][1] - cz, 2)]

        # إزاحة الفضاءات
        for sp in spaces.values():
            if "bounds" in sp and isinstance(sp["bounds"], dict):
                sp["bounds"]["x"] = round(sp["bounds"]["x"] - cx, 2)
                sp["bounds"]["z"] = round(sp["bounds"]["z"] - cz, 2)
            if "centroid" in sp and len(sp["centroid"]) >= 2:
                sp["centroid"] = [round(sp["centroid"][0] - cx, 2), round(sp["centroid"][1] - cz, 2)]
            if "polygon" in sp and isinstance(sp["polygon"], list):
                sp["polygon"] = [[round(pt[0] - cx, 2), round(pt[1] - cz, 2)] for pt in sp["polygon"]]

        # إزاحة القواطع
        partitions = model.get("partitions", {})
        for p in partitions.values():
            if "position" in p and isinstance(p["position"], dict):
                if "x" in p["position"]:
                    p["position"]["x"] = round(p["position"]["x"] - cx, 2)
                if "z" in p["position"]:
                    p["position"]["z"] = round(p["position"]["z"] - cz, 2)

        return model

    @staticmethod
    def parse_ifc(ifc_content: str) -> Dict[str, Any]:
        """
        محلل ملفات BIM IFC (ISO 10303-21 STEP) الصادرة من Revit و ArchiCAD.
        يستخرج كافة الطوابق والمناسيب الحقيقية، الجدران، البلاطات، الأعمدة، السلالم، الفضاءات، والفتحات.
        """
        parser = IFCStepParser(ifc_content)
        return parser.parse()

    @staticmethod
    def parse_pdf(pdf_bytes_or_content: Any) -> Dict[str, Any]:
        """
        محلل مخططات البناء بصيغة PDF (Architectural Floor Plan PDF).
        يستخرج النصوص المعمارية، طبقات الفضاءات، والمخطط الهندسي.
        """
        # تحويل المحتوى إلى نص إذا كان مدخلاً كنص أو فك تشفيره
        if isinstance(pdf_bytes_or_content, str):
            # فحص إن كان Base64
            if "base64," in pdf_bytes_or_content:
                pdf_bytes_or_content = base64.b64decode(pdf_bytes_or_content.split("base64,")[1])
            else:
                pdf_bytes_or_content = pdf_bytes_or_content.encode("latin1", errors="ignore")

        raw_str = pdf_bytes_or_content.decode("latin1", errors="ignore")

        # 1. استخراج النصوص من داخل تيارات الـ PDF (Text streams: (...) Tj or [...] TJ)
        text_tokens = re.findall(r"\(([^)]+)\)\s*Tj", raw_str)
        tj_tokens = re.findall(r"\[([^\]]+)\]\s*TJ", raw_str)
        for tj in tj_tokens:
            sub_tokens = re.findall(r"\(([^)]+)\)", tj)
            text_tokens.extend(sub_tokens)

        # تنظيف وتصفية الكلمات المعمارية المفيدة
        detected_rooms = []
        architectural_keywords = [
            "غرفة", "صالة", "مكتب", "استقبال", "ممر", "انتظار", "قاعة", "عيادة", "مختبر",
            "طوارئ", "استراحة", "خدمات", "مستودع", "أرشيف", "كاونتر",
            "room", "office", "hall", "lobby", "waiting", "reception", "corridor",
            "clinic", "meeting", "conference", "lounge", "station", "entry", "exit"
        ]

        for token in text_tokens:
            clean = token.strip()
            clean_lower = clean.lower()
            if len(clean) >= 3 and any(kw in clean_lower for kw in architectural_keywords):
                if clean not in detected_rooms:
                    detected_rooms.append(clean)

        # إذا لم يتم اكتشاف أسماء نصية صريحة في الـ PDF، نولد فضاءات هندسية قياسية من المخطط
        if len(detected_rooms) < 3:
            detected_rooms = [
                "صالة الاستقبال والمدخل الرئيسي",
                "صالة انتظار المراجعين المركزية",
                "قاعة الاجتماعات والخدمات المرنة",
                "مكاتب الموظفين وإدارة المعاملات",
                "شريان الحركة والممرات العامة",
                "استراحة الموظفين والخدمات المساندة"
            ]

        spaces = {}
        partitions = {}
        edges = []

        grid_cols = 3
        spacing_x = 15.0
        spacing_z = 12.0
        start_x = -15.0
        start_z = -12.0

        for idx, r_name in enumerate(detected_rooms):
            name_lower = r_name.lower()
            if any(k in name_lower for k in ["corridor", "ممر", "شريان"]):
                s_type = "circulation"
                area = 65.0
                w, d = 36.0, 3.5
            elif any(k in name_lower for k in ["waiting", "انتظار", "استقبال", "reception", "lobby"]):
                s_type = "public"
                area = 70.0
                w, d = 13.0, 9.0
            elif any(k in name_lower for k in ["meeting", "مرن", "اجتماع", "conference"]):
                s_type = "flexible"
                area = 55.0
                w, d = 11.0, 9.0
            else:
                s_type = "workspace"
                area = 85.0
                w, d = 14.0, 10.0

            cap = max(3, int(area / 3.0))
            row = idx // grid_cols
            col = idx % grid_cols
            pos_x = start_x + (col * spacing_x)
            pos_z = start_z + (row * spacing_z)

            room_id = f"pdf_space_{idx+1}"
            spaces[room_id] = {
                "id": room_id,
                "name_ar": r_name,
                "name_en": f"PDF Zone {idx+1}",
                "type": s_type,
                "capacity": cap,
                "area_m2": area,
                "bounds": {
                    "x": round(pos_x, 1),
                    "z": round(pos_z, 1),
                    "width": w,
                    "depth": d,
                    "height": 3.5
                },
                "color": "#e17055" if s_type == "public" else ("#00b894" if s_type == "workspace" else "#0984e3")
            }

        # إضافة قاطع مرن تكيفي
        public_spaces = [sid for sid, s in spaces.items() if s["type"] in ["public", "flexible"]]
        if len(public_spaces) >= 2:
            r1, r2 = public_spaces[0], public_spaces[1]
            p_pos = spaces[r1]["bounds"]
            partitions["p_pdf_wall"] = {
                "id": "p_pdf_wall",
                "name_ar": f"قاطع مرن مستورد بين ({spaces[r1]['name_ar']})",
                "between": [r1, r2],
                "status": "closed",
                "position": {
                    "x": round(p_pos["x"] + p_pos["width"], 1),
                    "z": p_pos["z"],
                    "width": 0.25,
                    "depth": p_pos["depth"],
                    "height": 3.5
                },
                "expansion_capacity": 18
            }

        keys = list(spaces.keys())
        for i in range(len(keys) - 1):
            edges.append({
                "u": keys[i],
                "v": keys[i+1],
                "distance": 6.0,
                "width": 2.2,
                "status": "active"
            })

        walls, openings = PlanImporter.generate_architectural_envelope(spaces, partitions)
        model = {
            "id": "imported_pdf_plan",
            "name_ar": "مخطط معماري مستورد من ملف PDF",
            "name_en": "Imported Architectural PDF Plan",
            "building_type": "imported_pdf",
            "spaces": spaces,
            "partitions": partitions,
            "edges": edges,
            "walls": walls,
            "openings": openings
        }
        return PlanImporter.center_model_dict(model)

    @staticmethod
    def parse_dxf(dxf_content: str) -> Dict[str, Any]:
        """محلل ملفات AutoCAD DXF"""
        lines = [line.strip() for line in dxf_content.splitlines()]
        polylines = []
        texts = []

        i = 0
        in_entities = False
        while i < len(lines):
            code = lines[i]
            val = lines[i + 1] if i + 1 < len(lines) else ""

            if code == "2" and val == "ENTITIES":
                in_entities = True
                i += 2
                continue

            if code == "0" and val == "ENDSEC" and in_entities:
                break

            if in_entities:
                if code == "0" and val == "LWPOLYLINE":
                    i += 2
                    verts = []
                    layer = "default"
                    while i < len(lines) and lines[i] != "0":
                        if lines[i] == "8":
                            layer = lines[i + 1]
                            i += 2
                        elif lines[i] == "10":
                            vx = float(lines[i + 1])
                            vy = float(lines[i + 3]) if i + 3 < len(lines) and lines[i + 2] == "20" else 0.0
                            verts.append((vx, vy))
                            i += 4
                        else:
                            i += 2
                    if len(verts) >= 3:
                        polylines.append({"layer": layer, "verts": verts})
                    continue

                elif code == "0" and (val == "TEXT" or val == "MTEXT"):
                    i += 2
                    txt_val = ""
                    tx, ty = 0.0, 0.0
                    while i < len(lines) and lines[i] != "0":
                        if lines[i] == "1":
                            txt_val = lines[i + 1]
                            i += 2
                        elif lines[i] == "10":
                            tx = float(lines[i + 1])
                            i += 2
                        elif lines[i] == "20":
                            ty = float(lines[i + 1])
                            i += 2
                        else:
                            i += 2
                    if txt_val:
                        texts.append({"text": txt_val, "x": tx, "y": ty})
                    continue

            i += 2

        spaces = {}
        partitions = {}
        edges = []

        if not polylines:
            if not texts:
                texts = [{"text": "صالة رئيسية", "x": 0, "y": 0}, {"text": "مكاتب إدارية", "x": 15, "y": 0}, {"text": "ممر حركة", "x": 30, "y": 0}]
            for idx, t in enumerate(texts):
                room_id = f"room_{idx+1}"
                spaces[room_id] = {
                    "id": room_id,
                    "name_ar": t["text"],
                    "name_en": f"Zone {idx+1}",
                    "type": "public" if idx < 2 else "workspace",
                    "capacity": 20,
                    "area_m2": 60.0,
                    "bounds": {"x": (idx * 14) - 20, "z": -10, "width": 12, "depth": 8, "height": 3.5},
                    "color": "#0984e3"
                }
        else:
            for idx, poly in enumerate(polylines):
                verts = poly["verts"]
                xs = [v[0] for v in verts]
                ys = [v[1] for v in verts]
                min_x, max_x = min(xs), max(xs)
                min_y, max_y = min(ys), max(ys)
                width = max(3.0, max_x - min_x)
                depth = max(3.0, max_y - min_y)

                room_name = f"فضاء معماري {idx+1}"
                for t in texts:
                    if min_x <= t["x"] <= max_x and min_y <= t["y"] <= max_y:
                        room_name = t["text"]
                        break

                area = round(width * depth, 1)
                cap = max(2, int(area / 3.2))
                room_id = f"dxf_room_{idx+1}"

                spaces[room_id] = {
                    "id": room_id,
                    "name_ar": room_name,
                    "name_en": f"Space {idx+1}",
                    "type": "circulation" if width > 20 or depth > 20 else ("public" if idx == 0 else "workspace"),
                    "capacity": cap,
                    "area_m2": area,
                    "bounds": {
                        "x": round(min_x, 1),
                        "z": round(min_y, 1),
                        "width": round(width, 1),
                        "depth": round(depth, 1),
                        "height": 3.5
                    },
                    "color": "#00b894" if idx % 2 == 0 else "#0984e3"
                }

        space_keys = list(spaces.keys())
        for i in range(len(space_keys) - 1):
            edges.append({
                "u": space_keys[i],
                "v": space_keys[i + 1],
                "distance": 6.0,
                "width": 2.0,
                "status": "active"
            })

        walls, openings = PlanImporter.generate_architectural_envelope(spaces, partitions)
        model = {
            "id": "imported_dxf_model",
            "name_ar": "مخطط أوتوكاد مستورد (AutoCAD DXF)",
            "name_en": "Imported AutoCAD Floor Plan",
            "building_type": "imported_cad",
            "spaces": spaces,
            "partitions": partitions,
            "edges": edges,
            "walls": walls,
            "openings": openings
        }
        return PlanImporter.center_model_dict(model)

    @staticmethod
    def generate_architectural_envelope(spaces: Dict[str, Any], partitions: Optional[Dict[str, Any]] = None) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """توليد الجدران المعمارية وفتحات الأبواب والشبابيك المتوافقة مع الفضاءات"""
        walls = {}
        openings = {}

        for sid, s in spaces.items():
            b = s.get("bounds", {"x": 0, "z": 0, "width": 10, "depth": 8})
            bx = float(b.get("x", 0))
            bz = float(b.get("z", 0))
            bw = float(b.get("width", 10))
            bd = float(b.get("depth", 8))

            wn = f"w_{sid}_n"
            ws = f"w_{sid}_s"
            ww = f"w_{sid}_w"
            we = f"w_{sid}_e"

            walls[wn] = {"id": wn, "name_ar": f"جدار شمالي ({s.get('name_ar', sid)})", "start": [round(bx, 1), round(bz, 1)], "end": [round(bx + bw, 1), round(bz, 1)], "thickness": 0.25, "height": 3.0, "type": "exterior"}
            walls[ws] = {"id": ws, "name_ar": f"جدار جنوبي ({s.get('name_ar', sid)})", "start": [round(bx, 1), round(bz + bd, 1)], "end": [round(bx + bw, 1), round(bz + bd, 1)], "thickness": 0.25, "height": 3.0, "type": "interior"}
            walls[ww] = {"id": ww, "name_ar": f"جدار غربي ({s.get('name_ar', sid)})", "start": [round(bx, 1), round(bz, 1)], "end": [round(bx, 1), round(bz + bd, 1)], "thickness": 0.25, "height": 3.0, "type": "interior"}
            walls[we] = {"id": we, "name_ar": f"جدار شرقي ({s.get('name_ar', sid)})", "start": [round(bx + bw, 1), round(bz, 1)], "end": [round(bx + bw, 1), round(bz + bd, 1)], "thickness": 0.25, "height": 3.0, "type": "interior"}

            # فتحة باب في الجدار الجنوبي
            d_id = f"door_{sid}"
            openings[d_id] = {
                "id": d_id,
                "name_ar": f"باب ({s.get('name_ar', sid)})",
                "type": "door",
                "wall_id": ws,
                "position": [round(bx + (bw * 0.5), 1), round(bz + bd, 1)],
                "width": 1.2,
                "height": 2.2,
                "connects": [sid, "circulation"],
                "flow_capacity_per_min": 40
            }

            # فتحة نافذة زجاجية في الجدار الشمالي
            win_id = f"win_{sid}"
            openings[win_id] = {
                "id": win_id,
                "name_ar": f"نافذة ({s.get('name_ar', sid)})",
                "type": "window",
                "wall_id": wn,
                "position": [round(bx + (bw * 0.5), 1), round(bz, 1)],
                "width": max(1.5, round(bw * 0.4, 1)),
                "height": 1.5,
                "sill_height": 0.9
            }

        return walls, openings

    @staticmethod
    def validate_and_normalize_json(data: Dict[str, Any]) -> Dict[str, Any]:
        """التحقق من صحة وتنسيق المخطط الفراغي والمعماري JSON"""
        if "spaces" not in data or not isinstance(data["spaces"], dict):
            raise ValueError("ملف المخطط يجب أن يحتوي على كائن 'spaces' للفضاءات المعمارية.")

        normalized = {
            "id": data.get("id", "custom_building"),
            "name_ar": data.get("name_ar", "مبنى معماري مخصص"),
            "name_en": data.get("name_en", "Custom Architectural Building"),
            "building_type": data.get("building_type", "custom"),
            "storeys": dict(data.get("storeys", {})),
            "slabs": dict(data.get("slabs", {})),
            "columns": dict(data.get("columns", {})),
            "beams": dict(data.get("beams", {})),
            "stairs": dict(data.get("stairs", {})),
            "spaces": {},
            "partitions": data.get("partitions", {}),
            "edges": data.get("edges", []),
            "walls": dict(data.get("walls", {})),
            "openings": dict(data.get("openings", {}))
        }

        default_x = -15
        for s_id, s in data["spaces"].items():
            area = float(s.get("area_m2", 50.0))
            cap = int(s.get("capacity", max(1, int(area / 3.0))))
            bounds = s.get("bounds", {
                "x": default_x,
                "z": -10,
                "width": 10,
                "depth": 8,
                "height": 3.5
            })
            default_x += bounds.get("width", 10) + 2

            normalized["spaces"][s_id] = {
                "id": s_id,
                "name_ar": s.get("name_ar", s_id),
                "name_en": s.get("name_en", s_id),
                "type": s.get("type", "public"),
                "capacity": cap,
                "area_m2": area,
                "bounds": bounds,
                "color": s.get("color", "#0984e3")
            }

        # إذا لم يحتوي الملف على جدران وأبواب صريحة، نولد الغلاف المعماري تلقائياً
        if not normalized["walls"]:
            gen_walls, gen_openings = PlanImporter.generate_architectural_envelope(normalized["spaces"], normalized["partitions"])
            normalized["walls"] = gen_walls
            if not normalized["openings"]:
                normalized["openings"] = gen_openings

        return PlanImporter.center_model_dict(normalized)
