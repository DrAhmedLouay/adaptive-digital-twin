# tests/test_ifc_multi_storey.py
"""
Automated tests for Multi-Storey BIM IFC Parser, Unit Scaling, and 3D Massing Components.
Tests:
1. Multi-storey extraction (Ground, First, Roof) with real elevations.
2. Unit scaling (Millimeter to Meter).
3. Wall containment and base elevation per storey.
4. Slabs (floor slabs and top roof slab).
5. Structural columns per storey.
6. Architectural stairs.
7. Spaces generated / mapped with storey elevations.
"""

import sys
import os
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.plan_importer import PlanImporter
from backend.spatial_graph import SpatialBuildingModel

SAMPLE_MULTI_STOREY_IFC = """ISO-10303-21;
HEADER;
ENDSEC;
DATA;
#1 = IFCPROJECT('guid_proj', #0, 'Al-Hikma Medical Center', $, $, $, $, (#2), #3);
#2 = IFCBUILDING('guid_bld', #0, 'Medical Complex Main Tower', $, $, $, $, $, $, $, $, $);
#3 = IFCSIUNIT(*, .LENGTHUNIT., .MILLI., .METRE.);
#4 = IFCUNITASSIGNMENT((#3));

#10 = IFCBUILDINGSTOREY('st_g', #0, 'Ground Floor', $, $, #11, $, $, .ELEMENT., 0.0);
#11 = IFCLOCALPLACEMENT($, #12);
#12 = IFCAXIS2PLACEMENT3D(#13, $, $);
#13 = IFCCARTESIANPOINT((0.0, 0.0, 0.0));

#20 = IFCBUILDINGSTOREY('st_1', #0, 'First Floor', $, $, #21, $, $, .ELEMENT., 3800.0);
#21 = IFCLOCALPLACEMENT($, #22);
#22 = IFCAXIS2PLACEMENT3D(#23, $, $);
#23 = IFCCARTESIANPOINT((0.0, 0.0, 3800.0));

#30 = IFCBUILDINGSTOREY('st_2', #0, 'Roof Floor', $, $, #31, $, $, .ELEMENT., 7600.0);
#31 = IFCLOCALPLACEMENT($, #32);
#32 = IFCAXIS2PLACEMENT3D(#33, $, $);
#33 = IFCCARTESIANPOINT((0.0, 0.0, 7600.0));

#50 = IFCRELCONTAINEDINSPATIALSTRUCTURE('rel_g', #0, 'Ground Containment', $, (#100, #101, #300, #400, #600), #10);
#51 = IFCRELCONTAINEDINSPATIALSTRUCTURE('rel_1', #0, 'Level 1 Containment', $, (#200, #201, #301, #601), #20);
#52 = IFCRELCONTAINEDINSPATIALSTRUCTURE('rel_2', #0, 'Roof Containment', $, (#602), #30);

/* Ground Floor Walls */
#100 = IFCWALLSTANDARDCASE('w_g1', #0, 'Basic Wall:Exterior 300mm', $, $, #110, #120, $);
#110 = IFCLOCALPLACEMENT(#11, #111);
#111 = IFCAXIS2PLACEMENT3D(#112, $, $);
#112 = IFCCARTESIANPOINT((-18000.0, -12000.0, 0.0));
#120 = IFCPRODUCTDEFINITIONSHAPE($, $, (#121));
#121 = IFCSHAPEREPRESENTATION(#0, 'Axis', 'Curve2D', (#122));
#122 = IFCPOLYLINE((#123, #124));
#123 = IFCCARTESIANPOINT((0.0, 0.0));
#124 = IFCCARTESIANPOINT((36000.0, 0.0));

#101 = IFCWALLSTANDARDCASE('w_g2', #0, 'Basic Wall:Exterior 300mm', $, $, #130, #140, $);
#130 = IFCLOCALPLACEMENT(#11, #131);
#131 = IFCAXIS2PLACEMENT3D(#132, $, $);
#132 = IFCCARTESIANPOINT((18000.0, -12000.0, 0.0));
#140 = IFCPRODUCTDEFINITIONSHAPE($, $, (#141));
#141 = IFCSHAPEREPRESENTATION(#0, 'Axis', 'Curve2D', (#142));
#142 = IFCPOLYLINE((#143, #144));
#143 = IFCCARTESIANPOINT((0.0, 0.0));
#144 = IFCCARTESIANPOINT((0.0, 24000.0));

/* Level 1 Walls */
#200 = IFCWALLSTANDARDCASE('w_1_1', #0, 'Basic Wall:Exterior 300mm', $, $, #210, #220, $);
#210 = IFCLOCALPLACEMENT(#21, #211);
#211 = IFCAXIS2PLACEMENT3D(#212, $, $);
#212 = IFCCARTESIANPOINT((-18000.0, -12000.0, 0.0));
#220 = IFCPRODUCTDEFINITIONSHAPE($, $, (#221));
#221 = IFCSHAPEREPRESENTATION(#0, 'Axis', 'Curve2D', (#222));
#222 = IFCPOLYLINE((#223, #224));
#223 = IFCCARTESIANPOINT((0.0, 0.0));
#224 = IFCCARTESIANPOINT((36000.0, 0.0));

#201 = IFCWALLSTANDARDCASE('w_1_2', #0, 'Basic Wall:Exterior 300mm', $, $, #230, #240, $);
#230 = IFCLOCALPLACEMENT(#21, #231);
#231 = IFCAXIS2PLACEMENT3D(#232, $, $);
#232 = IFCCARTESIANPOINT((18000.0, -12000.0, 0.0));
#240 = IFCPRODUCTDEFINITIONSHAPE($, $, (#241));
#241 = IFCSHAPEREPRESENTATION(#0, 'Axis', 'Curve2D', (#242));
#242 = IFCPOLYLINE((#243, #244));
#243 = IFCCARTESIANPOINT((0.0, 0.0));
#244 = IFCCARTESIANPOINT((0.0, 24000.0));

/* Structural Columns */
#300 = IFCCOLUMN('col_1', #0, 'Square Column 500x500', $, $, #310, $, $);
#310 = IFCLOCALPLACEMENT(#11, #311);
#311 = IFCAXIS2PLACEMENT3D(#312, $, $);
#312 = IFCCARTESIANPOINT((0.0, 0.0, 0.0));

#301 = IFCCOLUMN('col_2', #0, 'Square Column 500x500', $, $, #320, $, $);
#320 = IFCLOCALPLACEMENT(#21, #321);
#321 = IFCAXIS2PLACEMENT3D(#322, $, $);
#322 = IFCCARTESIANPOINT((0.0, 0.0, 0.0));

/* Door & Window on Ground Wall */
#500 = IFCDOOR('door_1', #0, 'Main Double Door', $, $, #510, $, $, 2400.0, 1800.0);
#510 = IFCLOCALPLACEMENT(#11, #511);
#511 = IFCAXIS2PLACEMENT3D(#512, $, $);
#512 = IFCCARTESIANPOINT((0.0, -12000.0, 0.0));

#501 = IFCWINDOW('win_1', #0, 'Facade Window', $, $, #520, $, $, 1800.0, 2000.0);
#520 = IFCLOCALPLACEMENT(#11, #521);
#521 = IFCAXIS2PLACEMENT3D(#522, $, $);
#522 = IFCCARTESIANPOINT((10000.0, -12000.0, 0.0));

/* Architectural Stair */
#400 = IFCSTAIR('stair_main', #0, 'Central Concrete Staircase', $, $, #410, $, $);
#410 = IFCLOCALPLACEMENT(#11, #411);
#411 = IFCAXIS2PLACEMENT3D(#412, $, $);
#412 = IFCCARTESIANPOINT((6000.0, 2000.0, 0.0));

/* Floor Slabs & Roof */
#600 = IFCSLAB('slab_g', #0, 'Ground Floor Slab 250mm', $, $, #610, #620, $, .FLOOR.);
#610 = IFCLOCALPLACEMENT(#11, #611);
#611 = IFCAXIS2PLACEMENT3D(#612, $, $);
#612 = IFCCARTESIANPOINT((0.0, 0.0, 0.0));
#620 = IFCPRODUCTDEFINITIONSHAPE($, $, (#621));
#621 = IFCSHAPEREPRESENTATION(#0, 'Body', 'SweptSolid', (#622));
#622 = IFCEXTRUDEDAREASOLID(#623, #611, #624, 250.0);
#623 = IFCRECTANGLEPROFILEDEF(.AREA., $, $, 36000.0, 24000.0);
#624 = IFCDIRECTION((0.0, 0.0, 1.0));

#601 = IFCSLAB('slab_1', #0, 'First Floor Slab 250mm', $, $, #630, #640, $, .FLOOR.);
#630 = IFCLOCALPLACEMENT(#21, #631);
#631 = IFCAXIS2PLACEMENT3D(#632, $, $);
#632 = IFCCARTESIANPOINT((0.0, 0.0, 0.0));
#640 = IFCPRODUCTDEFINITIONSHAPE($, $, (#641));
#641 = IFCSHAPEREPRESENTATION(#0, 'Body', 'SweptSolid', (#642));
#642 = IFCEXTRUDEDAREASOLID(#643, #631, #644, 250.0);
#643 = IFCRECTANGLEPROFILEDEF(.AREA., $, $, 36000.0, 24000.0);
#644 = IFCDIRECTION((0.0, 0.0, 1.0));

#602 = IFCROOF('roof_top', #0, 'Main Concrete Roof 300mm', $, $, #650, #660, $, .FLAT_ROOF.);
#650 = IFCLOCALPLACEMENT(#31, #651);
#651 = IFCAXIS2PLACEMENT3D(#652, $, $);
#652 = IFCCARTESIANPOINT((0.0, 0.0, 0.0));
#660 = IFCPRODUCTDEFINITIONSHAPE($, $, (#661));
#661 = IFCSHAPEREPRESENTATION(#0, 'Body', 'SweptSolid', (#662));
#662 = IFCEXTRUDEDAREASOLID(#663, #651, #664, 300.0);
#663 = IFCRECTANGLEPROFILEDEF(.AREA., $, $, 36000.0, 24000.0);
#664 = IFCDIRECTION((0.0, 0.0, 1.0));

ENDSEC;
END-ISO-10303-21;"""

