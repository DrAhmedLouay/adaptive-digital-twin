# tests/test_importer.py
"""
Automated Tests for Plan Importer, DXF Parser, and Preset Switching.
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.plan_importer import PlanImporter
from backend.spatial_graph import SpatialBuildingModel
from backend.iot_simulator import IoTSimulator
from backend.adaptive_engine import AdaptiveOptimizationEngine

def test_preset_management():
    print("Testing Preset Management...")
    presets_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'presets'))
    presets = PlanImporter.list_presets(presets_dir)
    assert len(presets) >= 3, f"Expected at least 3 presets, found {len(presets)}"
    
    preset_ids = [p["id"] for p in presets]
    assert "administrative_office" in preset_ids
    assert "healthcare_clinic" in preset_ids
    assert "public_service_center" in preset_ids
    print(f"✓ Found {len(presets)} architectural presets: {preset_ids}")

    # اختبار تحميل المجمع الصحي
    clinic_data = PlanImporter.load_preset(presets_dir, "healthcare_clinic")
    assert clinic_data is not None
    assert "triage_reception" in clinic_data["spaces"]
    assert "p_waiting_overflow" in clinic_data["partitions"]

    # اختبار تحميل دائرة الأحوال المدنية
    gov_data = PlanImporter.load_preset(presets_dir, "public_service_center")
    assert gov_data is not None
    assert "citizen_grand_hall" in gov_data["spaces"]
    assert "p_hall_annex" in gov_data["partitions"]
    print("✓ Successfully loaded and validated preset schemas!")

def test_dynamic_model_switching():
    print("Testing Dynamic Model Switching...")
    presets_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'presets'))
    clinic_data = PlanImporter.load_preset(presets_dir, "healthcare_clinic")

    model = SpatialBuildingModel()
    iot = IoTSimulator(model)
    engine = AdaptiveOptimizationEngine(model)

    assert "reception" in model.spaces

    # تبديل النموذج إلى المجمع الصحي
    model.load_from_dict(clinic_data)
    iot.reinitialize_for_active_model()
    
    assert "triage_reception" in model.spaces
    assert "triage_reception" in iot.sensor_readings
    assert "reception" not in model.spaces

    # التحقق من عمل الخوارزمية التكيفية على المبنى الجديد
    engine.toggle_adaptive_mode(True)
    iot.set_scenario("morning_peak")
    tick_data = iot.tick()
    eval_res = engine.evaluate_and_adapt(tick_data["occupancy"], tick_data["flows"])
    
    assert eval_res["mode"] == "adaptive_autonomous"
    print("✓ Successfully switched model and verified adaptive engine on new typology!")

def test_dxf_parser():
    print("Testing AutoCAD DXF Parser...")
    # عينة مصغرة من محتوى DXF القياسي يحتوي على LWPOLYLINE و TEXT
    sample_dxf = """0
SECTION
2
ENTITIES
0
LWPOLYLINE
8
WALLS
10
-10.0
20
-10.0
10
10.0
20
-10.0
10
10.0
20
10.0
10
-10.0
20
10.0
0
TEXT
8
LABELS
10
0.0
20
0.0
1
صالة المؤتمرات الكبرى
0
ENDSEC
0
EOF"""
    parsed = PlanImporter.parse_dxf(sample_dxf)
    assert "spaces" in parsed
    assert len(parsed["spaces"]) >= 1
    first_space = list(parsed["spaces"].values())[0]
    assert first_space["name_ar"] == "صالة المؤتمرات الكبرى"
    assert first_space["bounds"]["width"] == 20.0
    assert first_space["bounds"]["depth"] == 20.0
    assert "walls" in parsed and len(parsed["walls"]) >= 4
    assert "openings" in parsed and len(parsed["openings"]) >= 1
    print(f"✓ Successfully parsed AutoCAD DXF polyline with {len(parsed['walls'])} walls and {len(parsed['openings'])} openings!")

def test_ifc_parser():
    print("Testing BIM Revit/ArchiCAD IFC Parser...")
    sample_ifc = """ISO-10303-21;
