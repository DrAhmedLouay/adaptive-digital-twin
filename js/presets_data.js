window.__PRESETS__ = {
  "administrative_office": 
{
  "id": "administrative_office",
  "name_ar": "المبنى الإداري النموذجي (Case Study 1)",
  "name_en": "Standard Administrative Office Building",
  "building_type": "administrative",
  "spaces": {
    "reception": {
      "id": "reception",
      "name_ar": "ردهة الاستقبال الرئيسية",
      "name_en": "Main Reception Lobby",
      "type": "public",
      "capacity": 15,
      "area_m2": 48.0,
      "bounds": {
        "x": -18,
        "z": -14,
        "width": 12,
        "depth": 8,
        "height": 3.5
      },
      "color": "#4a90e2"
    },
    "waiting_hall": {
      "id": "waiting_hall",
      "name_ar": "صالة انتظار المراجعين",
      "name_en": "Public Waiting Hall",
      "type": "public",
      "capacity": 22,
      "area_m2": 66.0,
      "bounds": {
        "x": -6,
        "z": -14,
        "width": 14,
        "depth": 8,
        "height": 3.5
      },
      "color": "#f5a623"
    },
    "multi_hall_a": {
      "id": "multi_hall_a",
      "name_ar": "القاعة المتعددة المرنة (أ)",
      "name_en": "Multipurpose Hall A (Flexible)",
      "type": "flexible",
      "capacity": 20,
      "area_m2": 60.0,
      "bounds": {
        "x": 8,
        "z": -14,
        "width": 10,
        "depth": 8,
        "height": 3.5
      },
      "color": "#7ed321"
    },
    "multi_hall_b": {
      "id": "multi_hall_b",
      "name_ar": "قاعة الاجتماعات والتدريب (ب)",
      "name_en": "Meeting & Training Hall B",
      "type": "flexible",
      "capacity": 20,
      "area_m2": 60.0,
      "bounds": {
        "x": 18,
        "z": -14,
        "width": 10,
        "depth": 8,
        "height": 3.5
      },
      "color": "#9013fe"
    },
    "corridor_central": {
      "id": "corridor_central",
      "name_ar": "الشريان الحركي المركزي",
      "name_en": "Central Spine Corridor",
      "type": "circulation",
      "capacity": 40,
      "area_m2": 80.0,
      "bounds": {
        "x": -18,
        "z": -6,
        "width": 46,
        "depth": 4,
        "height": 3.5
      },
      "color": "#606060"
    },
    "corridor_bypass_south": {
      "id": "corridor_bypass_south",
      "name_ar": "ممر الحركة الالتفافي (البديل)",
      "name_en": "Southern Bypass Corridor",
      "type": "circulation",
      "capacity": 25,
      "area_m2": 45.0,
      "bounds": {
        "x": -18,
        "z": 12,
        "width": 46,
        "depth": 3,
        "height": 3.5
      },
      "color": "#505050"
    },
    "open_office_north": {
      "id": "open_office_north",
      "name_ar": "مكاتب الموظفين (الجناح الشمالي)",
      "name_en": "North Open Office",
      "type": "workspace",
      "capacity": 30,
      "area_m2": 115.0,
      "bounds": {
        "x": -18,
        "z": -2,
        "width": 22,
        "depth": 14,
        "height": 3.5
      },
      "color": "#50e3c2"
    },
    "open_office_south": {
      "id": "open_office_south",
      "name_ar": "مكاتب الموظفين (الجناح الجنوبي)",
      "name_en": "South Open Office",
      "type": "workspace",
      "capacity": 25,
      "area_m2": 95.0,
      "bounds": {
        "x": 4,
        "z": -2,
        "width": 24,
        "depth": 14,
        "height": 3.5
      },
      "color": "#4a90e2"
    },
    "break_lounge": {
      "id": "break_lounge",
      "name_ar": "استراحة الموظفين والخدمات",
      "name_en": "Staff Lounge & Amenities",
      "type": "amenity",
      "capacity": 18,
      "area_m2": 52.0,
      "bounds": {
        "x": -6,
        "z": 2,
        "width": 10,
        "depth": 10,
        "height": 3.5
      },
      "color": "#b8e986"
    }
  },
  "partitions": {
    "p_waiting_multi": {
      "id": "p_waiting_multi",
      "name_ar": "القاطع الصوتي المنزلق (صالة الانتظار - القاعة أ)",
      "between": [
        "waiting_hall",
        "multi_hall_a"
      ],
      "status": "closed",
      "position": {
        "x": 8,
        "z": -14,
        "width": 0.25,
        "depth": 8,
        "height": 3.5
      },
      "expansion_capacity": 18
    },
    "p_multi_ab": {
      "id": "p_multi_ab",
      "name_ar": "القاطع المرن بين قاعتي التدريب (أ و ب)",
      "between": [
        "multi_hall_a",
        "multi_hall_b"
      ],
      "status": "closed",
      "position": {
        "x": 18,
        "z": -14,
        "width": 0.25,
        "depth": 8,
        "height": 3.5
      },
      "expansion_capacity": 20
    }
  },
  "edges": [
    {
      "u": "reception",
      "v": "corridor_central",
      "distance": 6.0,
      "width": 2.2,
      "status": "active"
    },
    {
      "u": "waiting_hall",
      "v": "corridor_central",
      "distance": 4.5,
      "width": 2.4,
      "status": "active"
    },
    {
      "u": "waiting_hall",
      "v": "multi_hall_a",
      "distance": 2.0,
      "width": 3.0,
      "status": "closed_by_partition"
    },
    {
      "u": "multi_hall_a",
      "v": "corridor_central",
      "distance": 5.0,
      "width": 1.8,
      "status": "active"
    },
    {
      "u": "multi_hall_b",
      "v": "corridor_central",
      "distance": 5.0,
      "width": 1.8,
      "status": "active"
    },
    {
      "u": "open_office_north",
      "v": "corridor_central",
      "distance": 4.0,
      "width": 2.0,
      "status": "active"
    },
    {
      "u": "open_office_south",
      "v": "corridor_central",
      "distance": 4.0,
      "width": 2.0,
      "status": "active"
    },
    {
      "u": "break_lounge",
      "v": "corridor_central",
      "distance": 7.0,
      "width": 1.8,
      "status": "active"
    },
    {
      "u": "open_office_north",
      "v": "corridor_bypass_south",
      "distance": 7.5,
      "width": 1.8,
      "status": "active"
    },
    {
      "u": "open_office_south",
      "v": "corridor_bypass_south",
      "distance": 7.5,
      "width": 1.8,
      "status": "active"
    },
    {
      "u": "corridor_central",
      "v": "corridor_bypass_south",
      "distance": 18.0,
      "width": 2.0,
      "status": "active"
    }
  ],
  "walls": {
    "w_reception_n": {
      "id": "w_reception_n",
      "name_ar": "جدار شمالي (ردهة الاستقبال الرئيسية)",
      "start": [
        -18.0,
        -14.0
      ],
      "end": [
        -6.0,
        -14.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_reception_s": {
      "id": "w_reception_s",
      "name_ar": "جدار جنوبي (ردهة الاستقبال الرئيسية)",
      "start": [
        -18.0,
        -6.0
      ],
      "end": [
        -6.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_reception_w": {
      "id": "w_reception_w",
      "name_ar": "جدار غربي (ردهة الاستقبال الرئيسية)",
      "start": [
        -18.0,
        -14.0
      ],
      "end": [
        -18.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_reception_e": {
      "id": "w_reception_e",
      "name_ar": "جدار شرقي (ردهة الاستقبال الرئيسية)",
      "start": [
        -6.0,
        -14.0
      ],
      "end": [
        -6.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_waiting_hall_n": {
      "id": "w_waiting_hall_n",
      "name_ar": "جدار شمالي (صالة انتظار المراجعين)",
      "start": [
        -6.0,
        -14.0
      ],
      "end": [
        8.0,
        -14.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_waiting_hall_s": {
      "id": "w_waiting_hall_s",
      "name_ar": "جدار جنوبي (صالة انتظار المراجعين)",
      "start": [
        -6.0,
        -6.0
      ],
      "end": [
        8.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_waiting_hall_w": {
      "id": "w_waiting_hall_w",
      "name_ar": "جدار غربي (صالة انتظار المراجعين)",
      "start": [
        -6.0,
        -14.0
      ],
      "end": [
        -6.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_multi_hall_a_n": {
      "id": "w_multi_hall_a_n",
      "name_ar": "جدار شمالي (القاعة المتعددة المرنة (أ))",
      "start": [
        8.0,
        -14.0
      ],
      "end": [
        18.0,
        -14.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_multi_hall_a_s": {
      "id": "w_multi_hall_a_s",
      "name_ar": "جدار جنوبي (القاعة المتعددة المرنة (أ))",
      "start": [
        8.0,
        -6.0
      ],
      "end": [
        18.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_multi_hall_b_n": {
      "id": "w_multi_hall_b_n",
      "name_ar": "جدار شمالي (قاعة الاجتماعات والتدريب (ب))",
      "start": [
        18.0,
        -14.0
      ],
      "end": [
        28.0,
        -14.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_multi_hall_b_s": {
      "id": "w_multi_hall_b_s",
      "name_ar": "جدار جنوبي (قاعة الاجتماعات والتدريب (ب))",
      "start": [
        18.0,
        -6.0
      ],
      "end": [
        28.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_multi_hall_b_e": {
      "id": "w_multi_hall_b_e",
      "name_ar": "جدار شرقي (قاعة الاجتماعات والتدريب (ب))",
      "start": [
        28.0,
        -14.0
      ],
      "end": [
        28.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_corridor_central_n": {
      "id": "w_corridor_central_n",
      "name_ar": "جدار شمالي (الشريان الحركي المركزي)",
      "start": [
        -18.0,
        -6.0
      ],
      "end": [
        28.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_corridor_central_s": {
      "id": "w_corridor_central_s",
      "name_ar": "جدار جنوبي (الشريان الحركي المركزي)",
      "start": [
        -18.0,
        -2.0
      ],
      "end": [
        28.0,
        -2.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_corridor_central_w": {
      "id": "w_corridor_central_w",
      "name_ar": "جدار غربي (الشريان الحركي المركزي)",
      "start": [
        -18.0,
        -6.0
      ],
      "end": [
        -18.0,
        -2.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_corridor_central_e": {
      "id": "w_corridor_central_e",
      "name_ar": "جدار شرقي (الشريان الحركي المركزي)",
      "start": [
        28.0,
        -6.0
      ],
      "end": [
        28.0,
        -2.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_corridor_bypass_south_n": {
      "id": "w_corridor_bypass_south_n",
      "name_ar": "جدار شمالي (ممر الحركة الالتفافي (البديل))",
      "start": [
        -18.0,
        12.0
      ],
      "end": [
        28.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_corridor_bypass_south_s": {
      "id": "w_corridor_bypass_south_s",
      "name_ar": "جدار جنوبي (ممر الحركة الالتفافي (البديل))",
      "start": [
        -18.0,
        15.0
      ],
      "end": [
        28.0,
        15.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_corridor_bypass_south_w": {
      "id": "w_corridor_bypass_south_w",
      "name_ar": "جدار غربي (ممر الحركة الالتفافي (البديل))",
      "start": [
        -18.0,
        12.0
      ],
      "end": [
        -18.0,
        15.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_corridor_bypass_south_e": {
      "id": "w_corridor_bypass_south_e",
      "name_ar": "جدار شرقي (ممر الحركة الالتفافي (البديل))",
      "start": [
        28.0,
        12.0
      ],
      "end": [
        28.0,
        15.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_open_office_north_n": {
      "id": "w_open_office_north_n",
      "name_ar": "جدار شمالي (مكاتب الموظفين (الجناح الشمالي))",
      "start": [
        -18.0,
        -2.0
      ],
      "end": [
        4.0,
        -2.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_open_office_north_s": {
      "id": "w_open_office_north_s",
      "name_ar": "جدار جنوبي (مكاتب الموظفين (الجناح الشمالي))",
      "start": [
        -18.0,
        12.0
      ],
      "end": [
        4.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_open_office_north_w": {
      "id": "w_open_office_north_w",
      "name_ar": "جدار غربي (مكاتب الموظفين (الجناح الشمالي))",
      "start": [
        -18.0,
        -2.0
      ],
      "end": [
        -18.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_open_office_north_e": {
      "id": "w_open_office_north_e",
      "name_ar": "جدار شرقي (مكاتب الموظفين (الجناح الشمالي))",
      "start": [
        4.0,
        -2.0
      ],
      "end": [
        4.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_open_office_south_n": {
      "id": "w_open_office_south_n",
      "name_ar": "جدار شمالي (مكاتب الموظفين (الجناح الجنوبي))",
      "start": [
        4.0,
        -2.0
      ],
      "end": [
        28.0,
        -2.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_open_office_south_s": {
      "id": "w_open_office_south_s",
      "name_ar": "جدار جنوبي (مكاتب الموظفين (الجناح الجنوبي))",
      "start": [
        4.0,
        12.0
      ],
      "end": [
        28.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_open_office_south_w": {
      "id": "w_open_office_south_w",
      "name_ar": "جدار غربي (مكاتب الموظفين (الجناح الجنوبي))",
      "start": [
        4.0,
        -2.0
      ],
      "end": [
        4.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_open_office_south_e": {
      "id": "w_open_office_south_e",
      "name_ar": "جدار شرقي (مكاتب الموظفين (الجناح الجنوبي))",
      "start": [
        28.0,
        -2.0
      ],
      "end": [
        28.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_break_lounge_n": {
      "id": "w_break_lounge_n",
      "name_ar": "جدار شمالي (استراحة الموظفين والخدمات)",
      "start": [
        -6.0,
        2.0
      ],
      "end": [
        4.0,
        2.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_break_lounge_s": {
      "id": "w_break_lounge_s",
      "name_ar": "جدار جنوبي (استراحة الموظفين والخدمات)",
      "start": [
        -6.0,
        12.0
      ],
      "end": [
        4.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_break_lounge_w": {
      "id": "w_break_lounge_w",
      "name_ar": "جدار غربي (استراحة الموظفين والخدمات)",
      "start": [
        -6.0,
        2.0
      ],
      "end": [
        -6.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_break_lounge_e": {
      "id": "w_break_lounge_e",
      "name_ar": "جدار شرقي (استراحة الموظفين والخدمات)",
      "start": [
        4.0,
        2.0
      ],
      "end": [
        4.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    }
  },
  "openings": {
    "door_reception": {
      "id": "door_reception",
      "name_ar": "باب (ردهة الاستقبال الرئيسية)",
      "type": "door",
      "wall_id": "w_reception_s",
      "position": [
        -12.0,
        -6.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "reception",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_reception": {
      "id": "win_reception",
      "name_ar": "نافذة (ردهة الاستقبال الرئيسية)",
      "type": "window",
      "wall_id": "w_reception_n",
      "position": [
        -12.0,
        -14.0
      ],
      "width": 4.8,
      "height": 1.5,
      "sill_height": 0.9
    },
    "door_waiting_hall": {
      "id": "door_waiting_hall",
      "name_ar": "باب (صالة انتظار المراجعين)",
      "type": "door",
      "wall_id": "w_waiting_hall_s",
      "position": [
        1.0,
        -6.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "waiting_hall",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_waiting_hall": {
      "id": "win_waiting_hall",
      "name_ar": "نافذة (صالة انتظار المراجعين)",
      "type": "window",
      "wall_id": "w_waiting_hall_n",
      "position": [
        1.0,
        -14.0
      ],
      "width": 5.6,
      "height": 1.5,
      "sill_height": 0.9
    },
    "door_multi_hall_a": {
      "id": "door_multi_hall_a",
      "name_ar": "باب (القاعة المتعددة المرنة (أ))",
      "type": "door",
      "wall_id": "w_multi_hall_a_s",
      "position": [
        13.0,
        -6.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "multi_hall_a",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_multi_hall_a": {
      "id": "win_multi_hall_a",
      "name_ar": "نافذة (القاعة المتعددة المرنة (أ))",
      "type": "window",
      "wall_id": "w_multi_hall_a_n",
      "position": [
        13.0,
        -14.0
      ],
      "width": 4.0,
      "height": 1.5,
      "sill_height": 0.9
    },
    "door_multi_hall_b": {
      "id": "door_multi_hall_b",
      "name_ar": "باب (قاعة الاجتماعات والتدريب (ب))",
      "type": "door",
      "wall_id": "w_multi_hall_b_s",
      "position": [
        23.0,
        -6.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "multi_hall_b",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_multi_hall_b": {
      "id": "win_multi_hall_b",
      "name_ar": "نافذة (قاعة الاجتماعات والتدريب (ب))",
      "type": "window",
      "wall_id": "w_multi_hall_b_n",
      "position": [
        23.0,
        -14.0
      ],
      "width": 4.0,
      "height": 1.5,
      "sill_height": 0.9
    },
    "door_corridor_central": {
      "id": "door_corridor_central",
      "name_ar": "باب (الشريان الحركي المركزي)",
      "type": "door",
      "wall_id": "w_corridor_central_s",
      "position": [
        5.0,
        -2.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "corridor_central",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_corridor_central": {
      "id": "win_corridor_central",
      "name_ar": "نافذة (الشريان الحركي المركزي)",
      "type": "window",
      "wall_id": "w_corridor_central_n",
      "position": [
        5.0,
        -6.0
      ],
      "width": 18.4,
      "height": 1.5,
      "sill_height": 0.9
    },
    "door_corridor_bypass_south": {
      "id": "door_corridor_bypass_south",
      "name_ar": "باب (ممر الحركة الالتفافي (البديل))",
      "type": "door",
      "wall_id": "w_corridor_bypass_south_s",
      "position": [
        5.0,
        15.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "corridor_bypass_south",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_corridor_bypass_south": {
      "id": "win_corridor_bypass_south",
      "name_ar": "نافذة (ممر الحركة الالتفافي (البديل))",
      "type": "window",
      "wall_id": "w_corridor_bypass_south_n",
      "position": [
        5.0,
        12.0
      ],
      "width": 18.4,
      "height": 1.5,
      "sill_height": 0.9
    },
    "door_open_office_north": {
      "id": "door_open_office_north",
      "name_ar": "باب (مكاتب الموظفين (الجناح الشمالي))",
      "type": "door",
      "wall_id": "w_open_office_north_s",
      "position": [
        -7.0,
        12.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "open_office_north",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_open_office_north": {
      "id": "win_open_office_north",
      "name_ar": "نافذة (مكاتب الموظفين (الجناح الشمالي))",
      "type": "window",
      "wall_id": "w_open_office_north_n",
      "position": [
        -7.0,
        -2.0
      ],
      "width": 8.8,
      "height": 1.5,
      "sill_height": 0.9
    },
    "door_open_office_south": {
      "id": "door_open_office_south",
      "name_ar": "باب (مكاتب الموظفين (الجناح الجنوبي))",
      "type": "door",
      "wall_id": "w_open_office_south_s",
      "position": [
        16.0,
        12.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "open_office_south",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_open_office_south": {
      "id": "win_open_office_south",
      "name_ar": "نافذة (مكاتب الموظفين (الجناح الجنوبي))",
      "type": "window",
      "wall_id": "w_open_office_south_n",
      "position": [
        16.0,
        -2.0
      ],
      "width": 9.6,
      "height": 1.5,
      "sill_height": 0.9
    },
    "door_break_lounge": {
      "id": "door_break_lounge",
      "name_ar": "باب (استراحة الموظفين والخدمات)",
      "type": "door",
      "wall_id": "w_break_lounge_s",
      "position": [
        -1.0,
        12.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "break_lounge",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_break_lounge": {
      "id": "win_break_lounge",
      "name_ar": "نافذة (استراحة الموظفين والخدمات)",
      "type": "window",
      "wall_id": "w_break_lounge_n",
      "position": [
        -1.0,
        2.0
      ],
      "width": 4.0,
      "height": 1.5,
      "sill_height": 0.9
    },
    "d_main_entry": {
      "id": "d_main_entry",
      "name_ar": "المدخل الرئيسي للمبنى",
      "type": "door",
      "wall_id": "w_ext_west",
      "position": [
        -18.0,
        -10.0
      ],
      "width": 1.8,
      "height": 2.4,
      "connects": [
        "outside",
        "reception"
      ],
      "flow_capacity_per_min": 60
    },
    "d_reception_corr": {
      "id": "d_reception_corr",
      "name_ar": "باب الاستقبال إلى الممر",
      "type": "door",
      "wall_id": "w_int_corridor_n",
      "position": [
        -12.0,
        -6.0
      ],
      "width": 1.4,
      "height": 2.2,
      "connects": [
        "reception",
        "corridor_central"
      ],
      "flow_capacity_per_min": 45
    },
    "d_waiting_corr": {
      "id": "d_waiting_corr",
      "name_ar": "باب صالة الانتظار إلى الممر",
      "type": "door",
      "wall_id": "w_int_corridor_n",
      "position": [
        1.0,
        -6.0
      ],
      "width": 1.6,
      "height": 2.2,
      "connects": [
        "waiting_hall",
        "corridor_central"
      ],
      "flow_capacity_per_min": 50
    },
    "d_multi_a_corr": {
      "id": "d_multi_a_corr",
      "name_ar": "باب القاعة أ إلى الممر",
      "type": "door",
      "wall_id": "w_int_corridor_n",
      "position": [
        13.0,
        -6.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "multi_hall_a",
        "corridor_central"
      ],
      "flow_capacity_per_min": 35
    },
    "d_multi_b_corr": {
      "id": "d_multi_b_corr",
      "name_ar": "باب القاعة ب إلى الممر",
      "type": "door",
      "wall_id": "w_int_corridor_n",
      "position": [
        23.0,
        -6.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "multi_hall_b",
        "corridor_central"
      ],
      "flow_capacity_per_min": 35
    },
    "d_office_n_corr": {
      "id": "d_office_n_corr",
      "name_ar": "باب مكاتب الشمال إلى الممر",
      "type": "door",
      "wall_id": "w_int_corridor_s",
      "position": [
        -7.0,
        -2.0
      ],
      "width": 1.4,
      "height": 2.2,
      "connects": [
        "open_office_north",
        "corridor_central"
      ],
      "flow_capacity_per_min": 40
    },
    "d_office_s_corr": {
      "id": "d_office_s_corr",
      "name_ar": "باب مكاتب الجنوب إلى الممر",
      "type": "door",
      "wall_id": "w_int_corridor_s",
      "position": [
        16.0,
        -2.0
      ],
      "width": 1.4,
      "height": 2.2,
      "connects": [
        "open_office_south",
        "corridor_central"
      ],
      "flow_capacity_per_min": 40
    }
  }
},
  "healthcare_clinic": 
{
  "id": "healthcare_clinic",
  "name_ar": "مجمع الرعاية الصحية والعيادات الاستشارية (Case Study 2)",
  "name_en": "Healthcare & Outpatient Consulting Center",
  "building_type": "healthcare",
  "spaces": {
    "triage_reception": {
      "id": "triage_reception",
      "name_ar": "الاستقبال والفرز الطبي",
      "name_en": "Medical Triage & Reception",
      "type": "public",
      "capacity": 14,
      "area_m2": 42.0,
      "bounds": {
        "x": -20,
        "z": -14,
        "width": 10,
        "depth": 8,
        "height": 3.5
      },
      "color": "#00b894"
    },
    "waiting_patients": {
      "id": "waiting_patients",
      "name_ar": "صالة انتظار المرضى والمراجعين",
      "name_en": "Patient Waiting Hall",
      "type": "public",
      "capacity": 24,
      "area_m2": 72.0,
      "bounds": {
        "x": -10,
        "z": -14,
        "width": 14,
        "depth": 8,
        "height": 3.5
      },
      "color": "#e17055"
    },
    "overflow_clinic": {
      "id": "overflow_clinic",
      "name_ar": "ردهة الفحص السريع والملاحظة المرنة",
      "name_en": "Flexible Triage & Rapid Care",
      "type": "flexible",
      "capacity": 18,
      "area_m2": 54.0,
      "bounds": {
        "x": 4,
        "z": -14,
        "width": 12,
        "depth": 8,
        "height": 3.5
      },
      "color": "#0984e3"
    },
    "clinic_suites": {
      "id": "clinic_suites",
      "name_ar": "أجنحة العيادات الاستشارية التخصصية",
      "name_en": "Specialized Consultation Suites",
      "type": "workspace",
      "capacity": 20,
      "area_m2": 80.0,
      "bounds": {
        "x": 16,
        "z": -14,
        "width": 14,
        "depth": 8,
        "height": 3.5
      },
      "color": "#6c5ce7"
    },
    "corridor_clinical": {
      "id": "corridor_clinical",
      "name_ar": "الممر العلاجي المركزي",
      "name_en": "Central Clinical Spine",
      "type": "circulation",
      "capacity": 35,
      "area_m2": 75.0,
      "bounds": {
        "x": -20,
        "z": -6,
        "width": 50,
        "depth": 4,
        "height": 3.5
      },
      "color": "#636e72"
    },
    "corridor_service": {
      "id": "corridor_service",
      "name_ar": "ممر الخدمات والكادر الطبي (البديل)",
      "name_en": "Staff & Service Bypass",
      "type": "circulation",
      "capacity": 20,
      "area_m2": 40.0,
      "bounds": {
        "x": -20,
        "z": 12,
        "width": 50,
        "depth": 3,
        "height": 3.5
      },
      "color": "#2d3436"
    },
    "diagnostic_lab": {
      "id": "diagnostic_lab",
      "name_ar": "مختبر الفحوصات والصيدلية",
      "name_en": "Diagnostic Lab & Pharmacy",
      "type": "workspace",
      "capacity": 15,
      "area_m2": 65.0,
      "bounds": {
        "x": -20,
        "z": -2,
        "width": 20,
        "depth": 14,
        "height": 3.5
      },
      "color": "#00cec9"
    },
    "staff_station": {
      "id": "staff_station",
      "name_ar": "محطة التمريض واستراحة الكادر",
      "name_en": "Nursing Station & Doctors Lounge",
      "type": "amenity",
      "capacity": 16,
      "area_m2": 60.0,
      "bounds": {
        "x": 0,
        "z": -2,
        "width": 18,
        "depth": 14,
        "height": 3.5
      },
      "color": "#a29bfe"
    },
    "admin_archive": {
      "id": "admin_archive",
      "name_ar": "السجلات الطبية وإدارة المركز",
      "name_en": "Medical Records & Administration",
      "type": "workspace",
      "capacity": 12,
      "area_m2": 50.0,
      "bounds": {
        "x": 18,
        "z": -2,
        "width": 12,
        "depth": 14,
        "height": 3.5
      },
      "color": "#74b9ff"
    }
  },
  "partitions": {
    "p_waiting_overflow": {
      "id": "p_waiting_overflow",
      "name_ar": "القاطع الصحي التكيفي (صالة المرضى - ردهة الفحص المرنة)",
      "between": [
        "waiting_patients",
        "overflow_clinic"
      ],
      "status": "closed",
      "position": {
        "x": 4,
        "z": -14,
        "width": 0.25,
        "depth": 8,
        "height": 3.5
      },
      "expansion_capacity": 18
    }
  },
  "edges": [
    {
      "u": "triage_reception",
      "v": "corridor_clinical",
      "distance": 5.0,
      "width": 2.2,
      "status": "active"
    },
    {
      "u": "waiting_patients",
      "v": "corridor_clinical",
      "distance": 4.5,
      "width": 2.4,
      "status": "active"
    },
    {
      "u": "waiting_patients",
      "v": "overflow_clinic",
      "distance": 2.0,
      "width": 3.0,
      "status": "closed_by_partition"
    },
    {
      "u": "overflow_clinic",
      "v": "corridor_clinical",
      "distance": 4.5,
      "width": 2.0,
      "status": "active"
    },
    {
      "u": "clinic_suites",
      "v": "corridor_clinical",
      "distance": 5.0,
      "width": 2.0,
      "status": "active"
    },
    {
      "u": "diagnostic_lab",
      "v": "corridor_clinical",
      "distance": 4.0,
      "width": 2.0,
      "status": "active"
    },
    {
      "u": "staff_station",
      "v": "corridor_clinical",
      "distance": 4.0,
      "width": 2.0,
      "status": "active"
    },
    {
      "u": "admin_archive",
      "v": "corridor_clinical",
      "distance": 5.0,
      "width": 1.8,
      "status": "active"
    },
    {
      "u": "diagnostic_lab",
      "v": "corridor_service",
      "distance": 7.0,
      "width": 1.8,
      "status": "active"
    },
    {
      "u": "staff_station",
      "v": "corridor_service",
      "distance": 7.0,
      "width": 1.8,
      "status": "active"
    },
    {
      "u": "corridor_clinical",
      "v": "corridor_service",
      "distance": 16.0,
      "width": 2.0,
      "status": "active"
    }
  ],
  "walls": {
    "w_triage_reception_n": {
      "id": "w_triage_reception_n",
      "name_ar": "جدار شمالي (الاستقبال والفرز الطبي)",
      "start": [
        -20.0,
        -14.0
      ],
      "end": [
        -10.0,
        -14.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_triage_reception_s": {
      "id": "w_triage_reception_s",
      "name_ar": "جدار جنوبي (الاستقبال والفرز الطبي)",
      "start": [
        -20.0,
        -6.0
      ],
      "end": [
        -10.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_triage_reception_w": {
      "id": "w_triage_reception_w",
      "name_ar": "جدار غربي (الاستقبال والفرز الطبي)",
      "start": [
        -20.0,
        -14.0
      ],
      "end": [
        -20.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_triage_reception_e": {
      "id": "w_triage_reception_e",
      "name_ar": "جدار شرقي (الاستقبال والفرز الطبي)",
      "start": [
        -10.0,
        -14.0
      ],
      "end": [
        -10.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_waiting_patients_n": {
      "id": "w_waiting_patients_n",
      "name_ar": "جدار شمالي (صالة انتظار المرضى والمراجعين)",
      "start": [
        -10.0,
        -14.0
      ],
      "end": [
        4.0,
        -14.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_waiting_patients_s": {
      "id": "w_waiting_patients_s",
      "name_ar": "جدار جنوبي (صالة انتظار المرضى والمراجعين)",
      "start": [
        -10.0,
        -6.0
      ],
      "end": [
        4.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_waiting_patients_w": {
      "id": "w_waiting_patients_w",
      "name_ar": "جدار غربي (صالة انتظار المرضى والمراجعين)",
      "start": [
        -10.0,
        -14.0
      ],
      "end": [
        -10.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_overflow_clinic_n": {
      "id": "w_overflow_clinic_n",
      "name_ar": "جدار شمالي (ردهة الفحص السريع والملاحظة المرنة)",
      "start": [
        4.0,
        -14.0
      ],
      "end": [
        16.0,
        -14.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_overflow_clinic_s": {
      "id": "w_overflow_clinic_s",
      "name_ar": "جدار جنوبي (ردهة الفحص السريع والملاحظة المرنة)",
      "start": [
        4.0,
        -6.0
      ],
      "end": [
        16.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_overflow_clinic_e": {
      "id": "w_overflow_clinic_e",
      "name_ar": "جدار شرقي (ردهة الفحص السريع والملاحظة المرنة)",
      "start": [
        16.0,
        -14.0
      ],
      "end": [
        16.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_clinic_suites_n": {
      "id": "w_clinic_suites_n",
      "name_ar": "جدار شمالي (أجنحة العيادات الاستشارية التخصصية)",
      "start": [
        16.0,
        -14.0
      ],
      "end": [
        30.0,
        -14.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_clinic_suites_s": {
      "id": "w_clinic_suites_s",
      "name_ar": "جدار جنوبي (أجنحة العيادات الاستشارية التخصصية)",
      "start": [
        16.0,
        -6.0
      ],
      "end": [
        30.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_clinic_suites_w": {
      "id": "w_clinic_suites_w",
      "name_ar": "جدار غربي (أجنحة العيادات الاستشارية التخصصية)",
      "start": [
        16.0,
        -14.0
      ],
      "end": [
        16.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_clinic_suites_e": {
      "id": "w_clinic_suites_e",
      "name_ar": "جدار شرقي (أجنحة العيادات الاستشارية التخصصية)",
      "start": [
        30.0,
        -14.0
      ],
      "end": [
        30.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_corridor_clinical_n": {
      "id": "w_corridor_clinical_n",
      "name_ar": "جدار شمالي (الممر العلاجي المركزي)",
      "start": [
        -20.0,
        -6.0
      ],
      "end": [
        30.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_corridor_clinical_s": {
      "id": "w_corridor_clinical_s",
      "name_ar": "جدار جنوبي (الممر العلاجي المركزي)",
      "start": [
        -20.0,
        -2.0
      ],
      "end": [
        30.0,
        -2.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_corridor_clinical_w": {
      "id": "w_corridor_clinical_w",
      "name_ar": "جدار غربي (الممر العلاجي المركزي)",
      "start": [
        -20.0,
        -6.0
      ],
      "end": [
        -20.0,
        -2.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_corridor_clinical_e": {
      "id": "w_corridor_clinical_e",
      "name_ar": "جدار شرقي (الممر العلاجي المركزي)",
      "start": [
        30.0,
        -6.0
      ],
      "end": [
        30.0,
        -2.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_corridor_service_n": {
      "id": "w_corridor_service_n",
      "name_ar": "جدار شمالي (ممر الخدمات والكادر الطبي (البديل))",
      "start": [
        -20.0,
        12.0
      ],
      "end": [
        30.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_corridor_service_s": {
      "id": "w_corridor_service_s",
      "name_ar": "جدار جنوبي (ممر الخدمات والكادر الطبي (البديل))",
      "start": [
        -20.0,
        15.0
      ],
      "end": [
        30.0,
        15.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_corridor_service_w": {
      "id": "w_corridor_service_w",
      "name_ar": "جدار غربي (ممر الخدمات والكادر الطبي (البديل))",
      "start": [
        -20.0,
        12.0
      ],
      "end": [
        -20.0,
        15.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_corridor_service_e": {
      "id": "w_corridor_service_e",
      "name_ar": "جدار شرقي (ممر الخدمات والكادر الطبي (البديل))",
      "start": [
        30.0,
        12.0
      ],
      "end": [
        30.0,
        15.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_diagnostic_lab_n": {
      "id": "w_diagnostic_lab_n",
      "name_ar": "جدار شمالي (مختبر الفحوصات والصيدلية)",
      "start": [
        -20.0,
        -2.0
      ],
      "end": [
        0.0,
        -2.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_diagnostic_lab_s": {
      "id": "w_diagnostic_lab_s",
      "name_ar": "جدار جنوبي (مختبر الفحوصات والصيدلية)",
      "start": [
        -20.0,
        12.0
      ],
      "end": [
        0.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_diagnostic_lab_w": {
      "id": "w_diagnostic_lab_w",
      "name_ar": "جدار غربي (مختبر الفحوصات والصيدلية)",
      "start": [
        -20.0,
        -2.0
      ],
      "end": [
        -20.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_diagnostic_lab_e": {
      "id": "w_diagnostic_lab_e",
      "name_ar": "جدار شرقي (مختبر الفحوصات والصيدلية)",
      "start": [
        0.0,
        -2.0
      ],
      "end": [
        0.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_staff_station_n": {
      "id": "w_staff_station_n",
      "name_ar": "جدار شمالي (محطة التمريض واستراحة الكادر)",
      "start": [
        0.0,
        -2.0
      ],
      "end": [
        18.0,
        -2.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_staff_station_s": {
      "id": "w_staff_station_s",
      "name_ar": "جدار جنوبي (محطة التمريض واستراحة الكادر)",
      "start": [
        0.0,
        12.0
      ],
      "end": [
        18.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_staff_station_w": {
      "id": "w_staff_station_w",
      "name_ar": "جدار غربي (محطة التمريض واستراحة الكادر)",
      "start": [
        0.0,
        -2.0
      ],
      "end": [
        0.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_staff_station_e": {
      "id": "w_staff_station_e",
      "name_ar": "جدار شرقي (محطة التمريض واستراحة الكادر)",
      "start": [
        18.0,
        -2.0
      ],
      "end": [
        18.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_admin_archive_n": {
      "id": "w_admin_archive_n",
      "name_ar": "جدار شمالي (السجلات الطبية وإدارة المركز)",
      "start": [
        18.0,
        -2.0
      ],
      "end": [
        30.0,
        -2.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_admin_archive_s": {
      "id": "w_admin_archive_s",
      "name_ar": "جدار جنوبي (السجلات الطبية وإدارة المركز)",
      "start": [
        18.0,
        12.0
      ],
      "end": [
        30.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_admin_archive_w": {
      "id": "w_admin_archive_w",
      "name_ar": "جدار غربي (السجلات الطبية وإدارة المركز)",
      "start": [
        18.0,
        -2.0
      ],
      "end": [
        18.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_admin_archive_e": {
      "id": "w_admin_archive_e",
      "name_ar": "جدار شرقي (السجلات الطبية وإدارة المركز)",
      "start": [
        30.0,
        -2.0
      ],
      "end": [
        30.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    }
  },
  "openings": {
    "door_triage_reception": {
      "id": "door_triage_reception",
      "name_ar": "باب (الاستقبال والفرز الطبي)",
      "type": "door",
      "wall_id": "w_triage_reception_s",
      "position": [
        -15.0,
        -6.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "triage_reception",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_triage_reception": {
      "id": "win_triage_reception",
      "name_ar": "نافذة (الاستقبال والفرز الطبي)",
      "type": "window",
      "wall_id": "w_triage_reception_n",
      "position": [
        -15.0,
        -14.0
      ],
      "width": 4.0,
      "height": 1.5,
      "sill_height": 0.9
    },
    "door_waiting_patients": {
      "id": "door_waiting_patients",
      "name_ar": "باب (صالة انتظار المرضى والمراجعين)",
      "type": "door",
      "wall_id": "w_waiting_patients_s",
      "position": [
        -3.0,
        -6.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "waiting_patients",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_waiting_patients": {
      "id": "win_waiting_patients",
      "name_ar": "نافذة (صالة انتظار المرضى والمراجعين)",
      "type": "window",
      "wall_id": "w_waiting_patients_n",
      "position": [
        -3.0,
        -14.0
      ],
      "width": 5.6,
      "height": 1.5,
      "sill_height": 0.9
    },
    "door_overflow_clinic": {
      "id": "door_overflow_clinic",
      "name_ar": "باب (ردهة الفحص السريع والملاحظة المرنة)",
      "type": "door",
      "wall_id": "w_overflow_clinic_s",
      "position": [
        10.0,
        -6.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "overflow_clinic",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_overflow_clinic": {
      "id": "win_overflow_clinic",
      "name_ar": "نافذة (ردهة الفحص السريع والملاحظة المرنة)",
      "type": "window",
      "wall_id": "w_overflow_clinic_n",
      "position": [
        10.0,
        -14.0
      ],
      "width": 4.8,
      "height": 1.5,
      "sill_height": 0.9
    },
    "door_clinic_suites": {
      "id": "door_clinic_suites",
      "name_ar": "باب (أجنحة العيادات الاستشارية التخصصية)",
      "type": "door",
      "wall_id": "w_clinic_suites_s",
      "position": [
        23.0,
        -6.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "clinic_suites",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_clinic_suites": {
      "id": "win_clinic_suites",
      "name_ar": "نافذة (أجنحة العيادات الاستشارية التخصصية)",
      "type": "window",
      "wall_id": "w_clinic_suites_n",
      "position": [
        23.0,
        -14.0
      ],
      "width": 5.6,
      "height": 1.5,
      "sill_height": 0.9
    },
    "door_corridor_clinical": {
      "id": "door_corridor_clinical",
      "name_ar": "باب (الممر العلاجي المركزي)",
      "type": "door",
      "wall_id": "w_corridor_clinical_s",
      "position": [
        5.0,
        -2.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "corridor_clinical",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_corridor_clinical": {
      "id": "win_corridor_clinical",
      "name_ar": "نافذة (الممر العلاجي المركزي)",
      "type": "window",
      "wall_id": "w_corridor_clinical_n",
      "position": [
        5.0,
        -6.0
      ],
      "width": 20.0,
      "height": 1.5,
      "sill_height": 0.9
    },
    "door_corridor_service": {
      "id": "door_corridor_service",
      "name_ar": "باب (ممر الخدمات والكادر الطبي (البديل))",
      "type": "door",
      "wall_id": "w_corridor_service_s",
      "position": [
        5.0,
        15.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "corridor_service",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_corridor_service": {
      "id": "win_corridor_service",
      "name_ar": "نافذة (ممر الخدمات والكادر الطبي (البديل))",
      "type": "window",
      "wall_id": "w_corridor_service_n",
      "position": [
        5.0,
        12.0
      ],
      "width": 20.0,
      "height": 1.5,
      "sill_height": 0.9
    },
    "door_diagnostic_lab": {
      "id": "door_diagnostic_lab",
      "name_ar": "باب (مختبر الفحوصات والصيدلية)",
      "type": "door",
      "wall_id": "w_diagnostic_lab_s",
      "position": [
        -10.0,
        12.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "diagnostic_lab",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_diagnostic_lab": {
      "id": "win_diagnostic_lab",
      "name_ar": "نافذة (مختبر الفحوصات والصيدلية)",
      "type": "window",
      "wall_id": "w_diagnostic_lab_n",
      "position": [
        -10.0,
        -2.0
      ],
      "width": 8.0,
      "height": 1.5,
      "sill_height": 0.9
    },
    "door_staff_station": {
      "id": "door_staff_station",
      "name_ar": "باب (محطة التمريض واستراحة الكادر)",
      "type": "door",
      "wall_id": "w_staff_station_s",
      "position": [
        9.0,
        12.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "staff_station",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_staff_station": {
      "id": "win_staff_station",
      "name_ar": "نافذة (محطة التمريض واستراحة الكادر)",
      "type": "window",
      "wall_id": "w_staff_station_n",
      "position": [
        9.0,
        -2.0
      ],
      "width": 7.2,
      "height": 1.5,
      "sill_height": 0.9
    },
    "door_admin_archive": {
      "id": "door_admin_archive",
      "name_ar": "باب (السجلات الطبية وإدارة المركز)",
      "type": "door",
      "wall_id": "w_admin_archive_s",
      "position": [
        24.0,
        12.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "admin_archive",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_admin_archive": {
      "id": "win_admin_archive",
      "name_ar": "نافذة (السجلات الطبية وإدارة المركز)",
      "type": "window",
      "wall_id": "w_admin_archive_n",
      "position": [
        24.0,
        -2.0
      ],
      "width": 4.8,
      "height": 1.5,
      "sill_height": 0.9
    }
  }
},
  "public_service_center": 
{
  "id": "public_service_center",
  "name_ar": "دائرة الأحوال المدنية والخدمات العامة (Case Study 3)",
  "name_en": "Civil Affairs & Public Citizen Services Center",
  "building_type": "government_service",
  "spaces": {
    "security_entrance": {
      "id": "security_entrance",
      "name_ar": "بوابة التحقق والاستعلامات",
      "name_en": "Security Check & Information Desk",
      "type": "public",
      "capacity": 20,
      "area_m2": 55.0,
      "bounds": {
        "x": -22,
        "z": -14,
        "width": 12,
        "depth": 8,
        "height": 3.5
      },
      "color": "#0984e3"
    },
    "citizen_grand_hall": {
      "id": "citizen_grand_hall",
      "name_ar": "صالة المراجعين الكبرى",
      "name_en": "Grand Citizen Waiting & Service Hall",
      "type": "public",
      "capacity": 45,
      "area_m2": 140.0,
      "bounds": {
        "x": -10,
        "z": -14,
        "width": 18,
        "depth": 8,
        "height": 3.5
      },
      "color": "#d63031"
    },
    "overflow_service_annex": {
      "id": "overflow_service_annex",
      "name_ar": "الجناح الخدمي التكيفي الملحق",
      "name_en": "Flexible Overflow Civic Annex",
      "type": "flexible",
      "capacity": 25,
      "area_m2": 75.0,
      "bounds": {
        "x": 8,
        "z": -14,
        "width": 12,
        "depth": 8,
        "height": 3.5
      },
      "color": "#00b894"
    },
    "vip_delegates": {
      "id": "vip_delegates",
      "name_ar": "قاعة كبار السن واللجان الخاصة",
      "name_en": "Priority Citizens & Special Committee",
      "type": "flexible",
      "capacity": 15,
      "area_m2": 50.0,
      "bounds": {
        "x": 20,
        "z": -14,
        "width": 10,
        "depth": 8,
        "height": 3.5
      },
      "color": "#fdcb6e"
    },
    "corridor_spine": {
      "id": "corridor_spine",
      "name_ar": "شريان التدفق الجماهيري الرئيسي",
      "name_en": "Main Citizen Circulation Spine",
      "type": "circulation",
      "capacity": 55,
      "area_m2": 95.0,
      "bounds": {
        "x": -22,
        "z": -6,
        "width": 52,
        "depth": 4,
        "height": 3.5
      },
      "color": "#636e72"
    },
    "corridor_fast_exit": {
      "id": "corridor_fast_exit",
      "name_ar": "مسار الإخلاء والخروج السريع",
      "name_en": "Fast Exit & Evacuation Bypass",
      "type": "circulation",
      "capacity": 30,
      "area_m2": 50.0,
      "bounds": {
        "x": -22,
        "z": 12,
        "width": 52,
        "depth": 3,
        "height": 3.5
      },
      "color": "#2d3436"
    },
    "counters_workzone": {
      "id": "counters_workzone",
      "name_ar": "كاونترات الموظفين وإنجاز المعاملات",
      "name_en": "Staff Processing & Counter Stations",
      "type": "workspace",
      "capacity": 35,
      "area_m2": 125.0,
      "bounds": {
        "x": -22,
        "z": -2,
        "width": 26,
        "depth": 14,
        "height": 3.5
      },
      "color": "#e17055"
    },
    "archive_server": {
      "id": "archive_server",
      "name_ar": "الأرشيف الرقمي والسجلات الوطنية",
      "name_en": "Central Archive & Data Servers",
      "type": "workspace",
      "capacity": 10,
      "area_m2": 45.0,
      "bounds": {
        "x": 4,
        "z": -2,
        "width": 14,
        "depth": 14,
        "height": 3.5
      },
      "color": "#6c5ce7"
    },
    "staff_amenity": {
      "id": "staff_amenity",
      "name_ar": "استراحة الموظفين وغرفة التحكم",
      "name_en": "Staff Lounge & Facility Control",
      "type": "amenity",
      "capacity": 18,
      "area_m2": 55.0,
      "bounds": {
        "x": 18,
        "z": -2,
        "width": 12,
        "depth": 14,
        "height": 3.5
      },
      "color": "#55efc4"
    }
  },
  "partitions": {
    "p_hall_annex": {
      "id": "p_hall_annex",
      "name_ar": "القاطع الهيدروليكي المرن (الصالة الكبرى - الجناح الخدمي)",
      "between": [
        "citizen_grand_hall",
        "overflow_service_annex"
      ],
      "status": "closed",
      "position": {
        "x": 8,
        "z": -14,
        "width": 0.25,
        "depth": 8,
        "height": 3.5
      },
      "expansion_capacity": 25
    }
  },
  "edges": [
    {
      "u": "security_entrance",
      "v": "corridor_spine",
      "distance": 5.0,
      "width": 2.4,
      "status": "active"
    },
    {
      "u": "citizen_grand_hall",
      "v": "corridor_spine",
      "distance": 4.5,
      "width": 3.0,
      "status": "active"
    },
    {
      "u": "citizen_grand_hall",
      "v": "overflow_service_annex",
      "distance": 2.0,
      "width": 4.0,
      "status": "closed_by_partition"
    },
    {
      "u": "overflow_service_annex",
      "v": "corridor_spine",
      "distance": 4.5,
      "width": 2.2,
      "status": "active"
    },
    {
      "u": "vip_delegates",
      "v": "corridor_spine",
      "distance": 5.0,
      "width": 2.0,
      "status": "active"
    },
    {
      "u": "counters_workzone",
      "v": "corridor_spine",
      "distance": 4.0,
      "width": 2.4,
      "status": "active"
    },
    {
      "u": "archive_server",
      "v": "corridor_spine",
      "distance": 4.0,
      "width": 1.8,
      "status": "active"
    },
    {
      "u": "staff_amenity",
      "v": "corridor_spine",
      "distance": 5.0,
      "width": 1.8,
      "status": "active"
    },
    {
      "u": "counters_workzone",
      "v": "corridor_fast_exit",
      "distance": 8.0,
      "width": 2.0,
      "status": "active"
    },
    {
      "u": "archive_server",
      "v": "corridor_fast_exit",
      "distance": 8.0,
      "width": 2.0,
      "status": "active"
    },
    {
      "u": "corridor_spine",
      "v": "corridor_fast_exit",
      "distance": 18.0,
      "width": 2.4,
      "status": "active"
    }
  ],
  "walls": {
    "w_security_entrance_n": {
      "id": "w_security_entrance_n",
      "name_ar": "جدار شمالي (بوابة التحقق والاستعلامات)",
      "start": [
        -22.0,
        -14.0
      ],
      "end": [
        -10.0,
        -14.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_security_entrance_s": {
      "id": "w_security_entrance_s",
      "name_ar": "جدار جنوبي (بوابة التحقق والاستعلامات)",
      "start": [
        -22.0,
        -6.0
      ],
      "end": [
        -10.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_security_entrance_w": {
      "id": "w_security_entrance_w",
      "name_ar": "جدار غربي (بوابة التحقق والاستعلامات)",
      "start": [
        -22.0,
        -14.0
      ],
      "end": [
        -22.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_security_entrance_e": {
      "id": "w_security_entrance_e",
      "name_ar": "جدار شرقي (بوابة التحقق والاستعلامات)",
      "start": [
        -10.0,
        -14.0
      ],
      "end": [
        -10.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_citizen_grand_hall_n": {
      "id": "w_citizen_grand_hall_n",
      "name_ar": "جدار شمالي (صالة المراجعين الكبرى)",
      "start": [
        -10.0,
        -14.0
      ],
      "end": [
        8.0,
        -14.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_citizen_grand_hall_s": {
      "id": "w_citizen_grand_hall_s",
      "name_ar": "جدار جنوبي (صالة المراجعين الكبرى)",
      "start": [
        -10.0,
        -6.0
      ],
      "end": [
        8.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_citizen_grand_hall_w": {
      "id": "w_citizen_grand_hall_w",
      "name_ar": "جدار غربي (صالة المراجعين الكبرى)",
      "start": [
        -10.0,
        -14.0
      ],
      "end": [
        -10.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_overflow_service_annex_n": {
      "id": "w_overflow_service_annex_n",
      "name_ar": "جدار شمالي (الجناح الخدمي التكيفي الملحق)",
      "start": [
        8.0,
        -14.0
      ],
      "end": [
        20.0,
        -14.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_overflow_service_annex_s": {
      "id": "w_overflow_service_annex_s",
      "name_ar": "جدار جنوبي (الجناح الخدمي التكيفي الملحق)",
      "start": [
        8.0,
        -6.0
      ],
      "end": [
        20.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_overflow_service_annex_e": {
      "id": "w_overflow_service_annex_e",
      "name_ar": "جدار شرقي (الجناح الخدمي التكيفي الملحق)",
      "start": [
        20.0,
        -14.0
      ],
      "end": [
        20.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_vip_delegates_n": {
      "id": "w_vip_delegates_n",
      "name_ar": "جدار شمالي (قاعة كبار السن واللجان الخاصة)",
      "start": [
        20.0,
        -14.0
      ],
      "end": [
        30.0,
        -14.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_vip_delegates_s": {
      "id": "w_vip_delegates_s",
      "name_ar": "جدار جنوبي (قاعة كبار السن واللجان الخاصة)",
      "start": [
        20.0,
        -6.0
      ],
      "end": [
        30.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_vip_delegates_w": {
      "id": "w_vip_delegates_w",
      "name_ar": "جدار غربي (قاعة كبار السن واللجان الخاصة)",
      "start": [
        20.0,
        -14.0
      ],
      "end": [
        20.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_vip_delegates_e": {
      "id": "w_vip_delegates_e",
      "name_ar": "جدار شرقي (قاعة كبار السن واللجان الخاصة)",
      "start": [
        30.0,
        -14.0
      ],
      "end": [
        30.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_corridor_spine_n": {
      "id": "w_corridor_spine_n",
      "name_ar": "جدار شمالي (شريان التدفق الجماهيري الرئيسي)",
      "start": [
        -22.0,
        -6.0
      ],
      "end": [
        30.0,
        -6.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_corridor_spine_s": {
      "id": "w_corridor_spine_s",
      "name_ar": "جدار جنوبي (شريان التدفق الجماهيري الرئيسي)",
      "start": [
        -22.0,
        -2.0
      ],
      "end": [
        30.0,
        -2.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_corridor_spine_w": {
      "id": "w_corridor_spine_w",
      "name_ar": "جدار غربي (شريان التدفق الجماهيري الرئيسي)",
      "start": [
        -22.0,
        -6.0
      ],
      "end": [
        -22.0,
        -2.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_corridor_spine_e": {
      "id": "w_corridor_spine_e",
      "name_ar": "جدار شرقي (شريان التدفق الجماهيري الرئيسي)",
      "start": [
        30.0,
        -6.0
      ],
      "end": [
        30.0,
        -2.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_corridor_fast_exit_n": {
      "id": "w_corridor_fast_exit_n",
      "name_ar": "جدار شمالي (مسار الإخلاء والخروج السريع)",
      "start": [
        -22.0,
        12.0
      ],
      "end": [
        30.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_corridor_fast_exit_s": {
      "id": "w_corridor_fast_exit_s",
      "name_ar": "جدار جنوبي (مسار الإخلاء والخروج السريع)",
      "start": [
        -22.0,
        15.0
      ],
      "end": [
        30.0,
        15.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_corridor_fast_exit_w": {
      "id": "w_corridor_fast_exit_w",
      "name_ar": "جدار غربي (مسار الإخلاء والخروج السريع)",
      "start": [
        -22.0,
        12.0
      ],
      "end": [
        -22.0,
        15.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_corridor_fast_exit_e": {
      "id": "w_corridor_fast_exit_e",
      "name_ar": "جدار شرقي (مسار الإخلاء والخروج السريع)",
      "start": [
        30.0,
        12.0
      ],
      "end": [
        30.0,
        15.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_counters_workzone_n": {
      "id": "w_counters_workzone_n",
      "name_ar": "جدار شمالي (كاونترات الموظفين وإنجاز المعاملات)",
      "start": [
        -22.0,
        -2.0
      ],
      "end": [
        4.0,
        -2.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_counters_workzone_s": {
      "id": "w_counters_workzone_s",
      "name_ar": "جدار جنوبي (كاونترات الموظفين وإنجاز المعاملات)",
      "start": [
        -22.0,
        12.0
      ],
      "end": [
        4.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_counters_workzone_w": {
      "id": "w_counters_workzone_w",
      "name_ar": "جدار غربي (كاونترات الموظفين وإنجاز المعاملات)",
      "start": [
        -22.0,
        -2.0
      ],
      "end": [
        -22.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_counters_workzone_e": {
      "id": "w_counters_workzone_e",
      "name_ar": "جدار شرقي (كاونترات الموظفين وإنجاز المعاملات)",
      "start": [
        4.0,
        -2.0
      ],
      "end": [
        4.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_archive_server_n": {
      "id": "w_archive_server_n",
      "name_ar": "جدار شمالي (الأرشيف الرقمي والسجلات الوطنية)",
      "start": [
        4.0,
        -2.0
      ],
      "end": [
        18.0,
        -2.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_archive_server_s": {
      "id": "w_archive_server_s",
      "name_ar": "جدار جنوبي (الأرشيف الرقمي والسجلات الوطنية)",
      "start": [
        4.0,
        12.0
      ],
      "end": [
        18.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_archive_server_w": {
      "id": "w_archive_server_w",
      "name_ar": "جدار غربي (الأرشيف الرقمي والسجلات الوطنية)",
      "start": [
        4.0,
        -2.0
      ],
      "end": [
        4.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_archive_server_e": {
      "id": "w_archive_server_e",
      "name_ar": "جدار شرقي (الأرشيف الرقمي والسجلات الوطنية)",
      "start": [
        18.0,
        -2.0
      ],
      "end": [
        18.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_staff_amenity_n": {
      "id": "w_staff_amenity_n",
      "name_ar": "جدار شمالي (استراحة الموظفين وغرفة التحكم)",
      "start": [
        18.0,
        -2.0
      ],
      "end": [
        30.0,
        -2.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "exterior"
    },
    "w_staff_amenity_s": {
      "id": "w_staff_amenity_s",
      "name_ar": "جدار جنوبي (استراحة الموظفين وغرفة التحكم)",
      "start": [
        18.0,
        12.0
      ],
      "end": [
        30.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_staff_amenity_w": {
      "id": "w_staff_amenity_w",
      "name_ar": "جدار غربي (استراحة الموظفين وغرفة التحكم)",
      "start": [
        18.0,
        -2.0
      ],
      "end": [
        18.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    },
    "w_staff_amenity_e": {
      "id": "w_staff_amenity_e",
      "name_ar": "جدار شرقي (استراحة الموظفين وغرفة التحكم)",
      "start": [
        30.0,
        -2.0
      ],
      "end": [
        30.0,
        12.0
      ],
      "thickness": 0.25,
      "height": 3.0,
      "type": "interior"
    }
  },
  "openings": {
    "door_security_entrance": {
      "id": "door_security_entrance",
      "name_ar": "باب (بوابة التحقق والاستعلامات)",
      "type": "door",
      "wall_id": "w_security_entrance_s",
      "position": [
        -16.0,
        -6.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "security_entrance",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_security_entrance": {
      "id": "win_security_entrance",
      "name_ar": "نافذة (بوابة التحقق والاستعلامات)",
      "type": "window",
      "wall_id": "w_security_entrance_n",
      "position": [
        -16.0,
        -14.0
      ],
      "width": 4.8,
      "height": 1.5,
      "sill_height": 0.9
    },
    "door_citizen_grand_hall": {
      "id": "door_citizen_grand_hall",
      "name_ar": "باب (صالة المراجعين الكبرى)",
      "type": "door",
      "wall_id": "w_citizen_grand_hall_s",
      "position": [
        -1.0,
        -6.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "citizen_grand_hall",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_citizen_grand_hall": {
      "id": "win_citizen_grand_hall",
      "name_ar": "نافذة (صالة المراجعين الكبرى)",
      "type": "window",
      "wall_id": "w_citizen_grand_hall_n",
      "position": [
        -1.0,
        -14.0
      ],
      "width": 7.2,
      "height": 1.5,
      "sill_height": 0.9
    },
    "door_overflow_service_annex": {
      "id": "door_overflow_service_annex",
      "name_ar": "باب (الجناح الخدمي التكيفي الملحق)",
      "type": "door",
      "wall_id": "w_overflow_service_annex_s",
      "position": [
        14.0,
        -6.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "overflow_service_annex",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_overflow_service_annex": {
      "id": "win_overflow_service_annex",
      "name_ar": "نافذة (الجناح الخدمي التكيفي الملحق)",
      "type": "window",
      "wall_id": "w_overflow_service_annex_n",
      "position": [
        14.0,
        -14.0
      ],
      "width": 4.8,
      "height": 1.5,
      "sill_height": 0.9
    },
    "door_vip_delegates": {
      "id": "door_vip_delegates",
      "name_ar": "باب (قاعة كبار السن واللجان الخاصة)",
      "type": "door",
      "wall_id": "w_vip_delegates_s",
      "position": [
        25.0,
        -6.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "vip_delegates",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_vip_delegates": {
      "id": "win_vip_delegates",
      "name_ar": "نافذة (قاعة كبار السن واللجان الخاصة)",
      "type": "window",
      "wall_id": "w_vip_delegates_n",
      "position": [
        25.0,
        -14.0
      ],
      "width": 4.0,
      "height": 1.5,
      "sill_height": 0.9
    },
    "door_corridor_spine": {
      "id": "door_corridor_spine",
      "name_ar": "باب (شريان التدفق الجماهيري الرئيسي)",
      "type": "door",
      "wall_id": "w_corridor_spine_s",
      "position": [
        4.0,
        -2.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "corridor_spine",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_corridor_spine": {
      "id": "win_corridor_spine",
      "name_ar": "نافذة (شريان التدفق الجماهيري الرئيسي)",
      "type": "window",
      "wall_id": "w_corridor_spine_n",
      "position": [
        4.0,
        -6.0
      ],
      "width": 20.8,
      "height": 1.5,
      "sill_height": 0.9
    },
    "door_corridor_fast_exit": {
      "id": "door_corridor_fast_exit",
      "name_ar": "باب (مسار الإخلاء والخروج السريع)",
      "type": "door",
      "wall_id": "w_corridor_fast_exit_s",
      "position": [
        4.0,
        15.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "corridor_fast_exit",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_corridor_fast_exit": {
      "id": "win_corridor_fast_exit",
      "name_ar": "نافذة (مسار الإخلاء والخروج السريع)",
      "type": "window",
      "wall_id": "w_corridor_fast_exit_n",
      "position": [
        4.0,
        12.0
      ],
      "width": 20.8,
      "height": 1.5,
      "sill_height": 0.9
    },
    "door_counters_workzone": {
      "id": "door_counters_workzone",
      "name_ar": "باب (كاونترات الموظفين وإنجاز المعاملات)",
      "type": "door",
      "wall_id": "w_counters_workzone_s",
      "position": [
        -9.0,
        12.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "counters_workzone",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_counters_workzone": {
      "id": "win_counters_workzone",
      "name_ar": "نافذة (كاونترات الموظفين وإنجاز المعاملات)",
      "type": "window",
      "wall_id": "w_counters_workzone_n",
      "position": [
        -9.0,
        -2.0
      ],
      "width": 10.4,
      "height": 1.5,
      "sill_height": 0.9
    },
    "door_archive_server": {
      "id": "door_archive_server",
      "name_ar": "باب (الأرشيف الرقمي والسجلات الوطنية)",
      "type": "door",
      "wall_id": "w_archive_server_s",
      "position": [
        11.0,
        12.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "archive_server",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_archive_server": {
      "id": "win_archive_server",
      "name_ar": "نافذة (الأرشيف الرقمي والسجلات الوطنية)",
      "type": "window",
      "wall_id": "w_archive_server_n",
      "position": [
        11.0,
        -2.0
      ],
      "width": 5.6,
      "height": 1.5,
      "sill_height": 0.9
    },
    "door_staff_amenity": {
      "id": "door_staff_amenity",
      "name_ar": "باب (استراحة الموظفين وغرفة التحكم)",
      "type": "door",
      "wall_id": "w_staff_amenity_s",
      "position": [
        24.0,
        12.0
      ],
      "width": 1.2,
      "height": 2.2,
      "connects": [
        "staff_amenity",
        "circulation"
      ],
      "flow_capacity_per_min": 40
    },
    "win_staff_amenity": {
      "id": "win_staff_amenity",
      "name_ar": "نافذة (استراحة الموظفين وغرفة التحكم)",
      "type": "window",
      "wall_id": "w_staff_amenity_n",
      "position": [
        24.0,
        -2.0
      ],
      "width": 4.8,
      "height": 1.5,
      "sill_height": 0.9
    }
  }
}};
