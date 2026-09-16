# tests/test_staircase.py
import sys
import os
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.spatial_graph import SpatialBuildingModel

class TestStaircase(unittest.TestCase):
    def setUp(self):
        self.model = SpatialBuildingModel()
        self.model.clear_all_walls_and_spaces()

    def test_add_stair_defaults(self):
        stair_id = self.model.add_stair({
            "name_ar": "السلم الرئيسي",
            "position": [5.0, 10.0]
        })
        self.assertIn(stair_id, self.model.stairs)
        stair = self.model.stairs[stair_id]
        self.assertEqual(stair["width"], 2.4)
        self.assertEqual(stair["depth"], 4.5)
        self.assertEqual(stair["num_steps"], 18)
        self.assertEqual(stair["rotation"], 0.0)
        self.assertEqual(stair["landing_pos"], [5.0, 12.25])

    def test_add_stair_custom(self):
        stair_id = self.model.add_stair({
            "name_ar": "سلم طوارئ ومخرج حريق",
            "stair_type": "emergency",
            "position": [12.0, 8.0],
            "width": 1.8,
            "depth": 3.6,
            "num_steps": 16,
            "rotation": 90.0,
            "landing_pos": [12.0, 9.8]
        })
        stair = self.model.stairs[stair_id]
        self.assertEqual(stair["stair_type"], "emergency")
        self.assertEqual(stair["width"], 1.8)
        self.assertEqual(stair["depth"], 3.6)
        self.assertEqual(stair["num_steps"], 16)
        self.assertEqual(stair["rotation"], 90.0)
        self.assertEqual(stair["landing_pos"], [12.0, 9.8])

    def test_delete_stair(self):
        stair_id = self.model.add_stair({
            "name_ar": "سلم الخدمة",
            "position": [2.0, 2.0]
        })
        self.assertIn(stair_id, self.model.stairs)
        success = self.model.delete_stair(stair_id)
        self.assertTrue(success)
        self.assertNotIn(stair_id, self.model.stairs)

        # Deleting non-existent stair returns False
        self.assertFalse(self.model.delete_stair("invalid_id"))

    def test_stair_in_building_state(self):
        stair_id = self.model.add_stair({
            "name_ar": "سلم المدخل الرئيسي",
            "position": [0.0, 0.0]
        })
        state = self.model.get_building_state()
        self.assertIn("stairs", state)
        self.assertIn(stair_id, state["stairs"])

    def test_clear_all_clears_stairs(self):
        self.model.add_stair({
            "name_ar": "سلم 1",
            "position": [1.0, 1.0]
        })
        self.assertEqual(len(self.model.stairs), 1)
        self.model.clear_all_walls_and_spaces()
        self.assertEqual(len(self.model.stairs), 0)

    def test_stair_direction_modes(self):
        # Default direction is two_way
        s1 = self.model.add_stair({"name_ar": "سلم افتراضي"})
        self.assertEqual(self.model.stairs[s1]["direction"], "two_way")

        # Custom directions: up and down
        s_up = self.model.add_stair({"name_ar": "سلم صاعد", "direction": "up"})
        self.assertEqual(self.model.stairs[s_up]["direction"], "up")

        s_down = self.model.add_stair({"name_ar": "سلم نازل", "direction": "down"})
        self.assertEqual(self.model.stairs[s_down]["direction"], "down")

        # Update direction
        success = self.model.update_stair(s1, new_direction="up")
        self.assertTrue(success)
        self.assertEqual(self.model.stairs[s1]["direction"], "up")

        success = self.model.update_stair(s1, new_direction="down")
        self.assertTrue(success)
        self.assertEqual(self.model.stairs[s1]["direction"], "down")

        success = self.model.update_stair(s1, new_direction="two_way")
        self.assertTrue(success)
        self.assertEqual(self.model.stairs[s1]["direction"], "two_way")

if __name__ == '__main__':
    unittest.main()
