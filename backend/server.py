# backend/server.py
"""
Local HTTP Server & REST API for Adaptive Digital Twin.
Serves static dashboard files and provides real-time endpoints for 3D state,
IoT telemetry, model preset switching, plan uploads (DXF/JSON), and adaptive control.
"""

import http.server
import json
import os
import sys
import urllib.parse
from typing import Optional

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.spatial_graph import SpatialBuildingModel
from backend.iot_simulator import IoTSimulator
from backend.adaptive_engine import AdaptiveOptimizationEngine
from backend.plan_importer import PlanImporter
from backend.iot_engine import IoTEngine

class TwinServerHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, spatial_model=None, iot_sim=None, engine=None, iot_engine=None, public_dir=None, presets_dir=None, **kwargs):
        self.spatial_model = spatial_model
        self.iot_sim = iot_sim
        self.engine = engine
        self.iot_engine = iot_engine
        self.public_dir = public_dir
        self.presets_dir = presets_dir
        super().__init__(*args, directory=public_dir, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/model":
            self.send_json_response(self.spatial_model.get_building_state())
            return

        elif path == "/api/presets":
            presets = PlanImporter.list_presets(self.presets_dir)
            self.send_json_response({"presets": presets, "active_id": self.spatial_model.model_id})
            return

        elif path == "/api/state":
            iot_data = self.iot_sim.tick()
            eval_result = self.engine.evaluate_and_adapt(iot_data["occupancy"], iot_data["flows"])
            
            response = {
                "step": iot_data["step"],
                "scenario": iot_data["scenario"],
                "sensor_readings": iot_data["occupancy"],
                "corridor_flows": iot_data["flows"],
                "partitions": self.spatial_model.partitions,
                "evaluation": eval_result
            }
            self.send_json_response(response)
            return

        elif path == "/api/export":
            export_data = {
                "building": self.spatial_model.get_building_state(),
                "scenario": self.iot_sim.current_scenario,
                "history": self.iot_sim.history,
                "current_kpis": self.engine.calculate_kpis(
                    self.iot_sim.sensor_readings,
                    self.iot_sim.corridor_flows
                )
            }
            self.send_json_response(export_data)
            return

        elif path == "/api/iot/sensors":
            self.send_json_response({"sensors": self.iot_engine.sensors})
            return

        elif path == "/api/iot/telemetry":
            data = self.iot_engine.tick()
            self.send_json_response(data)
            return

        elif path == "/api/analytics/reconfiguration":
            recs = self.iot_engine.generate_reconfiguration_recommendations()
            self.send_json_response(recs)
            return

        elif path == "/api/analytics/export_csv":
            csv_text = self.iot_engine.export_academic_csv()
            csv_bytes = csv_text.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/csv; charset=utf-8")
            self.send_header("Content-Disposition", 'attachment; filename="digital_twin_spatial_research_data.csv"')
            self.send_header("Content-Length", str(len(csv_bytes)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(csv_bytes)
            return

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        data = {}
        if body:
            try:
                data = json.loads(body.decode("utf-8"))
            except Exception:
                pass

        if path == "/api/scenario":
            scenario = data.get("scenario", "normal")
            self.iot_sim.set_scenario(scenario)
            if self.iot_engine:
                self.iot_engine.active_scenario = scenario
            self.send_json_response({"status": "ok", "scenario": scenario})
            return

        elif path == "/api/iot/sensors/add":
            if self.iot_engine:
                new_sensor = self.iot_engine.add_sensor(data)
                self.send_json_response({
                    "status": "ok",
                    "message": f"تمت إضافة المستشعر بنجاح: {new_sensor['name_ar']}",
                    "sensor": new_sensor,
                    "sensors": self.iot_engine.sensors
                })
            else:
                self.send_json_response({"status": "error", "message": "محرك IoT غير مفعل"}, status_code=500)
            return

        elif path == "/api/iot/sensors/delete":
            sensor_id = data.get("sensor_id")
            if self.iot_engine and sensor_id:
                deleted = self.iot_engine.delete_sensor(sensor_id)
                self.send_json_response({
                    "status": "ok" if deleted else "not_found",
                    "message": f"تم حذف المستشعر ({sensor_id})" if deleted else "المستشعر غير موجود",
                    "deleted_id": sensor_id,
                    "sensors": self.iot_engine.sensors
                })
            else:
                self.send_json_response({"status": "error", "message": "معرف المستشعر غير صالح"}, status_code=400)
            return

        elif path == "/api/reconfiguration/apply":
            mode = data.get("mode", "baseline")
            if self.iot_engine:
                res = self.iot_engine.apply_reconfiguration_mode(mode)
            else:
                res = {"status": "ok", "active_mode": mode}
            if mode in ["kinetic", "functional_swap"]:
                self.engine.toggle_adaptive_mode(True)
            else:
                self.engine.toggle_adaptive_mode(False)
            self.send_json_response(res)
            return

        elif path == "/api/adaptive_mode":
            enabled = bool(data.get("enabled", False))
            self.engine.toggle_adaptive_mode(enabled)
            if self.iot_engine:
                self.iot_engine.apply_reconfiguration_mode("kinetic" if enabled else "baseline")
            self.send_json_response({"status": "ok", "adaptive_mode": enabled})
            return

        elif path == "/api/partition":
            p_id = data.get("partition_id")
            status = data.get("status", "closed")
            success = self.spatial_model.set_partition_state(p_id, status)
            self.send_json_response({"status": "ok" if success else "error"})
            return

        elif path == "/api/model/switch":
            preset_id = data.get("preset_id")
            preset_data = PlanImporter.load_preset(self.presets_dir, preset_id)
            if preset_data:
                self.spatial_model.load_from_dict(preset_data)
                self.iot_sim.reinitialize_for_active_model()
                if self.iot_engine:
                    self.iot_engine.initialize_sensors()
                    self.iot_engine.calculate_distance_matrix()
                self.engine.toggle_adaptive_mode(self.engine.adaptive_mode_enabled)
                self.send_json_response({
                    "status": "ok",
                    "message": f"تم تبديل المخطط المعماري إلى: {self.spatial_model.name_ar}",
                    "model": self.spatial_model.get_building_state()
                })
            else:
                self.send_json_response({"status": "error", "message": "دراسة الحالة غير موجودة"}, status_code=404)
            return

        elif path == "/api/model/upload":
            file_type = str(data.get("type", "json")).lower() # json, dxf, ifc, pdf
            content = data.get("content", "")
            try:
                if file_type == "ifc":
                    parsed_model = PlanImporter.parse_ifc(content)
                elif file_type == "pdf":
                    parsed_model = PlanImporter.parse_pdf(content)
                elif file_type == "dxf":
                    parsed_model = PlanImporter.parse_dxf(content)
                else:
                    raw_json = json.loads(content) if isinstance(content, str) else content
                    parsed_model = PlanImporter.validate_and_normalize_json(raw_json)

                self.spatial_model.load_from_dict(parsed_model)
                self.iot_sim.reinitialize_for_active_model()
                if self.iot_engine:
                    self.iot_engine.initialize_sensors()
                    self.iot_engine.calculate_distance_matrix()
                self.engine.toggle_adaptive_mode(self.engine.adaptive_mode_enabled)
                self.send_json_response({
                    "status": "ok",
                    "message": f"تم استيراد وبناء المخطط المعماري بنجاح: {self.spatial_model.name_ar}",
                    "model": self.spatial_model.get_building_state()
                })
            except Exception as e:
                self.send_json_response({"status": "error", "message": f"خطأ في معالجة المخطط: {str(e)}"}, status_code=400)
            return

        elif path == "/api/model/update_space":
            space_id = data.get("space_id")
            updates = data.get("updates", {})
            success = self.spatial_model.update_space(space_id, updates)
            if success:
                self.iot_sim.reinitialize_for_active_model()
                self.send_json_response({
                    "status": "ok",
                    "message": f"تم تحديث بيانات الفضاء {space_id}",
                    "model": self.spatial_model.get_building_state()
                })
            else:
                self.send_json_response({"status": "error", "message": "الفضاء غير موجود"}, status_code=404)
            return

        elif path == "/api/model/update_wall":
            wall_id = data.get("id") or data.get("wall_id")
            new_start = data.get("start")
            new_end = data.get("end")
            if wall_id and new_start and new_end:
                success = self.spatial_model.update_wall_position(wall_id, new_start, new_end)
                if success:
                    self.send_json_response({
                        "status": "ok",
                        "message": f"تم تحديث موضع وتدوير الجدار {wall_id} بنجاح",
                        "model": self.spatial_model.get_building_state()
                    })
                else:
                    self.send_json_response({"status": "error", "message": "الجدار غير موجود"}, status_code=404)
            else:
                self.send_json_response({"status": "error", "message": "معطيات الجدار غير مكتملة"}, status_code=400)
            return

        elif path == "/api/model/update_stair":
            stair_id = data.get("id") or data.get("stair_id")
            new_pos = data.get("position")
            new_rot = data.get("rotation")
            new_dir = data.get("direction")
            if stair_id:
                success = self.spatial_model.update_stair(stair_id, new_pos, new_rot, new_dir)
                if success:
                    self.send_json_response({
                        "status": "ok",
                        "message": f"تم تحديث موضع وتدوير واتجاه السلم المعماري {stair_id} بنجاح",
                        "model": self.spatial_model.get_building_state()
                    })
                else:
                    self.send_json_response({"status": "error", "message": "السلم غير موجود"}, status_code=404)
            else:
                self.send_json_response({"status": "error", "message": "معرف السلم مطلوب"}, status_code=400)
            return

        elif path == "/api/model/add_element":
            elem_type = data.get("type", "")
            element = data.get("element", {})
            created_id = None
            if elem_type == "wall":
                created_id = self.spatial_model.add_wall(element)
            elif elem_type == "opening":
                created_id = self.spatial_model.add_opening(element)
            elif elem_type == "space":
                created_id = self.spatial_model.add_space(element)
                self.iot_sim.reinitialize_for_active_model()
            elif elem_type == "stair":
                created_id = self.spatial_model.add_stair(element)
            
            if created_id:
                self.send_json_response({
                    "status": "ok",
                    "id": created_id,
                    "type": elem_type,
                    "message": f"تمت إضافة العنصر المعماري بنجاح: {created_id}",
                    "model": self.spatial_model.get_building_state()
                })
            else:
                self.send_json_response({"status": "error", "message": "نوع العنصر المعماري غير صالح"}, status_code=400)
            return

        elif path == "/api/model/create_enclosed_space":
            wall_ids = data.get("wall_ids", [])
            name_ar = data.get("name_ar", "فضاء معماري جديد")
            space_type = data.get("type", "flexible")
            created_space = self.spatial_model.create_space_from_walls(wall_ids, name_ar, space_type)
            if created_space:
                self.iot_sim.reinitialize_for_active_model()
                self.send_json_response({
                    "status": "ok",
                    "space": created_space,
                    "message": f"تم إنشاء وتحديد الفضاء المغلق ({name_ar}) بنجاح بمساحة {created_space['area_m2']}م²",
                    "model": self.spatial_model.get_building_state()
                })
            else:
                self.send_json_response({
                    "status": "error",
                    "message": "تعذر تكوين فضاء مغلق من الجدران المحددة (تأكد من إغلاق 3 جدران متصلة على الأقل)"
                }, status_code=400)
            return

        elif path == "/api/model/sync_model":
            walls = data.get("walls")
            openings = data.get("openings")
            spaces = data.get("spaces")
            stairs = data.get("stairs")
            if walls is not None:
                self.spatial_model.walls = walls
            if openings is not None:
                self.spatial_model.openings = openings
            if spaces is not None:
                self.spatial_model.spaces = spaces
                self.iot_sim.reinitialize_for_active_model()
            if stairs is not None:
                self.spatial_model.stairs = stairs
            self.send_json_response({
                "status": "ok",
                "message": "تمت مزامنة عناصر المخطط المعماري بالكامل بنجاح",
                "model": self.spatial_model.get_building_state()
            })
        elif path == "/api/model/delete_element":
            elem_type = data.get("type", "")
            elem_id = data.get("id", "")
            success = False
            if elem_type == "wall":
                success = self.spatial_model.delete_wall(elem_id)
            elif elem_type == "opening":
                success = self.spatial_model.delete_opening(elem_id)
            elif elem_type == "space":
                success = self.spatial_model.delete_space(elem_id)
                self.iot_sim.reinitialize_for_active_model()
            elif elem_type == "stair":
                success = self.spatial_model.delete_stair(elem_id)
            
            self.send_json_response({
                "status": "ok" if success else "not_found",
                "message": f"تم حذف العنصر {elem_id}" if success else "العنصر غير موجود",
                "model": self.spatial_model.get_building_state()
            })
            return

        elif path == "/api/model/clear_walls":
            clear_spaces = bool(data.get("clear_spaces", True))
            if clear_spaces:
                self.spatial_model.clear_all_walls_and_spaces()
                self.iot_sim.reinitialize_for_active_model()
            else:
                self.spatial_model.clear_all_walls()
            self.send_json_response({
                "status": "ok",
                "message": "تم مسح كافة الجدران والفتحات والفضاءات والأرضيات الملونة بنجاح",
                "model": self.spatial_model.get_building_state()
            })
            return

        elif path == "/api/model/new_project":
            project_name = str(data.get("name_ar", "مشروع معماري جديد")).strip() or "مشروع معماري جديد"
            state = self.spatial_model.create_new_project(name_ar=project_name)
            self.iot_sim.reinitialize_for_active_model()
            if self.iot_engine:
                self.iot_engine.initialize_sensors()
                self.iot_engine.calculate_distance_matrix()
            self.engine.toggle_adaptive_mode(False)
            self.send_json_response({
                "status": "ok",
                "message": f"تم بنجاح بدء وتهيئة المشروع المعماري الجديد: {project_name}",
                "model": state
            })
            return

        self.send_error(404, "Endpoint not found")

    def send_json_response(self, data: dict, status_code: int = 200):
        response_bytes = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(response_bytes)

    def end_headers(self):
        """Prevent browser caching of JS/CSS files so updates are always served fresh."""
        path = urllib.parse.urlparse(self.path).path
        if path.endswith(('.js', '.css', '.html', '')):
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        super().end_headers()

def create_server(host="0.0.0.0", port=8080):
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    public_dir = os.path.join(base_dir, "public")
    presets_dir = os.path.join(base_dir, "presets")
    
    spatial_model = SpatialBuildingModel()
    iot_sim = IoTSimulator(spatial_model)
    engine = AdaptiveOptimizationEngine(spatial_model)
    iot_engine = IoTEngine(spatial_model)

    def handler(*args, **kwargs):
        return TwinServerHandler(
            *args,
            spatial_model=spatial_model,
            iot_sim=iot_sim,
            engine=engine,
            iot_engine=iot_engine,
            public_dir=public_dir,
            presets_dir=presets_dir,
            **kwargs
        )

    server = http.server.ThreadingHTTPServer((host, port), handler)
    return server

if __name__ == "__main__":
    port = 8080
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    server = create_server(host="127.0.0.1", port=port)
    print(f"🚀 الخادم يعمل الآن على: http://127.0.0.1:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()

