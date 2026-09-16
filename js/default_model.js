window.__DEFAULT_OFFICE_MODEL__ = {
  "id": "administrative_office",
  "name_ar": "المبنى الإداري النموذجي (Case Study 1)",
  "name_en": "Administrative Office Building",
  "building_type": "administrative",
  "storeys": {},
  "slabs": {},
  "columns": {},
  "beams": {},
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
      "flow_capacity_per_min": 60,
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
      "flow_capacity_per_min": 35,
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
    "w_ext_north": {
      "id": "w_ext_north",
      "name_ar": "الجدار الخارجي الشمالي",
      "start": [
        -18,
        -14
      ],
      "end": [
        28,
        -14
      ],
      "thickness": 0.3,
      "height": 3.0,
      "type": "exterior"
    },
    "w_ext_south": {
      "id": "w_ext_south",
      "name_ar": "الجدار الخارجي الجنوبي",
      "start": [
        -18,
        15
      ],
      "end": [
        28,
        15
      ],
      "thickness": 0.3,
      "height": 3.0,
      "type": "exterior"
    },
    "w_ext_west": {
      "id": "w_ext_west",
      "name_ar": "الجدار الخارجي الغربي",
      "start": [
        -18,
        -14
      ],
      "end": [
        -18,
        15
      ],
      "thickness": 0.3,
      "height": 3.0,
      "type": "exterior"
    },
    "w_ext_east": {
      "id": "w_ext_east",
      "name_ar": "الجدار الخارجي الشرقي",
      "start": [
        28,
        -14
      ],
      "end": [
        28,
        15
      ],
      "thickness": 0.3,
      "height": 3.0,
      "type": "exterior"
    },
    "w_int_corridor_n": {
      "id": "w_int_corridor_n",
      "name_ar": "جدار الممر المركزي الشمالي",
      "start": [
        -18,
        -6
      ],
      "end": [
        28,
        -6
      ],
      "thickness": 0.2,
      "height": 3.0,
      "type": "interior"
    },
    "w_int_corridor_s": {
      "id": "w_int_corridor_s",
      "name_ar": "جدار الممر المركزي الجنوبي",
      "start": [
        -18,
        -2
      ],
      "end": [
        28,
        -2
      ],
      "thickness": 0.2,
      "height": 3.0,
      "type": "interior"
    },
    "w_div_rec_wait": {
      "id": "w_div_rec_wait",
      "name_ar": "جدار فاصل (الاستقبال - الانتظار)",
      "start": [
        -6,
        -14
      ],
      "end": [
        -6,
        -6
      ],
      "thickness": 0.2,
      "height": 3.0,
      "type": "interior"
    },
    "w_div_multi_ab": {
      "id": "w_div_multi_ab",
      "name_ar": "جدار فاصل (القاعة أ - القاعة ب)",
      "start": [
        18,
        -14
      ],
      "end": [
        18,
        -6
      ],
      "thickness": 0.2,
      "height": 3.0,
      "type": "interior"
    }
  },
  "openings": {
    "d_main_entry": {
      "id": "d_main_entry",
      "name_ar": "المدخل الرئيسي للمبنى",
      "type": "door",
      "wall_id": "w_ext_west",
      "position": [
        -18,
        -10
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
        -12,
        -6
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
        1,
        -6
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
        13,
        -6
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
        23,
        -6
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
        -7,
        -2
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
        16,
        -2
      ],
      "width": 1.4,
      "height": 2.2,
      "connects": [
        "open_office_south",
        "corridor_central"
      ],
      "flow_capacity_per_min": 40
    },
    "win_rec_north": {
      "id": "win_rec_north",
      "name_ar": "نافذة الاستقبال الشمالية",
      "type": "window",
      "wall_id": "w_ext_north",
      "position": [
        -12,
        -14
      ],
      "width": 3.0,
      "height": 1.6,
      "sill_height": 0.9
    },
    "win_wait_north": {
      "id": "win_wait_north",
      "name_ar": "نافذة صالة الانتظار",
      "type": "window",
      "wall_id": "w_ext_north",
      "position": [
        1,
        -14
      ],
      "width": 4.0,
      "height": 1.6,
      "sill_height": 0.9
    },
    "win_office_south1": {
      "id": "win_office_south1",
      "name_ar": "نوافذ المكاتب الجنوبية 1",
      "type": "window",
      "wall_id": "w_ext_south",
      "position": [
        -7,
        15
      ],
      "width": 4.5,
      "height": 1.6,
      "sill_height": 0.9
    },
    "win_office_south2": {
      "id": "win_office_south2",
      "name_ar": "نوافذ المكاتب الجنوبية 2",
      "type": "window",
      "wall_id": "w_ext_south",
      "position": [
        16,
        15
      ],
      "width": 4.5,
      "height": 1.6,
      "sill_height": 0.9
    }
  },
  "stairs": {}
};
