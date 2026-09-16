# tests/test_engine.py
"""
Automated Unit Tests for Adaptive Spatial Engine & IoT Simulator.
"""

import sys
import os

# إضافة مجلد المشروع لمسار بايثون
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.spatial_graph import SpatialBuildingModel
from backend.iot_simulator import IoTSimulator
from backend.adaptive_engine import AdaptiveOptimizationEngine

def test_spatial_model():
    print("Testing Spatial Building Model...")
    model = SpatialBuildingModel()
    state = model.get_building_state()
    assert len(state["spaces"]) >= 8, "Expected at least 8 architectural spaces"
    assert "waiting_hall" in state["spaces"]
    assert "p_waiting_multi" in state["partitions"]
    
    # التحقق من تغيير سعة الفضاء مع القاطع المرن
    initial_cap = model.get_effective_capacity("waiting_hall")
    assert initial_cap == 22, f"Initial capacity should be 22, got {initial_cap}"
    
    model.set_partition_state("p_waiting_multi", "open")
    expanded_cap = model.get_effective_capacity("waiting_hall")
    assert expanded_cap == 40, f"Expanded capacity should be 40, got {expanded_cap}"
    print("✓ Spatial Model tests passed!")

def test_iot_simulator():
    print("Testing IoT Simulator...")
    model = SpatialBuildingModel()
    sim = IoTSimulator(model)
    
    # اختبار السيناريو العادي
    sim.set_scenario("normal")
    data = sim.get_latest()
    assert data["scenario"] == "normal"
    assert "waiting_hall" in data["occupancy"]
    
    # اختبار سيناريو الذروة الصباحية
    sim.set_scenario("morning_peak")
    data_peak = sim.get_latest()
    assert data_peak["occupancy"]["waiting_hall"] >= 30, "Morning peak should have high waiting hall occupancy"
    print("✓ IoT Simulator tests passed!")

def test_adaptive_optimization():
    print("Testing Adaptive Optimization Engine...")
    model = SpatialBuildingModel()
    sim = IoTSimulator(model)
    engine = AdaptiveOptimizationEngine(model)
    
    # محاكاة حالة ذروة وتكدس
    sim.set_scenario("morning_peak")
    sensor_data = sim.get_latest()
    
    # في الوضع الثابت (بدون تكيف)
    engine.toggle_adaptive_mode(False)
    static_eval = engine.evaluate_and_adapt(sensor_data["occupancy"], sensor_data["flows"])
    assert static_eval["mode"] == "static_manual"
    assert len(static_eval["current_kpis"]["overcrowded_rooms"]) > 0, "Static mode should register overcrowding"
    
    # في الوضع التكيفي الذكي
    engine.toggle_adaptive_mode(True)
    adaptive_eval = engine.evaluate_and_adapt(sensor_data["occupancy"], sensor_data["flows"])
    assert adaptive_eval["mode"] == "adaptive_autonomous"
    assert len(adaptive_eval["actions"]) > 0, "Adaptive mode should trigger corrective architectural actions"
    
    # التحقق من أن تفعيل القاطع حسّن مؤشر التوازن الفراغي
    assert adaptive_eval["improvement_summary"]["balance_gain_percent"] >= 0
    print("✓ Adaptive Optimization tests passed!")

if __name__ == "__main__":
    test_spatial_model()
    test_iot_simulator()
    test_adaptive_optimization()
    print("\nAll automated tests completed successfully! 🎉")