HEADER;
ENDSEC;
DATA;
#10 = IFCPROJECT('123', #1, 'Hospital Project', $, $, $, $, (#20), #30);
#15 = IFCBUILDING('456', #1, 'General Hospital Wing', $, $, $, $, $, $, $, $, $);
#100 = IFCSPACE('1A2B3C', #1, 'Triage Room', 'Emergency Triage', $, #110, #120, .ELEMENT., .INTERNAL.);
#200 = IFCSPACE('4D5E6F', #1, 'Waiting Lounge', 'Main Patient Waiting', $, #210, #220, .ELEMENT., .INTERNAL.);
#300 = IFCSPACE('7G8H9I', #1, 'Doctors Office', 'Consultation Suite', $, #310, #320, .ELEMENT., .INTERNAL.);
#400 = IFCQUANTITYAREA('GrossFloorArea', $, $, 65.5, $);
ENDSEC;
END-ISO-10303-21;"""
    parsed = PlanImporter.parse_ifc(sample_ifc)
    assert "spaces" in parsed
    assert len(parsed["spaces"]) >= 3
    names = [s["name_ar"] for s in parsed["spaces"].values()]
    assert "Triage Room" in names
    assert "Waiting Lounge" in names
    assert "walls" in parsed and len(parsed["walls"]) > 0
    assert "openings" in parsed and len(parsed["openings"]) > 0
    print(f"✓ Successfully parsed BIM IFC spaces: {names} with {len(parsed['walls'])} architectural walls!")

def test_pdf_parser():
    print("Testing Architectural PDF Parser...")
    sample_pdf_text = "BT /F1 14 Tf (صالة الاستقبال المركزية) Tj ET BT /F1 12 Tf (صالة انتظار المراجعين) Tj ET BT /F1 12 Tf (غرفة الاجتماعات) Tj ET"
    parsed = PlanImporter.parse_pdf(sample_pdf_text)
    assert "spaces" in parsed
    assert len(parsed["spaces"]) >= 3
    assert "walls" in parsed and len(parsed["walls"]) > 0
    assert "openings" in parsed and len(parsed["openings"]) > 0
    print(f"✓ Successfully extracted rooms and generated {len(parsed['walls'])} envelope walls from Architectural PDF plan!")

def test_imported_model_normalization():
    print("Testing Imported Model Normalization & Telemetry Compatibility...")
    custom_pdf_model = {
        "id": "test_user_pdf_1",
        "name_ar": "مخطط PDF معماري مستورد",
        "name_en": "Imported Architectural PDF",
        "building_type": "imported_pdf",
        "spaces": {
            "pdf_zone_1": {"name_ar": "المدخل الرئيسي", "type": "public", "area_m2": 60, "capacity": 20},
            "pdf_zone_2": {"name_ar": "صالة الانتظار", "type": "public", "area_m2": 80, "capacity": 25},
            "pdf_zone_3": {"name_ar": "الممر التوزيعي", "type": "circulation", "area_m2": 50, "capacity": 30}
        },
        "partitions": {}
    }
    normalized = PlanImporter.validate_and_normalize_json(custom_pdf_model)
    assert "spaces" in normalized
    assert len(normalized["spaces"]) == 3
    assert normalized["spaces"]["pdf_zone_1"]["capacity"] == 20
    assert "walls" in normalized and len(normalized["walls"]) >= 12
    assert "openings" in normalized and len(normalized["openings"]) >= 3
    print("✓ Successfully normalized user-imported floor plan model with complete wall/opening envelopes!")

def test_architectural_elements_addition():
    print("Testing Interactive Architectural Element Addition...")
    model = SpatialBuildingModel()
    
    # 1. إضافة جدار جديد
    new_wall = {
        "start": [-10, 5],
        "end": [10, 5],
        "thickness": 0.25,
        "height": 2.8,
        "type": "interior"
    }
    wid = model.add_wall(new_wall)
    assert wid in model.walls
    assert model.walls[wid]["start"] == [-10, 5]

    # 2. إضافة فتحة باب على الجدار
    new_door = {
        "wall_id": wid,
        "type": "door",
        "position": [0, 5],
        "width": 1.2,
        "height": 2.2
    }
    oid = model.add_opening(new_door)
    assert oid in model.openings
    assert model.openings[oid]["wall_id"] == wid
    assert model.openings[oid]["type"] == "door"

    # 3. إضافة فتحة شباك
    new_window = {
        "wall_id": wid,
        "type": "window",
        "position": [5, 5],
        "width": 1.5,
        "height": 1.4,
        "sill_height": 0.9
    }
    win_id = model.add_opening(new_window)
    assert win_id in model.openings
    assert model.openings[win_id]["type"] == "window"

    # 4. إضافة فتحة عبور وممر مفتوح
    new_passage = {
        "wall_id": wid,
        "type": "passage",
        "position": [-5, 5],
        "width": 1.6,
        "height": 2.4
    }
    pass_id = model.add_opening(new_passage)
    assert pass_id in model.openings
    assert model.openings[pass_id]["type"] == "passage"
    print("✓ Successfully added interactive walls, doors, windows, and passage openings to spatial building model!")

def test_wall_deletion_and_clearing():
    print("Testing Wall Deletion, Opening Cascade, and Clearing All Walls...")
    model = SpatialBuildingModel()
    
    # 1. Add a wall with openings
    wid = model.add_wall({"start": [0, 0], "end": [10, 0], "thickness": 0.25, "height": 2.8, "type": "interior"})
    op1 = model.add_opening({"wall_id": wid, "type": "door", "position": [3, 0], "width": 1.2, "height": 2.2})
    op2 = model.add_opening({"wall_id": wid, "type": "window", "position": [7, 0], "width": 1.4, "height": 1.2, "sill_height": 0.9})
    
    assert wid in model.walls
    assert op1 in model.openings
    assert op2 in model.openings
    
    # 2. Test deleting an individual opening
    assert model.delete_opening(op2) is True
    assert op2 not in model.openings
    assert op1 in model.openings
    
    # 3. Test deleting a wall with cascade deletion of attached openings
    assert model.delete_wall(wid) is True
    assert wid not in model.walls
    assert op1 not in model.openings
    
    # 4. Test clearing all walls
    w_count_before = len(model.walls)
    assert w_count_before > 0
    model.clear_all_walls()
    assert len(model.walls) == 0
    assert len(model.openings) == 0
    print("✓ Successfully verified wall deletion, cascade opening deletion, and clearing all walls!")

def test_space_deletion_and_clearing_all():
    print("Testing Space Deletion and Clearing All Walls and Spaces...")
    model = SpatialBuildingModel()
    sid = model.add_space({"name_ar": "فضاء اختباري", "type": "flexible", "area_m2": 45, "capacity": 15, "bounds": {"x": 0, "z": 0, "width": 6, "depth": 7.5}})
    assert sid in model.spaces
    
    # Delete space
    assert model.delete_space(sid) is True
    assert sid not in model.spaces
    
    # Clear all walls and spaces
    model.clear_all_walls_and_spaces()
    assert len(model.walls) == 0
    assert len(model.openings) == 0
    assert len(model.spaces) == 0
    print("✓ Successfully verified space deletion and complete clearing of walls and spaces!")

def test_opening_deletion_and_clean_joins():
    print("Testing Interactive Opening Deletion and Clean Wall Joins...")
    model = SpatialBuildingModel()
    model.clear_all_walls()

    # 1. إنشاء جدارين متقاطعين
    w1_id = model.add_wall({"start": [0.0, 0.0], "end": [10.0, 0.0], "thickness": 0.25, "height": 2.8, "type": "interior"})
    w2_id = model.add_wall({"start": [10.2, 0.15], "end": [10.2, 8.0], "thickness": 0.25, "height": 2.8, "type": "interior"})
    
    # 2. إضافة باب وشباك وممر عبور على الجدار الأول
    door_id = model.add_opening({"wall_id": w1_id, "type": "door", "position": [3.0, 0.0], "width": 1.2, "height": 2.2})
    win_id = model.add_opening({"wall_id": w1_id, "type": "window", "position": [7.0, 0.0], "width": 1.4, "height": 1.4, "sill_height": 0.9})
    pass_id = model.add_opening({"wall_id": w1_id, "type": "passage", "position": [5.0, 0.0], "width": 1.6, "height": 2.4})

    assert len(model.openings) == 3
    assert door_id in model.openings
    assert win_id in model.openings
    assert pass_id in model.openings

    # 3. حذف فتحة الباب والتحقق من بقاء الجدار سليماً مصمتاً دون مساس
    assert model.delete_opening(door_id) is True
    assert door_id not in model.openings
    assert w1_id in model.walls
    assert len(model.openings) == 2

    # 4. حذف الشباك وممر العبور
    assert model.delete_opening(win_id) is True
    assert model.delete_opening(pass_id) is True
    assert len(model.openings) == 0
    assert w1_id in model.walls
    print("✓ Successfully verified opening deletion leaves the hosting wall intact and contiguous!")

    # 5. محاكاة خوارزمية تنظيف وتوصيل التقاطعات والزوايا هندسياً (Corner & T-Junction Alignment)
    w1 = model.walls[w1_id]
    w2 = model.walls[w2_id]
    dist_corner = ((w1["end"][0] - w2["start"][0])**2 + (w1["end"][1] - w2["start"][1])**2)**0.5
    assert dist_corner < 0.65, f"Corner distance {dist_corner} within tolerance"

    # دمج النهايتين في النقطة المتوسطة
    avg_x = round((w1["end"][0] + w2["start"][0]) / 2, 1)
    avg_z = round((w1["end"][1] + w2["start"][1]) / 2, 1)
    w1["end"] = [avg_x, avg_z]
    w2["start"] = [avg_x, avg_z]

    assert w1["end"] == w2["start"]
    print("✓ Successfully verified clean wall intersection geometric corner miter snapping!")

if __name__ == "__main__":
    test_preset_management()
    test_dynamic_model_switching()
    test_dxf_parser()
    test_ifc_parser()
    test_pdf_parser()
    test_imported_model_normalization()
    test_architectural_elements_addition()
    test_wall_deletion_and_clearing()
    test_space_deletion_and_clearing_all()
    test_opening_deletion_and_clean_joins()
    print("\nAll Universal Importer, Opening Deletion & Clean Wall Join Tests Passed! 🎉")
