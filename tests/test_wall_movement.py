# tests/test_wall_movement.py
import sys
import os
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.spatial_graph import SpatialBuildingModel

class TestWallMovement(unittest.TestCase):
    def setUp(self):
        self.model = SpatialBuildingModel()
        self.model.clear_all_walls()

    def test_update_wall_position(self):
        w_id = self.model.add_wall({
            'start': [0.0, 0.0],
            'end': [10.0, 0.0],
            'thickness': 0.25,
            'height': 2.8,
            'type': 'interior'
        })
        self.assertIn(w_id, self.model.walls)

        d_id = self.model.add_opening({
            'wall_id': w_id,
            'type': 'door',
            'position': [5.0, 0.0],
            'width': 1.2,
            'height': 2.2
        })
        win_id = self.model.add_opening({
            'wall_id': w_id,
            'type': 'window',
            'position': [8.0, 0.0],
            'width': 1.4,
            'height': 1.4,
            'sill_height': 0.9
        })

        success = self.model.update_wall_position(w_id, [3.0, 4.0], [13.0, 4.0])
        self.assertTrue(success)

        updated_wall = self.model.walls[w_id]
        self.assertEqual(updated_wall['start'], [3.0, 4.0])
        self.assertEqual(updated_wall['end'], [13.0, 4.0])

        door = self.model.openings[d_id]
        self.assertEqual(door['position'], [8.0, 4.0])

        window = self.model.openings[win_id]
        self.assertEqual(window['position'], [11.0, 4.0])

    def test_invalid_wall_update(self):
        res = self.model.update_wall_position('non_existent_wall', [1.0, 1.0], [5.0, 1.0])
        self.assertFalse(res)

if __name__ == '__main__':
    unittest.main()
