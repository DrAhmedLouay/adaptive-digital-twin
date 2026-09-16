# tests/test_enclosed_space.py
import sys
import os
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.spatial_graph import SpatialBuildingModel

class TestEnclosedSpaceCreation(unittest.TestCase):
    def setUp(self):
        self.model = SpatialBuildingModel()
        self.model.clear_all_walls()
        self.model.spaces.clear()

    def test_triangular_space_3_walls(self):
        """فضاء مثلثي مغلق ناتج عن 3 جدران"""
        w1 = self.model.add_wall({'start': [0.0, 0.0], 'end': [6.0, 0.0], 'thickness': 0.25, 'height': 2.8, 'type': 'interior'})
        w2 = self.model.add_wall({'start': [6.0, 0.0], 'end': [3.0, 6.0], 'thickness': 0.25, 'height': 2.8, 'type': 'interior'})
        w3 = self.model.add_wall({'start': [3.0, 6.0], 'end': [0.0, 0.0], 'thickness': 0.25, 'height': 2.8, 'type': 'interior'})

        space = self.model.create_space_from_walls([w1, w2, w3], name_ar="غرفة مثلثة")
        self.assertIsNotNone(space)
        self.assertEqual(space["name_ar"], "غرفة مثلثة")
        self.assertAlmostEqual(space["area_m2"], 18.0, places=1)
        self.assertEqual(len(space["polygon"]), 3)
        self.assertAlmostEqual(space["centroid"][0], 3.0, places=1)
        self.assertAlmostEqual(space["centroid"][1], 2.0, places=1)
        self.assertIn(space["id"], self.model.spaces)

    def test_quadrilateral_space_4_walls(self):
        """فضاء رباعي / مستطيل ناتج عن 4 جدران"""
        w1 = self.model.add_wall({'start': [0.0, 0.0], 'end': [8.0, 0.0], 'thickness': 0.25, 'height': 2.8, 'type': 'interior'})
        w2 = self.model.add_wall({'start': [8.0, 0.0], 'end': [8.0, 5.0], 'thickness': 0.25, 'height': 2.8, 'type': 'interior'})
        w3 = self.model.add_wall({'start': [8.0, 5.0], 'end': [0.0, 5.0], 'thickness': 0.25, 'height': 2.8, 'type': 'interior'})
        w4 = self.model.add_wall({'start': [0.0, 5.0], 'end': [0.0, 0.0], 'thickness': 0.25, 'height': 2.8, 'type': 'interior'})

        space = self.model.create_space_from_walls([w1, w2, w3, w4], name_ar="مكتب رباعي الأضلاع")
        self.assertIsNotNone(space)
        self.assertAlmostEqual(space["area_m2"], 40.0, places=1)
        self.assertEqual(len(space["polygon"]), 4)
        self.assertAlmostEqual(space["centroid"][0], 4.0, places=1)
        self.assertAlmostEqual(space["centroid"][1], 2.5, places=1)

    def test_pentagonal_space_5_walls(self):
        """فضاء خماسي الأضلاع ناتج عن 5 جدران"""
        w1 = self.model.add_wall({'start': [0.0, 0.0], 'end': [10.0, 0.0], 'thickness': 0.25, 'height': 2.8, 'type': 'interior'})
        w2 = self.model.add_wall({'start': [10.0, 0.0], 'end': [12.0, 6.0], 'thickness': 0.25, 'height': 2.8, 'type': 'interior'})
        w3 = self.model.add_wall({'start': [12.0, 6.0], 'end': [6.0, 10.0], 'thickness': 0.25, 'height': 2.8, 'type': 'interior'})
        w4 = self.model.add_wall({'start': [6.0, 10.0], 'end': [-2.0, 6.0], 'thickness': 0.25, 'height': 2.8, 'type': 'interior'})
        w5 = self.model.add_wall({'start': [-2.0, 6.0], 'end': [0.0, 0.0], 'thickness': 0.25, 'height': 2.8, 'type': 'interior'})

        space = self.model.create_space_from_walls([w1, w2, w3, w4, w5], name_ar="قاعة خماسية الزوايا")
        self.assertIsNotNone(space)
        self.assertGreater(space["area_m2"], 50.0)
        self.assertEqual(len(space["polygon"]), 5)

    def test_insufficient_walls_rejection(self):
        """رفض تكوين فضاء من أقل من 3 جدران"""
        w1 = self.model.add_wall({'start': [0.0, 0.0], 'end': [5.0, 0.0], 'thickness': 0.25, 'height': 2.8, 'type': 'interior'})
        w2 = self.model.add_wall({'start': [5.0, 0.0], 'end': [5.0, 5.0], 'thickness': 0.25, 'height': 2.8, 'type': 'interior'})
        
        space = self.model.create_space_from_walls([w1, w2])
        self.assertIsNone(space)

    def test_open_boundary_rejection(self):
        """رفض تكوين فضاء إذا كانت الجدران لا تشكل حلقة مغلقة"""
        w1 = self.model.add_wall({'start': [0.0, 0.0], 'end': [5.0, 0.0], 'thickness': 0.25, 'height': 2.8, 'type': 'interior'})
        w2 = self.model.add_wall({'start': [5.0, 0.0], 'end': [5.0, 5.0], 'thickness': 0.25, 'height': 2.8, 'type': 'interior'})
        w3 = self.model.add_wall({'start': [5.0, 5.0], 'end': [10.0, 10.0], 'thickness': 0.25, 'height': 2.8, 'type': 'interior'})

        space = self.model.create_space_from_walls([w1, w2, w3])
        self.assertIsNone(space)

if __name__ == '__main__':
    unittest.main()
