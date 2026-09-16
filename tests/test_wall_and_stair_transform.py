# tests/test_wall_and_stair_transform.py
import sys
import os
import unittest
import math

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.spatial_graph import SpatialBuildingModel

class TestWallAndStairTransform(unittest.TestCase):
    def setUp(self):
        self.model = SpatialBuildingModel()
        self.model.clear_all_walls_and_spaces()

    def test_wall_translation(self):
        w_id = self.model.add_wall({
            "start": [0.0, 0.0],
            "end": [10.0, 0.0],
            "thickness": 0.25,
            "height": 2.8,
            "type": "interior"
        })
        op_id = self.model.add_opening({
            "wall_id": w_id,
            "type": "door",
            "position": [2.0, 0.0], # 20% of wall length
            "width": 1.2,
            "height": 2.2
        })

        # Translate wall by (5, 5)
        success = self.model.update_wall_position(w_id, [5.0, 5.0], [15.0, 5.0])
        self.assertTrue(success)
        self.assertEqual(self.model.walls[w_id]["start"], [5.0, 5.0])
        self.assertEqual(self.model.walls[w_id]["end"], [15.0, 5.0])
        # Door should translate to [7.0, 5.0] (preserving 20% offset)
        self.assertEqual(self.model.openings[op_id]["position"], [7.0, 5.0])

    def test_wall_rotation_preserves_opening_ratio(self):
        # Wall from [0, 0] to [10, 0] with door at [3, 0] (30% along wall)
        w_id = self.model.add_wall({
            "start": [0.0, 0.0],
            "end": [10.0, 0.0],
            "thickness": 0.25,
            "height": 2.8,
            "type": "interior"
        })
        op_id = self.model.add_opening({
            "wall_id": w_id,
            "type": "door",
            "position": [3.0, 0.0],
            "width": 1.2,
            "height": 2.2
        })

        # Rotate wall 90 degrees around center [5, 0]:
        # New start [5, -5], new end [5, 5]
        success = self.model.update_wall_position(w_id, [5.0, -5.0], [5.0, 5.0])
        self.assertTrue(success)
        self.assertEqual(self.model.walls[w_id]["start"], [5.0, -5.0])
        self.assertEqual(self.model.walls[w_id]["end"], [5.0, 5.0])

        # Door should be at 30% of [5, -5] -> [5, 5], which is [5.0, -2.0]
        door_pos = self.model.openings[op_id]["position"]
        self.assertAlmostEqual(door_pos[0], 5.0, places=2)
        self.assertAlmostEqual(door_pos[1], -2.0, places=2)

    def test_stair_move_and_landing_recalculation(self):
        stair_id = self.model.add_stair({
            "name_ar": "السلم الرئيسي",
            "position": [0.0, 0.0],
            "depth": 4.0,
            "rotation": 0.0
        })
        # Default landing at rotation 0: y + depth/2 = 2.0
        self.assertEqual(self.model.stairs[stair_id]["landing_pos"], [0.0, 2.0])

        # Move stair to [10.0, 20.0]
        success = self.model.update_stair(stair_id, new_position=[10.0, 20.0])
        self.assertTrue(success)
        stair = self.model.stairs[stair_id]
        self.assertEqual(stair["position"], [10.0, 20.0])
        self.assertEqual(stair["landing_pos"], [10.0, 22.0])

    def test_stair_rotation_and_landing_recalculation(self):
        stair_id = self.model.add_stair({
            "name_ar": "سلم الطوارئ",
            "position": [10.0, 10.0],
            "depth": 4.0,
            "rotation": 0.0
        })
        # Rotate 90 degrees: sin(90)*2 = 2, cos(90)*2 = 0
        # landing should be [10 + 2, 10 + 0] = [12.0, 10.0]
        success = self.model.update_stair(stair_id, new_rotation=90.0)
        self.assertTrue(success)
        stair = self.model.stairs[stair_id]
        self.assertEqual(stair["rotation"], 90.0)
        self.assertAlmostEqual(stair["landing_pos"][0], 12.0, places=2)
        self.assertAlmostEqual(stair["landing_pos"][1], 10.0, places=2)

        # Rotate to 180 degrees: sin(180)=0, cos(180)=-1 -> [10.0, 8.0]
        self.model.update_stair(stair_id, new_rotation=180.0)
        stair = self.model.stairs[stair_id]
        self.assertAlmostEqual(stair["landing_pos"][0], 10.0, places=2)
        self.assertAlmostEqual(stair["landing_pos"][1], 8.0, places=2)

    def test_invalid_updates(self):
        self.assertFalse(self.model.update_wall_position("non_existent", [0, 0], [1, 1]))
        self.assertFalse(self.model.update_stair("non_existent", new_position=[5, 5]))

if __name__ == '__main__':
    unittest.main()
