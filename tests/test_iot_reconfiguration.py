# tests/test_iot_reconfiguration.py
"""
Unit and Integration Tests for BIM-IoT Digital Twin & Spatial Reconfiguration Engine.
Validates Dr. Ahmed Louay's research workflow:
1. BIM-IoT Sensor Registration & Telemetry
2. Spatial Utilization & Circulation Work (W = sum(Fij * Dij))
3. Algorithmic Spatial Reconfiguration & Layout Optimization
4. Academic CSV Dataset Export
"""

import sys
import os
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.spatial_graph import SpatialBuildingModel
from backend.iot_engine import IoTEngine

class TestIoTSpatialReconfiguration(unittest.TestCase):
    def setUp(self):
        self.model = SpatialBuildingModel()
        self.iot_engine = IoTEngine(self.model)

    def test_sensor_initialization(self):
        """التحقق من ربط مستشعرات الـ IoT بفضاءات وأبواب نموذج الـ BIM"""
        sensors = self.iot_engine.sensors
        doors = self.iot_engine.door_counters
        telemetry = self.iot_engine.zone_telemetry

        self.assertGreater(len(sensors), 0, "يجب أن تحتوي الشبكة على مستشعرات PIR وبيئية")
        self.assertGreater(len(doors), 0, "يجب أن ترتبط عدادات المشاة بالأبواب")
        self.assertEqual(len(telemetry), len(self.model.spaces), "يجب تسجيل دفق بيانات لكل فضاء BIM")

        # التحقق من نوع الحساسات وموقعها
        first_sensor = list(sensors.values())[0]
        self.assertIn("position", first_sensor)
        self.assertIn("status", first_sensor)
        self.assertEqual(first_sensor["status"], "ONLINE")

    def test_spatial_kpis_and_circulation_work(self):
        """التحقق من حساب إجهاد الحركة W = sum(Fij * Dij) ومؤشر التوازن الفراغي"""
        tick_result = self.iot_engine.tick()
        kpis = tick_result["kpis"]

        self.assertIn("spatial_balance_score", kpis)
        self.assertIn("total_circulation_work", kpis)
        self.assertGreater(kpis["spatial_balance_score"], 0)
        self.assertGreater(kpis["total_circulation_work"], 0)

        # التحقق من حساب مؤشرات CO2 والحرارة والإشغال
        for s_id, tel in tick_result["zone_telemetry"].items():
            self.assertGreaterEqual(tel["occupancy"], 0)
            self.assertGreaterEqual(tel["co2_ppm"], 400.0)
            self.assertGreater(tel["avg_dwell_minutes"], 0)

    def test_reconfiguration_recommendations(self):
        """التحقق من توليد توصيات إعادة التشكيل والتوزيع الوظيفي الأمثل"""
        recs = self.iot_engine.generate_reconfiguration_recommendations()
        
        self.assertIn("functional_swap_recommendation", recs)
        swap = recs["functional_swap_recommendation"]
        self.assertIn("projected_improvements", swap)
        
        # التأكد من حساب نسب التوفير في مسافة السير والاختناق
        improvements = swap["projected_improvements"]
        self.assertIn("travel_distance_reduction", improvements)
        self.assertIn("corridor_choke_reduction", improvements)

    def test_reconfiguration_modes_application(self):
        """التحقق من تطبيق أوضاع التكيف (الأساسي، الحركي، التوزيع الأمثل)"""
        # 1. تطبيق الوضع الراهن (Baseline)
        res_base = self.iot_engine.apply_reconfiguration_mode("baseline")
        self.assertEqual(res_base["active_mode"], "baseline")
        for p in self.model.partitions.values():
            self.assertEqual(p["status"], "closed")

        # 2. تطبيق التكيف الحركي بالقواطع (Kinetic)
        res_kinetic = self.iot_engine.apply_reconfiguration_mode("kinetic")
        self.assertEqual(res_kinetic["active_mode"], "kinetic")
        for p in self.model.partitions.values():
            self.assertEqual(p["status"], "open")

        # 3. تطبيق التوزيع الوظيفي الأمثل (Functional Swap)
        res_swap = self.iot_engine.apply_reconfiguration_mode("functional_swap")
        self.assertEqual(res_swap["active_mode"], "functional_swap")

    def test_academic_csv_export(self):
        """التحقق من سلامة تصدير ملف بيانات البحث العلمي بصيغة CSV"""
        self.iot_engine.tick()
        csv_content = self.iot_engine.export_academic_csv()
        
        lines = csv_content.strip().split("\n")
        self.assertGreater(len(lines), 1, "يجب أن يحتوي ملف الـ CSV على ترويسة وسجلات")
        
        header = lines[0]
        self.assertIn("zone_id", header)
        self.assertIn("utilization_percent", header)
        self.assertIn("circulation_work_index", header)
        self.assertIn("co2_ppm", header)
        self.assertIn("avg_dwell_minutes", header)

    def test_add_and_delete_sensor(self):
        """التحقق من إضافة وحذف مستشعرات إنترنت الأشياء لحظياً وبديناميكية كاملة"""
        initial_count = len(self.iot_engine.sensors)
        
        # 1. إضافة مستشعر حركة جديد
        sensor_data = {
            "type": "PIR_OCCUPANCY",
            "space_id": "reception",
            "name_ar": "مستشعر إشغال اختباري إضافي",
            "position": {"x": -15.0, "y": 3.35, "z": -10.0}
        }
        new_sensor = self.iot_engine.add_sensor(sensor_data)
        self.assertIn(new_sensor["id"], self.iot_engine.sensors)
        self.assertEqual(len(self.iot_engine.sensors), initial_count + 1)
        self.assertEqual(new_sensor["space_id"], "reception")
        self.assertEqual(new_sensor["status"], "ONLINE")

        # 2. إضافة عداد مرور عند الباب
        door_sensor_data = {
            "type": "OPTICAL_DOOR_COUNTER",
            "opening_id": "d_main_entry",
            "name_ar": "عداد مرور اختباري عند المدخل"
        }
        door_sensor = self.iot_engine.add_sensor(door_sensor_data)
        self.assertIn(door_sensor["id"], self.iot_engine.sensors)
        self.assertIn("d_main_entry", self.iot_engine.door_counters)

        # 3. حذف المستشعر والتأكد من اختفائه
        del_success = self.iot_engine.delete_sensor(new_sensor["id"])
        self.assertTrue(del_success)
        self.assertNotIn(new_sensor["id"], self.iot_engine.sensors)
        
        del_door_success = self.iot_engine.delete_sensor(door_sensor["id"])
        self.assertTrue(del_door_success)
        self.assertNotIn(door_sensor["id"], self.iot_engine.sensors)
        self.assertNotIn("d_main_entry", self.iot_engine.door_counters)

if __name__ == '__main__':
    unittest.main()
