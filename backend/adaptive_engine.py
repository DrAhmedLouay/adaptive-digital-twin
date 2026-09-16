# backend/adaptive_engine.py
"""
Adaptive Optimization Engine for Spatial Occupancy & Facility Management.
Implements multi-objective architectural optimization functions (J_occ, J_circ),
dynamic bottleneck diagnosis, and autonomous spatial reconfiguration.
Generic and compatible with any building typology or imported plan.
"""

from typing import Dict, Any, List, Tuple
import math

class AdaptiveOptimizationEngine:
    def __init__(self, spatial_model):
        self.spatial_model = spatial_model
        
        # الأوزان التفضيلية لدالة الهدف متعددة المعايير
        self.weights = {
            "w_overcrowd": 4.0,   # وزن جزاء التكدس الحرج
            "w_underutil": 1.5,   # وزن جزاء الهدر الفراغي
            "w_circulation": 2.5, # وزن جزاء اختناق الممرات
            "w_reconfig": 0.5     # تكلفة تغيير الحالة فيزيائياً
        }
        
        self.theta_optimal = 0.75
        self.active_actions: List[Dict[str, Any]] = []
        self.adaptive_mode_enabled = False

    def toggle_adaptive_mode(self, enabled: bool):
        """تمكين أو تعطيل التكيف التلقائي"""
        self.adaptive_mode_enabled = enabled
        if not enabled:
            # إعادة القواطع للوضع الافتراضي المغلق
            for p_id in self.spatial_model.partitions:
                self.spatial_model.set_partition_state(p_id, "closed")
            self.active_actions = []

    def calculate_kpis(self, sensor_readings: Dict[str, int], corridor_flows: Dict[str, float]) -> Dict[str, Any]:
        """حساب مؤشرات الأداء المكانية (Spatial KPIs) لأي مبنى نشط"""
        total_overcrowd_penalty = 0.0
        total_underutil_penalty = 0.0
        overcrowded_rooms = []
        underutilized_rooms = []
        occupancy_ratios = {}

        for room_id, space in self.spatial_model.spaces.items():
            if space.get("type") == "circulation":
                continue

            current_occ = sensor_readings.get(room_id, 0)
            effective_cap = self.spatial_model.get_effective_capacity(room_id)
            ratio = current_occ / max(1, effective_cap)
            occupancy_ratios[room_id] = round(ratio, 2)

            if ratio > 1.0:
                # تكدس: حساب الجزاء التربيعي
                penalty = ((ratio - 1.0) ** 2) * self.weights["w_overcrowd"] * space.get("area_m2", 50)
                total_overcrowd_penalty += penalty
                overcrowded_rooms.append({
                    "id": room_id,
                    "name_ar": space.get("name_ar", room_id),
                    "occupancy": current_occ,
                    "capacity": effective_cap,
                    "ratio": round(ratio * 100, 1)
                })
            elif ratio < 0.25 and space.get("type") in ["flexible", "workspace"]:
                # هدر فراغي لفضاء شاغر
                penalty = ((self.theta_optimal - ratio) ** 2) * self.weights["w_underutil"] * (space.get("area_m2", 50) * 0.5)
                total_underutil_penalty += penalty
                underutilized_rooms.append({
                    "id": room_id,
                    "name_ar": space.get("name_ar", room_id),
                    "occupancy": current_occ,
                    "capacity": effective_cap,
                    "ratio": round(ratio * 100, 1)
                })

        # حساب مؤشر اختناق الممرات
        total_circ_penalty = 0.0
        choked_corridors = []
        for corridor_id, flow in corridor_flows.items():
            corridor_space = self.spatial_model.spaces.get(corridor_id)
            if corridor_space:
                flow_cap = corridor_space.get("flow_capacity_per_min", 45)
                flow_ratio = flow / max(1, flow_cap)
                if flow_ratio > 0.85:
                    penalty = (flow_ratio ** 2) * self.weights["w_circulation"] * 10.0
                    total_circ_penalty += penalty
                    choked_corridors.append({
                        "id": corridor_id,
                        "name_ar": corridor_space.get("name_ar", corridor_id),
                        "flow": flow,
                        "capacity": flow_cap,
                        "ratio": round(flow_ratio * 100, 1)
                    })

        j_total = round(total_overcrowd_penalty + total_underutil_penalty + total_circ_penalty, 2)
        spatial_balance_score = max(10.0, round(100.0 - (j_total * 0.25), 1))

        return {
            "j_total_cost": j_total,
            "j_occ_penalty": round(total_overcrowd_penalty + total_underutil_penalty, 2),
            "j_circ_penalty": round(total_circ_penalty, 2),
            "spatial_balance_score": spatial_balance_score,
            "overcrowded_rooms": overcrowded_rooms,
            "underutilized_rooms": underutilized_rooms,
            "choked_corridors": choked_corridors,
            "occupancy_ratios": occupancy_ratios
        }

    def evaluate_and_adapt(self, sensor_readings: Dict[str, int], corridor_flows: Dict[str, float]) -> Dict[str, Any]:
        """التقييم اللحظي واتخاذ قرارات التكيف التلقائي لأي مبنى نشط"""
        # 1. حساب مؤشرات الحالة الأصلية الثابتة (Static Baseline)
        saved_partition_states = {p_id: p.get("status", "closed") for p_id, p in self.spatial_model.partitions.items()}
        for p_id in self.spatial_model.partitions:
            self.spatial_model.set_partition_state(p_id, "closed")
        
        baseline_kpis = self.calculate_kpis(sensor_readings, corridor_flows)
        
        if not self.adaptive_mode_enabled:
            # استرجاع الحالة السابقة إذا كان التكيف معطلاً
            for p_id, st in saved_partition_states.items():
                self.spatial_model.set_partition_state(p_id, st)
            return {
                "mode": "static_manual",
                "current_kpis": baseline_kpis,
                "baseline_kpis": baseline_kpis,
                "actions": [],
                "improvement_summary": {
                    "balance_gain_percent": 0.0,
                    "congestion_reduction_percent": 0.0,
                    "status_text": "الوضع الثابت (غير مفعل التكيف)"
                }
            }

        # 2. تشغيل الخوارزمية التكيفية الذكية لجميع القواطع والممرات المتاحة
        actions = []

        # أ. فحص كل قاطع مرن وإمكانية استخدامه لحل تكدس الغرف المتصلة به
        for p_id, partition in self.spatial_model.partitions.items():
            between = partition.get("between", [])
            if len(between) != 2:
                continue
            r1_id, r2_id = between[0], between[1]
            r1_space = self.spatial_model.spaces.get(r1_id)
            r2_space = self.spatial_model.spaces.get(r2_id)
            if not r1_space or not r2_space:
                continue

            r1_occ = sensor_readings.get(r1_id, 0)
            r2_occ = sensor_readings.get(r2_id, 0)
            r1_cap = r1_space.get("capacity", 20)
            r2_cap = r2_space.get("capacity", 20)

            ratio1 = r1_occ / max(1, r1_cap)
            ratio2 = r2_occ / max(1, r2_cap)

            # إذا كانت الغرفة 1 متكدسة (>110%) والغرفة 2 فيها شاغر (<50%)
            if ratio1 > 1.10 and ratio2 < 0.50:
                self.spatial_model.set_partition_state(p_id, "open")
                actions.append({
                    "type": "MOVABLE_PARTITION_EXPANSION",
                    "partition_id": p_id,
                    "title_ar": f"فتح {partition.get('name_ar', p_id)}",
                    "reason_ar": f"تكدس في {r1_space.get('name_ar', r1_id)} ({r1_occ}/{r1_cap}) مقابل شواغر في {r2_space.get('name_ar', r2_id)} ({r2_occ}/{r2_cap}).",
                    "impact_ar": f"دمج الفضاءين ورفع السعة الاستيعابية الفعالة بمقدار +{partition.get('expansion_capacity', 15)} شخصاً."
                })
            elif ratio2 > 1.10 and ratio1 < 0.50:
                self.spatial_model.set_partition_state(p_id, "open")
                actions.append({
                    "type": "MOVABLE_PARTITION_EXPANSION",
                    "partition_id": p_id,
                    "title_ar": f"فتح {partition.get('name_ar', p_id)}",
                    "reason_ar": f"تكدس في {r2_space.get('name_ar', r2_id)} ({r2_occ}/{r2_cap}) مقابل شواغر في {r1_space.get('name_ar', r1_id)} ({r1_occ}/{r1_cap}).",
                    "impact_ar": f"دمج الفضاءين وتوسيع الفضاء لاستيعاب التدافع فورياً."
                })
            elif ratio1 <= 0.85 and ratio2 <= 0.85:
                # عودة الأوضاع للاعتدال -> غلق القاطع
                self.spatial_model.set_partition_state(p_id, "closed")

        # ب. معالجة اختناق الممرات وإعادة التوجيه (Circulation Rerouting)
        adapted_corridor_flows = dict(corridor_flows)
        corridors = [s_id for s_id, s in self.spatial_model.spaces.items() if s.get("type") == "circulation"]

        for c_id in corridors:
            c_space = self.spatial_model.spaces[c_id]
            flow = corridor_flows.get(c_id, 0)
            cap = c_space.get("flow_capacity_per_min", 45)
            if (flow / max(1, cap)) > 0.85:
                # البحث عن ممر بديل أقل إشغالاً
                bypass_candidates = [other for other in corridors if other != c_id]
                if bypass_candidates:
                    bypass_id = bypass_candidates[0]
                    bypass_space = self.spatial_model.spaces[bypass_id]
                    diverted = round(flow * 0.35, 1)
                    adapted_corridor_flows[c_id] = max(5.0, flow - diverted)
                    adapted_corridor_flows[bypass_id] = corridor_flows.get(bypass_id, 0) + diverted

                    actions.append({
                        "type": "CIRCULATION_REROUTING",
                        "title_ar": f"إعادة التوجيه الذكي نحو {bypass_space.get('name_ar', bypass_id)}",
                        "reason_ar": f"اختناق حركي في {c_space.get('name_ar', c_id)} ({flow:.1f} شخص/دقيقة).",
                        "impact_ar": f"تحويل {diverted:.1f} شخص/دقيقة للمسار البديل وتخفيف الاختناق بنسبة 35%."
                    })
                    break

        # 3. حساب مؤشرات الأداء بعد التكيف
        adapted_kpis = self.calculate_kpis(sensor_readings, adapted_corridor_flows)

        # 4. حساب الفارق التحسيني
        baseline_balance = baseline_kpis["spatial_balance_score"]
        adapted_balance = adapted_kpis["spatial_balance_score"]
        balance_gain = round(max(0.0, adapted_balance - baseline_balance), 1)

        baseline_circ = baseline_kpis["j_circ_penalty"]
        adapted_circ = adapted_kpis["j_circ_penalty"]
        circ_reduction = 0.0
        if baseline_circ > 0:
            circ_reduction = round(max(0.0, ((baseline_circ - adapted_circ) / baseline_circ) * 100), 1)

        self.active_actions = actions

        return {
            "mode": "adaptive_autonomous",
            "current_kpis": adapted_kpis,
            "baseline_kpis": baseline_kpis,
            "actions": actions,
            "improvement_summary": {
                "balance_gain_percent": balance_gain,
                "congestion_reduction_percent": circ_reduction,
                "overcrowd_resolved_count": max(0, len(baseline_kpis["overcrowded_rooms"]) - len(adapted_kpis["overcrowded_rooms"])),
                "status_text": "تم التكيف الذكي بنجاح"
            }
        }
