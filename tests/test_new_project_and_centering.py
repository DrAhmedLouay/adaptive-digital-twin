# tests/test_new_project_and_centering.py
"""
Automated Unit Tests for:
1. "مشروع جديد" (New Project Creation & Clean Canvas State)
2. Universal Centering of Imported Models (IFC, DXF, JSON) at Axial Grid Origin (0, 0)
"""

import sys
import os
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.spatial_graph import SpatialBuildingModel
from backend.plan_importer import PlanImporter

class TestNewProjectAndCentering(unittest.TestCase):
    def test_create_new_project(self):
        """التحقق من إنشاء مشروع جديد وتفريغ المشهد بالكامل مع تهيئة طابق أرضي نظيف"""
        model = SpatialBuildingModel()
        self.assertGreater(len(model.spaces), 0)
        self.assertGreater(len(model.walls), 0)

        state = model.create_new_project(name_ar="مشروع برج المستقبل الذكي")

        self.assertEqual(model.name_ar, "مشروع برج المستقبل الذكي")
        self.assertEqual(model.building_type, "new_project")
        self.assertEqual(len(model.walls), 0)
        self.assertEqual(len(model.spaces), 0)
        self.assertEqual(len(model.openings), 0)
        self.assertEqual(len(model.stairs), 0)
        self.assertEqual(len(model.partitions), 0)
        self.assertEqual(len(model.slabs), 0)
        self.assertEqual(len(model.columns), 0)

        self.assertIn("storey_ground", model.storeys)
        self.assertEqual(model.storeys["storey_ground"]["elevation"], 0.0)
        self.assertEqual(state["name_ar"], "مشروع برج المستقبل الذكي")

    def test_ifc_centering_at_axial_grid_origin(self):
        """التحقق من أن ملف IFC بإحداثيات مساحية بعيدة يتم توسيطه بدقة هندسية عند (X=0, Z=0)"""
        OFFSET_IFC = """ISO-10303-21;
HEADER;
ENDSEC;
DATA;
#1 = IFCPROJECT('guid_p', #0, 'Offset Project', $, $, $, $, (#2), #3);
#2 = IFCBUILDING('guid_b', #0, 'Offset Tower', $, $, $, $, $, $, $, $, $);
#3 = IFCSIUNIT(*, .LENGTHUNIT., $, .METRE.);
#4 = IFCUNITASSIGNMENT((#3));
#10 = IFCBUILDINGSTOREY('st_g', #0, 'Ground', $, $, #11, $, $, .ELEMENT., 0.0);
#11 = IFCLOCALPLACEMENT($, #12);
#12 = IFCAXIS2PLACEMENT3D(#13, $, $);
#13 = IFCCARTESIANPOINT((0.0, 0.0, 0.0));

#50 = IFCRELCONTAINEDINSPATIALSTRUCTURE('rel_g', #0, 'Cont', $, (#100, #101, #300, #400), #10);

/* جدار 1 من (500, 300) إلى (540, 300) */
#100 = IFCWALLSTANDARDCASE('w_1', #0, 'Wall1', $, $, #110, #120, $);
#110 = IFCLOCALPLACEMENT(#11, #111);
#111 = IFCAXIS2PLACEMENT3D(#112, $, $);
#112 = IFCCARTESIANPOINT((500.0, 300.0, 0.0));
#120 = IFCPRODUCTDEFINITIONSHAPE($, $, (#121));
#121 = IFCSHAPEREPRESENTATION(#0, 'Axis', 'Curve2D', (#122));
#122 = IFCPOLYLINE((#123, #124));
#123 = IFCCARTESIANPOINT((0.0, 0.0));
#124 = IFCCARTESIANPOINT((40.0, 0.0));

/* جدار 2 من (540, 300) إلى (540, 330) */
#101 = IFCWALLSTANDARDCASE('w_2', #0, 'Wall2', $, $, #130, #140, $);
#130 = IFCLOCALPLACEMENT(#11, #131);
#131 = IFCAXIS2PLACEMENT3D(#132, $, $);
#132 = IFCCARTESIANPOINT((540.0, 300.0, 0.0));
#140 = IFCPRODUCTDEFINITIONSHAPE($, $, (#141));
#141 = IFCSHAPEREPRESENTATION(#0, 'Axis', 'Curve2D', (#142));
#142 = IFCPOLYLINE((#143, #144));
#143 = IFCCARTESIANPOINT((0.0, 0.0));
#144 = IFCCARTESIANPOINT((0.0, 30.0));

/* عمود في (520, 315) */
#300 = IFCCOLUMN('col_1', #0, 'Col1', $, $, #310, $, $);
#310 = IFCLOCALPLACEMENT(#11, #311);
#311 = IFCAXIS2PLACEMENT3D(#312, $, $);
#312 = IFCCARTESIANPOINT((520.0, 315.0, 0.0));

/* سلم في (510, 305) */
#400 = IFCSTAIR('stair_1', #0, 'Stair1', $, $, #410, $, $);
#410 = IFCLOCALPLACEMENT(#11, #411);
#411 = IFCAXIS2PLACEMENT3D(#412, $, $);
#412 = IFCCARTESIANPOINT((510.0, 305.0, 0.0));

ENDSEC;
END-ISO-10303-21;"""

        parsed = PlanImporter.parse_ifc(OFFSET_IFC)
        walls = parsed["walls"]
        self.assertIn("wall_100", walls)
        self.assertIn("wall_101", walls)

        all_xs = [w["start"][0] for w in walls.values()] + [w["end"][0] for w in walls.values()]
        all_zs = [w["start"][1] for w in walls.values()] + [w["end"][1] for w in walls.values()]

        min_x, max_x = min(all_xs), max(all_xs)
        min_z, max_z = min(all_zs), max(all_zs)

        center_x = (min_x + max_x) / 2.0
        center_z = (min_z + max_z) / 2.0

        self.assertAlmostEqual(center_x, 0.0, places=1)
        self.assertAlmostEqual(center_z, 0.0, places=1)
        self.assertEqual(min_x, -20.0)
        self.assertEqual(max_x, 20.0)
        self.assertEqual(min_z, -15.0)
        self.assertEqual(max_z, 15.0)

        col = parsed["columns"]["col_300"]
        self.assertAlmostEqual(col["position"][0], 0.0, places=1)
        self.assertAlmostEqual(col["position"][1], 0.0, places=1)

    def test_dxf_centering(self):
        """التحقق من أن مخطط DXF بإحداثيات كبيرة يتم توسيطه عند (0, 0)"""
        sample_dxf = """0
SECTION
2
ENTITIES
0
LWPOLYLINE
8
WALLS
10
1000.0
20
2000.0
10
1020.0
20
2000.0
10
1020.0
20
2030.0
0
ENDSEC
0
EOF"""
        parsed_dxf = PlanImporter.parse_dxf(sample_dxf)
        spaces = parsed_dxf["spaces"]
        self.assertGreater(len(spaces), 0)
        all_xs = [s["bounds"]["x"] + s["bounds"]["width"] / 2 for s in spaces.values()]
        all_zs = [s["bounds"]["z"] + s["bounds"]["depth"] / 2 for s in spaces.values()]
        avg_x = sum(all_xs) / len(all_xs)
        avg_z = sum(all_zs) / len(all_zs)
        self.assertAlmostEqual(avg_x, 0.0, delta=1.5)
        self.assertAlmostEqual(avg_z, 0.0, delta=1.5)

if __name__ == "__main__":
    unittest.main()