class TestIFCMultiStorey(unittest.TestCase):
    def test_multi_storey_parsing(self):
        parsed = PlanImporter.parse_ifc(SAMPLE_MULTI_STOREY_IFC)
        
        # 1. التحقق من الطوابق والمناسيب
        self.assertIn("storeys", parsed)
        storeys = parsed["storeys"]
        self.assertEqual(len(storeys), 3)
        elevations = [st["elevation"] for st in storeys.values()]
        self.assertEqual(elevations, [0.0, 3.8, 7.6])
        
        # 2. التحقق من تحويل الوحدات من مليمتر إلى متر
        # الجدار #100 يبدأ من -18000 ملم (-18م) بطول 36000 ملم (36م) ليصل إلى +18م
        wall_g1 = parsed["walls"]["wall_100"]
        self.assertEqual(wall_g1["start"], [-18.0, -12.0])
        self.assertEqual(wall_g1["end"], [18.0, -12.0])
        self.assertEqual(wall_g1["base_elevation"], 0.0)
        self.assertEqual(wall_g1["storey_id"], "storey_10")
        
        # الجدار في الطابق الأول #200 منسوبه 3.8م
        wall_1_1 = parsed["walls"]["wall_200"]
        self.assertEqual(wall_1_1["base_elevation"], 3.8)
        self.assertEqual(wall_1_1["storey_id"], "storey_20")
        
        # 3. التحقق من البلاطات المعمارية (Floor Slabs & Roof Slab)
        self.assertIn("slabs", parsed)
        slabs = parsed["slabs"]
        self.assertGreaterEqual(len(slabs), 3)
        self.assertTrue(any(s["type"] == "roof" for s in slabs.values()))
        
        # 4. التحقق من الأعمدة الإنشائية
        self.assertIn("columns", parsed)
        self.assertEqual(len(parsed["columns"]), 2)
        col_g = parsed["columns"]["col_300"]
        col_1 = parsed["columns"]["col_301"]
        self.assertEqual(col_g["base_elevation"], 0.0)
        self.assertEqual(col_1["base_elevation"], 3.8)
        
        # 5. التحقق من الفتحات (أبواب وشبابيك)
        self.assertIn("openings", parsed)
        self.assertIn("door_500", parsed["openings"])
        self.assertIn("win_501", parsed["openings"])
        door = parsed["openings"]["door_500"]
        self.assertEqual(door["type"], "door")
        self.assertEqual(door["width"], 1.8)
        self.assertEqual(door["height"], 2.4)
        self.assertEqual(door["wall_id"], "wall_100")
        
        # 6. التحقق من السلالم
        self.assertIn("stairs", parsed)
        self.assertIn("stair_400", parsed["stairs"])
        
        # 7. التحقق من تكامل النموذج المكاني SpatialBuildingModel
        model = SpatialBuildingModel(parsed)
        state = model.get_building_state()
        self.assertEqual(len(state["storeys"]), 3)
        self.assertEqual(len(state["walls"]), 4)
        self.assertEqual(len(state["columns"]), 2)
        self.assertEqual(len(state["slabs"]), len(slabs))

    def test_ifc_advanced_features_and_robustness(self):
        """
        اختبار متقدم للمتانة والميزات المعمارية الشاملة:
        1. مسافات قبل الفواصل المنقوطة (Trailing space before semicolon).
        2. الواجهات الستائرية الزجاجية IFCCURTAINWALL.
        3. محاور الجدران المنحنية والمقصوصة IFCTRIMMEDCURVE.
        4. الجسور الإنشائية IFCBEAM.
        5. الربط العلائقي الدقيق للفتحات IFCRELVOIDSELEMENT و IFCRELFILLSELEMENT.
        6. الفضاءات المعمارية بمواقعها الهندسية الحقيقية.
        """
        ifc_advanced_text = """ISO-10303-21;
HEADER;
ENDSEC;
DATA;
#1 = IFCPROJECT('guid_adv', #0, 'BIM Advanced Complex', $, $, $, $, (#2), #3) ;
#2 = IFCBUILDING('bld_adv', #0, 'Tower A', $, $, $, $, $, $, $, $, $) ;
#3 = IFCSIUNIT(*, .LENGTHUNIT., $, .METRE.) ;

#10 = IFCBUILDINGSTOREY('st_main', #0, 'Ground Floor', $, $, #11, $, $, .ELEMENT., 0.0) ;
#11 = IFCLOCALPLACEMENT($, #12) ;
#12 = IFCAXIS2PLACEMENT3D(#13, $, $) ;
#13 = IFCCARTESIANPOINT((0.0, 0.0, 0.0)) ;

#50 = IFCRELCONTAINEDINSPATIALSTRUCTURE('rel_main', #0, 'Storey Containment', $, (#100, #102, #103, #200, #300), #10) ;

/* 1. جدار عادي مع مسافة قبل الفاصلة المنقوطة */
#100 = IFCWALLSTANDARDCASE('w_norm', #0, 'Exterior Block Wall', $, $, #110, #120, $) ;
#110 = IFCLOCALPLACEMENT(#11, #111) ;
#111 = IFCAXIS2PLACEMENT3D(#112, $, $) ;
#112 = IFCCARTESIANPOINT((0.0, 0.0, 0.0)) ;
#120 = IFCPRODUCTDEFINITIONSHAPE($, $, (#121)) ;
#121 = IFCSHAPEREPRESENTATION(#0, 'Axis', 'Curve2D', (#122)) ;
#122 = IFCPOLYLINE((#123, #124)) ;
#123 = IFCCARTESIANPOINT((0.0, 0.0)) ;
#124 = IFCCARTESIANPOINT((20.0, 0.0)) ;

/* 2. واجهة ستائرية زجاجية IFCCURTAINWALL مع مسافات */
#102 = IFCCURTAINWALL('cw_glass', #0, 'Curtain Wall Glazing 200mm', $, $, #110, #120, $) ;

/* 3. جدار يعتمد محور IFCTRIMMEDCURVE */
#103 = IFCWALL('w_trimmed', #0, 'Curved / Trimmed Axis Wall', $, $, #110, #130, $) ;
#130 = IFCPRODUCTDEFINITIONSHAPE($, $, (#131)) ;
#131 = IFCSHAPEREPRESENTATION(#0, 'Axis', 'Curve2D', (#132)) ;
#132 = IFCTRIMMEDCURVE(#133, (#134), (#135), .T., .CARTESIAN.) ;
#133 = IFCLINE(#134, #136) ;
#134 = IFCCARTESIANPOINT((0.0, 10.0)) ;
#135 = IFCCARTESIANPOINT((20.0, 10.0)) ;
#136 = IFCVECTOR(#137, 20.0) ;
#137 = IFCDIRECTION((1.0, 0.0)) ;

/* 4. جسر إنشائي IFCBEAM */
#200 = IFCBEAM('bm_1', #0, 'Concrete Girder 400x700', $, $, #210, #220, $) ;
#210 = IFCLOCALPLACEMENT(#11, #211) ;
#211 = IFCAXIS2PLACEMENT3D(#212, $, $) ;
#212 = IFCCARTESIANPOINT((0.0, 5.0, 3.2)) ;
#220 = IFCPRODUCTDEFINITIONSHAPE($, $, (#221)) ;
#221 = IFCSHAPEREPRESENTATION(#0, 'Axis', 'Curve2D', (#222)) ;
#222 = IFCPOLYLINE((#223, #224)) ;
#223 = IFCCARTESIANPOINT((0.0, 0.0)) ;
#224 = IFCCARTESIANPOINT((15.0, 0.0)) ;

/* 5. فضاء معماري بموقع دقيق */
#300 = IFCSPACE('sp_audit', #0, 'Auditorium Hall', 'Main Auditorium', $, #310, $, .ELEMENT., .INTERNAL.) ;
#310 = IFCLOCALPLACEMENT(#11, #311) ;
#311 = IFCAXIS2PLACEMENT3D(#312, $, $) ;
#312 = IFCCARTESIANPOINT((8.0, 6.0, 0.0)) ;

/* 6. فتحة باب مع ربط علائقي IFCRELVOIDSELEMENT و IFCRELFILLSELEMENT */
#400 = IFCOPENINGELEMENT('op_1', #0, 'Wall Opening Void', $, $, #110, $, $) ;
#401 = IFCDOOR('dr_rel', #0, 'Acoustic Door', $, $, #110, $, $, 2200.0, 1000.0) ;
#500 = IFCRELVOIDSELEMENT('rel_void_1', #0, 'Void Rel', $, #100, #400) ;
#501 = IFCRELFILLSELEMENT('rel_fill_1', #0, 'Fill Rel', $, #400, #401) ;

ENDSEC;
END-ISO-10303-21;"""

        parsed = PlanImporter.parse_ifc(ifc_advanced_text)
        
        # 1. تحقق من نجاح قراءة السجلات التي تحوي مسافات قبل الفاصلة المنقوطة
        self.assertIn("walls", parsed)
        self.assertIn("wall_100", parsed["walls"])
        self.assertIn("wall_102", parsed["walls"])
        self.assertIn("wall_103", parsed["walls"])
        
        # 2. تحقق من الواجهة الستائرية
        cw = parsed["walls"]["wall_102"]
        self.assertEqual(cw["type"], "exterior")
        self.assertIn("واجهة زجاجية ستائرية", cw["name_ar"])
        
        # 3. تحقق من الجدار المعتمد على IFCTRIMMEDCURVE
        w_trim = parsed["walls"]["wall_103"]
        self.assertIsNotNone(w_trim["start"])
        self.assertIsNotNone(w_trim["end"])
        
        # 4. تحقق من استخراج الجسور الإنشائية IFCBEAM
        self.assertIn("beams", parsed)
        self.assertIn("beam_200", parsed["beams"])
        bm = parsed["beams"]["beam_200"]
        self.assertIn("جسر إنشائي", bm["name_ar"])
        self.assertEqual(bm["depth"], 0.60)
        
        # 5. تحقق من الربط العلائقي الدقيق للباب بالجدار الحاضن
        self.assertIn("openings", parsed)
        self.assertIn("door_401", parsed["openings"])
        door = parsed["openings"]["door_401"]
        self.assertEqual(door["wall_id"], "wall_100")
        
        # 6. تحقق من الفضاء المعماري
        self.assertIn("spaces", parsed)
        self.assertIn("ifc_sp_1", parsed["spaces"])

if __name__ == "__main__":
    unittest.main()
