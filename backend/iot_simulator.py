# backend/iot_simulator.py
"""
Real-Time IoT Sensor Stream & Occupancy Simulator.
Generates realistic telemetry simulating PIR motion sensors,
optical footfall counters, and corridor flow monitoring.
Dynamically adapts to any imported or custom building model.
"""

import random
import time
from typing import Dict, Any, List

class IoTSimulator:
    def __init__(self, spatial_model):
        self.spatial_model = spatial_model
        self.current_scenario = "normal"
        self.step_count = 0
        self.sensor_readings: Dict[str, int] = {}
        self.corridor_flows: Dict[str, float] = {}
        self.history: List[Dict[str, Any]] = []

        self.reinitialize_for_active_model()

    def reinitialize_for_active_model(self):
        """إعادة ضبط المستشعرات لتتوافق مع الفضاءات والممرات للمبنى النشط"""
        self.sensor_readings = {}
        self.corridor_flows = {}
        self.history = []
        self.step_count = 0

        for s_id, s in self.spatial_model.spaces.items():
            if s.get("type") == "circulation":
                # ممر حركة
                self.sensor_readings[s_id] = max(2, int(s.get("capacity", 20) * 0.4))
                self.corridor_flows[s_id] = round(s.get("flow_capacity_per_min", 40) * 0.45, 1)
            else:
                # غرفة أو فضاء وظيفي
                cap = s.get("capacity", 20)
                # نسبة إشغال أولية طبيعية 50%
                self.sensor_readings[s_id] = max(1, int(cap * 0.55))

        self.apply_scenario(self.current_scenario)

    def set_scenario(self, scenario_name: str):
        """تغيير السيناريو النشط للمحاكاة"""
        self.current_scenario = scenario_name
        self.step_count = 0
        self.apply_scenario(scenario_name)

    def apply_scenario(self, scenario_name: str):
        """تطبيق قيم الإشغال بحسب طبيعة الفضاءات في السيناريو المختار"""
        spaces = self.spatial_model.spaces

        if scenario_name == "normal":
            for s_id, s in spaces.items():
                cap = s.get("capacity", 20)
                if s.get("type") == "circulation":
                    self.sensor_readings[s_id] = int(cap * 0.4)
                    flow_cap = s.get("flow_capacity_per_min", 40)
                    self.corridor_flows[s_id] = round(flow_cap * 0.45, 1)
                else:
                    self.sensor_readings[s_id] = max(1, int(cap * random.uniform(0.5, 0.7)))

        elif scenario_name == "morning_peak":
            # ذروة الإشغال: تكدس حاد في فضاءات الانتظار والاستقبال (>140%)
            for s_id, s in spaces.items():
                cap = s.get("capacity", 20)
                stype = s.get("type")
                if "waiting" in s_id.lower() or "reception" in s_id.lower() or stype == "public":
                    self.sensor_readings[s_id] = int(cap * 1.55) # تكدس حرج
                elif stype == "flexible":
                    self.sensor_readings[s_id] = max(1, int(cap * 0.12)) # هدر فراغي شاغر
                elif stype == "circulation":
                    self.sensor_readings[s_id] = int(cap * 0.85)
                    flow_cap = s.get("flow_capacity_per_min", 50)
                    self.corridor_flows[s_id] = round(flow_cap * 0.90, 1)
                else:
                    self.sensor_readings[s_id] = int(cap * 0.75)

        elif scenario_name == "corridor_choke":
            # اختناق في الممرات الرئيسية
            for s_id, s in spaces.items():
                cap = s.get("capacity", 20)
                if s.get("type") == "circulation":
                    if "central" in s_id.lower() or "clinical" in s_id.lower() or "spine" in s_id.lower() or "main" in s_id.lower():
                        self.sensor_readings[s_id] = int(cap * 1.25)
                        flow_cap = s.get("flow_capacity_per_min", 50)
                        self.corridor_flows[s_id] = round(flow_cap * 1.25, 1) # اختناق شديد
                    else:
                        self.sensor_readings[s_id] = max(1, int(cap * 0.2))
                        flow_cap = s.get("flow_capacity_per_min", 30)
                        self.corridor_flows[s_id] = round(flow_cap * 0.25, 1)
                else:
                    self.sensor_readings[s_id] = int(cap * 0.8)

        elif scenario_name == "after_hours":
            for s_id, s in spaces.items():
                self.sensor_readings[s_id] = max(1, int(s.get("capacity", 10) * 0.1))
                if s.get("type") == "circulation":
                    self.corridor_flows[s_id] = 2.0

    def tick(self) -> Dict[str, Any]:
        """تحديث قراءات الحساسات مع تذبذب واقعي"""
        self.step_count += 1
        
        for room_id in list(self.sensor_readings.keys()):
            current = self.sensor_readings[room_id]
            delta = random.choice([-1, 0, 0, 1])
            self.sensor_readings[room_id] = max(1, current + delta)

        for corridor in list(self.corridor_flows.keys()):
            flow_delta = random.uniform(-1.2, 1.2)
            self.corridor_flows[corridor] = max(1.0, round(self.corridor_flows[corridor] + flow_delta, 1))

        entry = {
            "timestamp": time.time(),
            "step": self.step_count,
            "scenario": self.current_scenario,
            "occupancy": dict(self.sensor_readings),
            "flows": dict(self.corridor_flows)
        }
        self.history.append(entry)
        if len(self.history) > 100:
            self.history.pop(0)

        return entry

    def get_latest(self) -> Dict[str, Any]:
        return {
            "scenario": self.current_scenario,
            "step": self.step_count,
            "occupancy": self.sensor_readings,
            "flows": self.corridor_flows
        }
