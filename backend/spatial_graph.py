# backend/spatial_graph.py
"""
Spatial Graph Model for Administrative & Multi-Typology Building Case Studies.
Represents architectural spaces (Nodes), circulation paths (Edges),
and dynamic physical elements (Movable Partitions).
Supports dynamic loading, updates, and custom plan imports.
"""

import math
from typing import Dict, List, Any, Optional

class SpatialBuildingModel:
    def __init__(self, initial_data: Optional[Dict[str, Any]] = None):
        self.model_id = "administrative_office"
        self.name_ar = "المبنى الإداري النموذجي"
        self.name_en = "Standard Administrative Office"
        self.building_type = "administrative"
        self.spaces: Dict[str, Dict[str, Any]] = {}
        self.partitions: Dict[str, Dict[str, Any]] = {}
        self.edges: List[Dict[str, Any]] = []
        self.walls: Dict[str, Dict[str, Any]] = {}
        self.openings: Dict[str, Dict[str, Any]] = {}
        self.stairs: Dict[str, Dict[str, Any]] = {}
        self.storeys: Dict[str, Dict[str, Any]] = {}
        self.slabs: Dict[str, Dict[str, Any]] = {}
        self.columns: Dict[str, Dict[str, Any]] = {}
        self.beams: Dict[str, Dict[str, Any]] = {}

        if initial_data:
            self.load_from_dict(initial_data)
        else:
            self.load_default_office()

    def load_default_office(self):
        """تحميل المخطط الافتراضي للمبنى الإداري"""
        self.model_id = "administrative_office"
        self.name_ar = "المبنى الإداري النموذجي (Case Study 1)"
        self.name_en = "Administrative Office Building"
        self.building_type = "administrative"

        self.spaces = {
            "reception": {
                "id": "reception",
                "name_ar": "ردهة الاستقبال الرئيسية",
                "name_en": "Main Reception Lobby",
                "type": "public",
                "capacity": 15,
                "area_m2": 48.0,
                "bounds": {"x": -18, "z": -14, "width": 12, "depth": 8, "height": 3.5},
                "color": "#4a90e2"
            },
            "waiting_hall": {
                "id": "waiting_hall",
                "name_ar": "صالة انتظار المراجعين",
                "name_en": "Public Waiting Hall",
                "type": "public",
                "capacity": 22,
                "area_m2": 66.0,
                "bounds": {"x": -6, "z": -14, "width": 14, "depth": 8, "height": 3.5},
                "color": "#f5a623"
            },
            "multi_hall_a": {
                "id": "multi_hall_a",
                "name_ar": "القاعة المتعددة المرنة (أ)",
                "name_en": "Multipurpose Hall A (Flexible)",
                "type": "flexible",
                "capacity": 20,
                "area_m2": 60.0,
                "bounds": {"x": 8, "z": -14, "width": 10, "depth": 8, "height": 3.5},
                "color": "#7ed321"
            },
            "multi_hall_b": {
                "id": "multi_hall_b",
                "name_ar": "قاعة الاجتماعات والتدريب (ب)",
                "name_en": "Meeting & Training Hall B",
                "type": "flexible",
                "capacity": 20,
                "area_m2": 60.0,
                "bounds": {"x": 18, "z": -14, "width": 10, "depth": 8, "height": 3.5},
                "color": "#9013fe"
            },
            "corridor_central": {
                "id": "corridor_central",
                "name_ar": "الشريان الحركي المركزي",
                "name_en": "Central Spine Corridor",
                "type": "circulation",
                "capacity": 40,
                "area_m2": 80.0,
                "flow_capacity_per_min": 60,
                "bounds": {"x": -18, "z": -6, "width": 46, "depth": 4, "height": 3.5},
                "color": "#606060"
            },
            "corridor_bypass_south": {
                "id": "corridor_bypass_south",
                "name_ar": "ممر الحركة الالتفافي (البديل)",
                "name_en": "Southern Bypass Corridor",
                "type": "circulation",
                "capacity": 25,
                "area_m2": 45.0,
                "flow_capacity_per_min": 35,
                "bounds": {"x": -18, "z": 12, "width": 46, "depth": 3, "height": 3.5},
                "color": "#505050"
            },
            "open_office_north": {
                "id": "open_office_north",
                "name_ar": "مكاتب الموظفين (الجناح الشمالي)",
                "name_en": "North Open Office",
                "type": "workspace",
                "capacity": 30,
                "area_m2": 115.0,
                "bounds": {"x": -18, "z": -2, "width": 22, "depth": 14, "height": 3.5},
                "color": "#50e3c2"
            },
            "open_office_south": {
                "id": "open_office_south",
                "name_ar": "مكاتب الموظفين (الجناح الجنوبي)",
                "name_en": "South Open Office",
                "type": "workspace",
                "capacity": 25,
                "area_m2": 95.0,
                "bounds": {"x": 4, "z": -2, "width": 24, "depth": 14, "height": 3.5},
                "color": "#4a90e2"
            },
            "break_lounge": {
                "id": "break_lounge",
                "name_ar": "استراحة الموظفين والخدمات",
                "name_en": "Staff Lounge & Amenities",
                "type": "amenity",
                "capacity": 18,
                "area_m2": 52.0,
                "bounds": {"x": -6, "z": 2, "width": 10, "depth": 10, "height": 3.5},
                "color": "#b8e986"
            }
        }

        self.partitions = {
            "p_waiting_multi": {
                "id": "p_waiting_multi",
                "name_ar": "القاطع الصوتي المنزلق (صالة الانتظار - القاعة أ)",
                "between": ["waiting_hall", "multi_hall_a"],
                "status": "closed",
                "position": {"x": 8, "z": -14, "width": 0.25, "depth": 8, "height": 3.5},
                "expansion_capacity": 18
            },
            "p_multi_ab": {
                "id": "p_multi_ab",
                "name_ar": "القاطع المرن بين قاعتي التدريب (أ و ب)",
                "between": ["multi_hall_a", "multi_hall_b"],
                "status": "closed",
                "position": {"x": 18, "z": -14, "width": 0.25, "depth": 8, "height": 3.5},
                "expansion_capacity": 20
            }
        }

        self.edges = [
            {"u": "reception", "v": "corridor_central", "distance": 6.0, "width": 2.2, "status": "active"},
            {"u": "waiting_hall", "v": "corridor_central", "distance": 4.5, "width": 2.4, "status": "active"},
            {"u": "waiting_hall", "v": "multi_hall_a", "distance": 2.0, "width": 3.0, "status": "closed_by_partition"},
            {"u": "multi_hall_a", "v": "corridor_central", "distance": 5.0, "width": 1.8, "status": "active"},
            {"u": "multi_hall_b", "v": "corridor_central", "distance": 5.0, "width": 1.8, "status": "active"},
            {"u": "open_office_north", "v": "corridor_central", "distance": 4.0, "width": 2.0, "status": "active"},
            {"u": "open_office_south", "v": "corridor_central", "distance": 4.0, "width": 2.0, "status": "active"},
            {"u": "break_lounge", "v": "corridor_central", "distance": 7.0, "width": 1.8, "status": "active"},
            {"u": "open_office_north", "v": "corridor_bypass_south", "distance": 7.5, "width": 1.8, "status": "active"},
            {"u": "open_office_south", "v": "corridor_bypass_south", "distance": 7.5, "width": 1.8, "status": "active"},
            {"u": "corridor_central", "v": "corridor_bypass_south", "distance": 18.0, "width": 2.0, "status": "active"}
        ]

        self.walls = {
            "w_ext_north": {"id": "w_ext_north", "name_ar": "الجدار الخارجي الشمالي", "start": [-18, -14], "end": [28, -14], "thickness": 0.30, "height": 3.0, "type": "exterior"},
            "w_ext_south": {"id": "w_ext_south", "name_ar": "الجدار الخارجي الجنوبي", "start": [-18, 15], "end": [28, 15], "thickness": 0.30, "height": 3.0, "type": "exterior"},
            "w_ext_west": {"id": "w_ext_west", "name_ar": "الجدار الخارجي الغربي", "start": [-18, -14], "end": [-18, 15], "thickness": 0.30, "height": 3.0, "type": "exterior"},
            "w_ext_east": {"id": "w_ext_east", "name_ar": "الجدار الخارجي الشرقي", "start": [28, -14], "end": [28, 15], "thickness": 0.30, "height": 3.0, "type": "exterior"},
            "w_int_corridor_n": {"id": "w_int_corridor_n", "name_ar": "جدار الممر المركزي الشمالي", "start": [-18, -6], "end": [28, -6], "thickness": 0.20, "height": 3.0, "type": "interior"},
            "w_int_corridor_s": {"id": "w_int_corridor_s", "name_ar": "جدار الممر المركزي الجنوبي", "start": [-18, -2], "end": [28, -2], "thickness": 0.20, "height": 3.0, "type": "interior"},
            "w_div_rec_wait": {"id": "w_div_rec_wait", "name_ar": "جدار فاصل (الاستقبال - الانتظار)", "start": [-6, -14], "end": [-6, -6], "thickness": 0.20, "height": 3.0, "type": "interior"},
            "w_div_multi_ab": {"id": "w_div_multi_ab", "name_ar": "جدار فاصل (القاعة أ - القاعة ب)", "start": [18, -14], "end": [18, -6], "thickness": 0.20, "height": 3.0, "type": "interior"}
        }

        self.openings = {
            "d_main_entry": {"id": "d_main_entry", "name_ar": "المدخل الرئيسي للمبنى", "type": "door", "wall_id": "w_ext_west", "position": [-18, -10], "width": 1.8, "height": 2.4, "connects": ["outside", "reception"], "flow_capacity_per_min": 60},
            "d_reception_corr": {"id": "d_reception_corr", "name_ar": "باب الاستقبال إلى الممر", "type": "door", "wall_id": "w_int_corridor_n", "position": [-12, -6], "width": 1.4, "height": 2.2, "connects": ["reception", "corridor_central"], "flow_capacity_per_min": 45},
            "d_waiting_corr": {"id": "d_waiting_corr", "name_ar": "باب صالة الانتظار إلى الممر", "type": "door", "wall_id": "w_int_corridor_n", "position": [1, -6], "width": 1.6, "height": 2.2, "connects": ["waiting_hall", "corridor_central"], "flow_capacity_per_min": 50},
            "d_multi_a_corr": {"id": "d_multi_a_corr", "name_ar": "باب القاعة أ إلى الممر", "type": "door", "wall_id": "w_int_corridor_n", "position": [13, -6], "width": 1.2, "height": 2.2, "connects": ["multi_hall_a", "corridor_central"], "flow_capacity_per_min": 35},
            "d_multi_b_corr": {"id": "d_multi_b_corr", "name_ar": "باب القاعة ب إلى الممر", "type": "door", "wall_id": "w_int_corridor_n", "position": [23, -6], "width": 1.2, "height": 2.2, "connects": ["multi_hall_b", "corridor_central"], "flow_capacity_per_min": 35},
            "d_office_n_corr": {"id": "d_office_n_corr", "name_ar": "باب مكاتب الشمال إلى الممر", "type": "door", "wall_id": "w_int_corridor_s", "position": [-7, -2], "width": 1.4, "height": 2.2, "connects": ["open_office_north", "corridor_central"], "flow_capacity_per_min": 40},
            "d_office_s_corr": {"id": "d_office_s_corr", "name_ar": "باب مكاتب الجنوب إلى الممر", "type": "door", "wall_id": "w_int_corridor_s", "position": [16, -2], "width": 1.4, "height": 2.2, "connects": ["open_office_south", "corridor_central"], "flow_capacity_per_min": 40},
            "win_rec_north": {"id": "win_rec_north", "name_ar": "نافذة الاستقبال الشمالية", "type": "window", "wall_id": "w_ext_north", "position": [-12, -14], "width": 3.0, "height": 1.6, "sill_height": 0.9},
            "win_wait_north": {"id": "win_wait_north", "name_ar": "نافذة صالة الانتظار", "type": "window", "wall_id": "w_ext_north", "position": [1, -14], "width": 4.0, "height": 1.6, "sill_height": 0.9},
            "win_office_south1": {"id": "win_office_south1", "name_ar": "نوافذ المكاتب الجنوبية 1", "type": "window", "wall_id": "w_ext_south", "position": [-7, 15], "width": 4.5, "height": 1.6, "sill_height": 0.9},
            "win_office_south2": {"id": "win_office_south2", "name_ar": "نوافذ المكاتب الجنوبية 2", "type": "window", "wall_id": "w_ext_south", "position": [16, 15], "width": 4.5, "height": 1.6, "sill_height": 0.9}
        }

    def load_from_dict(self, data: Dict[str, Any]):
        """استبدال النموذج الحالي ببيانات مبنى جديدة (JSON أو مستورد من DXF أو IFC)"""
        self.model_id = data.get("id", "custom_model")
        self.name_ar = data.get("name_ar", "مبنى معماري جديد")
        self.name_en = data.get("name_en", "Custom Building")
        self.building_type = data.get("building_type", "general")
        self.spaces = dict(data.get("spaces", {}))
        self.partitions = dict(data.get("partitions", {}))
        self.edges = list(data.get("edges", []))
        self.walls = dict(data.get("walls", {}))
        self.openings = dict(data.get("openings", {}))
        self.stairs = dict(data.get("stairs", {}))
        self.storeys = dict(data.get("storeys", {}))
        self.slabs = dict(data.get("slabs", {}))
        self.columns = dict(data.get("columns", {}))
        self.beams = dict(data.get("beams", {}))

    def update_space(self, space_id: str, updates: Dict[str, Any]) -> bool:
        """تعديل بارامترات فضاء معماري موجود"""
        if space_id not in self.spaces:
            return False
        for key, val in updates.items():
            if key in ["name_ar", "name_en", "type", "color"]:
                self.spaces[space_id][key] = str(val)
            elif key in ["capacity"]:
                self.spaces[space_id][key] = int(val)
            elif key in ["area_m2"]:
                self.spaces[space_id][key] = float(val)
            elif key == "bounds" and isinstance(val, dict):
                self.spaces[space_id]["bounds"].update(val)
        return True

    def add_wall(self, wall_data: Dict[str, Any]) -> str:
        """إضافة جدار معماري جديد إلى بنية التوأم الرقمي"""
        wid = wall_data.get("id") or f"wall_{len(self.walls) + 1}"
        wall_data["id"] = wid
        self.walls[wid] = wall_data
        return wid

    def add_opening(self, opening_data: Dict[str, Any]) -> str:
        """إضافة فتحة باب أو شباك على جدار معماري"""
        oid = opening_data.get("id") or f"op_{len(self.openings) + 1}"
        opening_data["id"] = oid
        self.openings[oid] = opening_data
        return oid

    def add_space(self, space_data: Dict[str, Any]) -> str:
        """إضافة فضاء معماري جديد إلى النموذج"""
        sid = space_data.get("id") or f"space_{len(self.spaces) + 1}"
        space_data["id"] = sid
        self.spaces[sid] = space_data
        return sid

    def add_stair(self, stair_data: Dict[str, Any]) -> str:
        """إضافة سلم معماري وعقدة حركة عمودية إلى بنية التوأم الرقمي"""
        sid = stair_data.get("id") or f"stair_{len(self.stairs) + 1}"
        stair_data["id"] = sid
        if "width" not in stair_data:
            stair_data["width"] = 2.4
        if "depth" not in stair_data:
            stair_data["depth"] = 4.5
        if "num_steps" not in stair_data:
            stair_data["num_steps"] = 18
        if "rotation" not in stair_data:
            stair_data["rotation"] = 0.0
        if "direction" not in stair_data:
            stair_data["direction"] = "two_way"
        if "landing_pos" not in stair_data:
            pos = stair_data.get("position", [0, 0])
            stair_data["landing_pos"] = [pos[0], pos[1] + stair_data["depth"] / 2.0]
        self.stairs[sid] = stair_data
        return sid

    def delete_stair(self, stair_id: str) -> bool:
        """حذف سلم معماري"""
        if stair_id in self.stairs:
            del self.stairs[stair_id]
            return True
        return False

    def update_stair(self, stair_id: str, new_position: Optional[List[float]] = None, new_rotation: Optional[float] = None, new_direction: Optional[str] = None) -> bool:
        """تعديل موضع و/أو تدوير سلم معماري واتجاه حركته وتحديث موضع بسطة الهبوط المرتبطة بالممر"""
        if stair_id not in self.stairs:
            return False
        stair = self.stairs[stair_id]
        if new_position is not None:
            stair["position"] = [round(new_position[0], 2), round(new_position[1], 2)]
        if new_rotation is not None:
            stair["rotation"] = round(new_rotation % 360.0, 1)
        if new_direction is not None:
            stair["direction"] = new_direction
        
        # إعادة احتساب موضع بسطة الهبوط وفق الموضع والزاوية الجديدة
        pos = stair.get("position", [0.0, 0.0])
        depth = stair.get("depth", 4.5)
        rot_rad = math.radians(stair.get("rotation", 0.0))
        offset = depth / 2.0
        stair["landing_pos"] = [
            round(pos[0] + math.sin(rot_rad) * offset, 2),
            round(pos[1] + math.cos(rot_rad) * offset, 2)
        ]
        return True

    def delete_wall(self, wall_id: str) -> bool:
        """حذف جدار معماري وأي فتحات أبواب وشبابيك واقعة عليه"""
        if wall_id in self.walls:
            del self.walls[wall_id]
            # حذف أي فتحات مرتبطة بهذا الجدار
            to_remove = [oid for oid, op in self.openings.items() if op.get("wall_id") == wall_id]
            for oid in to_remove:
                del self.openings[oid]
            return True
        return False

    def update_wall_position(self, wall_id: str, new_start: List[float], new_end: List[float]) -> bool:
        """تعديل موضع أو تدوير جدار معماري ونقل فتحات الأبواب والشبابيك التابعة له نسبياً"""
        if wall_id not in self.walls:
            return False
        old_wall = self.walls[wall_id]
        old_start = old_wall["start"]
        old_end = old_wall["end"]
        
        vx_old = old_end[0] - old_start[0]
        vz_old = old_end[1] - old_start[1]
        len_sq_old = vx_old * vx_old + vz_old * vz_old
        
        vx_new = new_end[0] - new_start[0]
        vz_new = new_end[1] - new_start[1]
        
        old_wall["start"] = [round(new_start[0], 2), round(new_start[1], 2)]
        old_wall["end"] = [round(new_end[0], 2), round(new_end[1], 2)]
        
        # تحريك وتدوير الفتحات الواقعة على هذا الجدار بالحفاظ على نسبة موضعها t على طول الجدار
        for op in self.openings.values():
            if op.get("wall_id") == wall_id and "position" in op:
                pos = op["position"]
                if len_sq_old > 1e-4:
                    t = ((pos[0] - old_start[0]) * vx_old + (pos[1] - old_start[1]) * vz_old) / len_sq_old
                    t = max(0.0, min(1.0, t))
                    op["position"] = [
                        round(new_start[0] + t * vx_new, 2),
                        round(new_start[1] + t * vz_new, 2)
                    ]
                else:
                    dx = (new_start[0] - old_start[0] + new_end[0] - old_end[0]) / 2.0
                    dz = (new_start[1] - old_start[1] + new_end[1] - old_end[1]) / 2.0
                    op["position"] = [round(pos[0] + dx, 2), round(pos[1] + dz, 2)]
        return True

    def delete_opening(self, opening_id: str) -> bool:
        """حذف فتحة باب أو شباك أو ممر"""
        if opening_id in self.openings:
            del self.openings[opening_id]
            return True
        return False

    def delete_space(self, space_id: str) -> bool:
        """حذف فضاء معماري وأرضيته الملونة وحساساته وأي جدران محيطية به"""
        if space_id in self.spaces:
            del self.spaces[space_id]
            # حذف أي قواطع مرنة مرتبطة به
            to_remove_p = [pid for pid, p in self.partitions.items() if space_id in p.get("between", [])]
            for pid in to_remove_p:
                del self.partitions[pid]
            # حذف أي جدران تابعة له
            to_remove_w = [wid for wid, w in self.walls.items() if wid.startswith(f"w_{space_id}")]
            for wid in to_remove_w:
                self.delete_wall(wid)
            return True
        return False

    def create_space_from_walls(self, wall_ids: List[str], name_ar: str = "فضاء معماري جديد", space_type: str = "flexible") -> Optional[Dict[str, Any]]:
        """إنشاء وتحديد فضاء معماري جديد ناتج عن إغلاق 3 جدران أو أكثر"""
        if len(wall_ids) < 3:
            return None
        
        # التأكد من وجود كافة الجدران
        segments = []
        for wid in wall_ids:
            if wid not in self.walls:
                return None
            w = self.walls[wid]
            segments.append((list(w["start"]), list(w["end"])))
            
        # ربط الجدران في حلقة مغلقة
        ordered_pts = [segments[0][0], segments[0][1]]
        used = {0}
        
        for _ in range(len(segments) - 1):
            curr = ordered_pts[-1]
            best_idx = -1
            best_dist = float('inf')
            next_pt = None
            
            for i, seg in enumerate(segments):
                if i in used:
                    continue
                d_start = ((seg[0][0] - curr[0])**2 + (seg[0][1] - curr[1])**2)**0.5
                d_end = ((seg[1][0] - curr[0])**2 + (seg[1][1] - curr[1])**2)**0.5
                
                if d_start < best_dist:
                    best_dist = d_start
                    best_idx = i
                    next_pt = seg[1]
                if d_end < best_dist:
                    best_dist = d_end
                    best_idx = i
                    next_pt = seg[0]
                    
            if best_idx != -1 and best_dist <= 2.5:
                used.add(best_idx)
                ordered_pts.append(next_pt)
            else:
                break
                
        if len(used) != len(segments):
            return None
            
        # التحقق من إغلاق الحلقة بين النقطة الأخيرة والأولى
        d_close = ((ordered_pts[-1][0] - ordered_pts[0][0])**2 + (ordered_pts[-1][1] - ordered_pts[0][1])**2)**0.5
        if d_close > 2.5:
            return None
            
        polygon = ordered_pts[:-1] if d_close < 0.5 else ordered_pts
        if len(polygon) < 3:
            return None
            
        # حساب المساحة وصيغة Shoelace ومركز الثقل
        area_signed = 0.0
        cx_num = 0.0
        cz_num = 0.0
        n = len(polygon)
        for i in range(n):
            j = (i + 1) % n
            xi, zi = polygon[i][0], polygon[i][1]
            xj, zj = polygon[j][0], polygon[j][1]
            cross = (xi * zj - xj * zi)
            area_signed += cross
            cx_num += (xi + xj) * cross
            cz_num += (zi + zj) * cross
            
        area = abs(area_signed) / 2.0
        if area < 0.5:
            return None
            
        if abs(area_signed) > 1e-5:
            cx = cx_num / (3.0 * area_signed)
            cz = cz_num / (3.0 * area_signed)
        else:
            cx = sum(p[0] for p in polygon) / n
            cz = sum(p[1] for p in polygon) / n
            
        xs = [p[0] for p in polygon]
        zs = [p[1] for p in polygon]
        min_x, max_x = min(xs), max(xs)
        min_z, max_z = min(zs), max(zs)
        
        sid = f"space_{len(self.spaces) + 1}"
        space_obj = {
            "id": sid,
            "name_ar": name_ar,
            "name_en": "Enclosed Space",
            "type": space_type,
            "capacity": max(2, int(round(area / 3.5))),
            "area_m2": round(area, 2),
            "centroid": [round(cx, 2), round(cz, 2)],
            "polygon": [[round(p[0], 2), round(p[1], 2)] for p in polygon],
            "bounds": {
                "x": round(min_x, 2),
                "z": round(min_z, 2),
                "width": round(max_x - min_x, 2),
                "depth": round(max_z - min_z, 2),
                "height": 3.5
            },
            "enclosing_wall_ids": list(wall_ids),
            "color": "#2ecc71"
        }
        self.spaces[sid] = space_obj
        return space_obj

    def clear_all_walls(self) -> None:
        """مسح كافة الجدران والفتحات للبدء من مسقط نظيف"""
        self.walls.clear()
        self.openings.clear()

    def clear_all_walls_and_spaces(self) -> None:
        """مسح كافة الجدران والفتحات والفضاءات والأرضيات والسلالم والطوابق للبدء من مسقط نظيف تماماً"""
        self.walls.clear()
        self.openings.clear()
        self.spaces.clear()
        self.partitions.clear()
        self.stairs.clear()
        self.storeys.clear()
        self.slabs.clear()
        self.columns.clear()
        self.beams.clear()

    def create_new_project(self, name_ar: str = "مشروع معماري جديد", name_en: str = "New Architectural Project") -> Dict[str, Any]:
        """إنشاء مشروع معماري جديد بالكامل بلوحة بيضاء نظيفة وتهيئة طابق أرضي قياسي"""
        import time
        self.model_id = f"project_{int(time.time())}"
        self.name_ar = name_ar if name_ar else "مشروع معماري جديد"
        self.name_en = name_en if name_en else "New Architectural Project"
        self.building_type = "new_project"
        self.walls.clear()
        self.openings.clear()
        self.spaces.clear()
        self.partitions.clear()
        self.edges.clear()
        self.stairs.clear()
        self.slabs.clear()
        self.columns.clear()
        self.beams.clear()
        self.storeys = {
            "storey_ground": {
                "id": "storey_ground",
                "name_ar": "الطابق الأرضي (Level 0)",
                "name_en": "Ground Floor",
                "elevation": 0.0,
                "height": 3.5
            }
        }
        return self.get_building_state()

    def get_building_state(self) -> Dict[str, Any]:
        """إرجاع البنية الكاملة للمبنى للعرض والتحليل"""
        return {
            "id": self.model_id,
            "name_ar": self.name_ar,
            "name_en": self.name_en,
            "building_type": self.building_type,
            "storeys": self.storeys,
            "slabs": self.slabs,
            "columns": self.columns,
            "beams": self.beams,
            "spaces": self.spaces,
            "partitions": self.partitions,
            "edges": self.edges,
            "walls": self.walls,
            "openings": self.openings,
            "stairs": self.stairs
        }

    def set_partition_state(self, partition_id: str, new_status: str) -> bool:
        """تحديث حالة القاطع المرن (فتح / إغلاق) وتحديث مسار الحركة المرتبط به"""
        if partition_id in self.partitions:
            self.partitions[partition_id]["status"] = new_status
            between = self.partitions[partition_id].get("between", [])
            if len(between) == 2:
                u, v = between[0], between[1]
                for edge in self.edges:
                    if (edge["u"] == u and edge["v"] == v) or (edge["u"] == v and edge["v"] == u):
                        edge["status"] = "active" if new_status == "open" else "closed_by_partition"
            return True
        return False

    def get_effective_capacity(self, space_id: str) -> int:
        """احتساب السعة الفعلية للفضاء آخذاً بالحسبان حالة أي قاطع مرن متصل به مفتوح"""
        space = self.spaces.get(space_id)
        if not space:
            return 0
        cap = space["capacity"]
        for p in self.partitions.values():
            if p.get("status") == "open" and space_id in p.get("between", []):
                # إذا كان الفضاء هو الأول في القاطع، يُضاف له السعة الإضافية
                if p.get("between", [])[0] == space_id:
                    cap += p.get("expansion_capacity", 15)
        return cap
