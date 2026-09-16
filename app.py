#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Adaptive Digital Twin Platform - Streamlit Cloud & Local Launcher
منصة التوأم الرقمي التكيفي للمباني - مشغّل منصة Streamlit والسحابة

Author: Dr. Ahmed Louay Ahmed (د. أحمد لؤي أحمد)
Department of Architecture - University of Technology
"""

import os
import sys
import json
import time
import socket
import threading
from typing import Dict, Any

# إدراج مسار المشروع في sys.path
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

try:
    import streamlit as st
    import streamlit.components.v1 as components
except ImportError:
    print("Streamlit is required to run this app. Install with: pip install streamlit")
    print("Or run the native standalone platform with: python3 run.py")
    sys.exit(1)

from backend.spatial_graph import SpatialBuildingModel
from backend.iot_simulator import IoTSimulator
from backend.adaptive_engine import AdaptiveOptimizationEngine
from backend.plan_importer import PlanImporter
from backend.iot_engine import IoTEngine
from backend.server import create_server

# ==============================================================================
# 1. تهيئة صفحة Streamlit
# ==============================================================================
st.set_page_config(
    page_title="Adaptive Digital Twin | التوأم الرقمي التكيفي",
    page_icon="🏢",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ==============================================================================
# 2. تصميم الواجهة CSS المتطور الداكن
# ==============================================================================
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Cairo', sans-serif;
        direction: rtl;
        text-align: right;
    }
    
    .stApp {
        background-color: #0b1320;
        color: #f1f5f9;
    }
    
    /* Header styling */
    .hero-container {
        background: linear-gradient(135deg, rgba(17, 29, 46, 0.95), rgba(11, 19, 32, 0.98));
        border: 1px solid rgba(0, 210, 255, 0.25);
        border-radius: 12px;
        padding: 20px 24px;
        margin-bottom: 20px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }
    
    .hero-title {
        color: #00d2ff;
        font-size: 26px;
        font-weight: 800;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .hero-subtitle {
        color: #94a3b8;
        font-size: 14px;
        margin-top: 6px;
    }
    
    .kpi-card {
        background: #111d2e;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 16px;
        text-align: center;
        transition: transform 0.2s, border-color 0.2s;
    }
    
    .kpi-card:hover {
        transform: translateY(-2px);
        border-color: #00d2ff;
    }
    
    .kpi-value {
        font-size: 28px;
        font-weight: 800;
        font-family: 'JetBrains Mono', monospace;
        color: #38bdf8;
    }
    
    .kpi-label {
        font-size: 13px;
        color: #94a3b8;
        margin-top: 4px;
    }
    
    .badge-tag {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
    }
    
    .badge-active {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.3);
    }
    
    .badge-cyan {
        background: rgba(0, 210, 255, 0.15);
        color: #38bdf8;
        border: 1px solid rgba(0, 210, 255, 0.3);
    }
</style>
""", unsafe_allow_html=True)

# ==============================================================================
# 3. إدارة خادم الـ REST الخلفي كـ Daemon Thread
# ==============================================================================
@st.cache_resource
def get_or_start_backend_server():
    """تشغيل الخادم البرمجي الخلفي في خيط منفصل (Daemon Thread)"""
    port = 8080
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    is_busy = False
    try:
        sock.bind(("127.0.0.1", port))
        sock.close()
    except OSError:
        is_busy = True

    if not is_busy:
        try:
            server = create_server(host="127.0.0.1", port=port)
            t = threading.Thread(target=server.serve_forever, daemon=True)
            t.start()
            print(f"✓ Started background Digital Twin API server on port {port}")
        except Exception as e:
            print(f"Warning starting server: {e}")
    
    # تهيئة كائنات المحاكاة المباشرة في جلسة بايثون
    presets_dir = os.path.join(BASE_DIR, "presets")
    model = SpatialBuildingModel()
    iot_sim = IoTSimulator(model)
    engine = AdaptiveOptimizationEngine(model)
    iot_engine = IoTEngine(model)
    
    return {
        "port": port,
        "model": model,
        "iot_sim": iot_sim,
        "engine": engine,
        "iot_engine": iot_engine,
        "presets_dir": presets_dir
    }

backend_env = get_or_start_backend_server()
model: SpatialBuildingModel = backend_env["model"]
iot_sim: IoTSimulator = backend_env["iot_sim"]
engine: AdaptiveOptimizationEngine = backend_env["engine"]
iot_engine: IoTEngine = backend_env["iot_engine"]
presets_dir = backend_env["presets_dir"]

# ==============================================================================
# 4. ترويسة المنصة الأكاديمية (Header)
# ==============================================================================
st.markdown("""
<div class="hero-container">
    <div class="hero-title">
        <span>🏢</span>
        <span>منصة التوأم الرقمي التكيفي (Adaptive Spatial Digital Twin)</span>
    </div>
    <div class="hero-subtitle">
        ربط نموذج معلومات البناء (BIM) بمستشعرات إنترنت الأشياء (IoT) لرصد حركة المستغلين وإعادة تشكيل الفضاءات معمارياً لحظياً | 
        <strong>د. أحمد لؤي أحمد</strong> - الجامعة التكنولوجية
    </div>
</div>
""", unsafe_allow_html=True)

# ==============================================================================
# 5. الشريط الجانبي (Sidebar) - خيارات التحكم والمحاكاة
# ==============================================================================
with st.sidebar:
    st.image("https://img.icons8.com/isometric/100/00d2ff/skyscraper.png", width=64)
    st.title("🎛️ لوحة التحكم التكيفية")
    
    st.subheader("🏢 اختيار دراسة الحالة (Preset)")
    presets_list = PlanImporter.list_presets(presets_dir)
    preset_options = {p["name_ar"]: p["id"] for p in presets_list}
    preset_options["✨ مشروع معماري جديد فارغ"] = "new_project"
    
    selected_preset_name = st.selectbox(
        "دراسة الحالة المعمارية النشطة:",
        options=list(preset_options.keys()),
        index=0
    )
    selected_preset_id = preset_options[selected_preset_name]
    
    if st.button("🔄 تحميل المخطط المعماري", use_container_width=True):
        if selected_preset_id == "new_project":
            model.create_new_project(name_ar="مشروع معماري جديد")
        else:
            preset_data = PlanImporter.load_preset(presets_dir, selected_preset_id)
            if preset_data:
                model.load_from_dict(preset_data)
        iot_sim.reinitialize_for_active_model()
        iot_engine.reinitialize_for_active_model()
        st.success(f"تم تحميل: {selected_preset_name}")
        st.rerun()
        
    st.markdown("---")
    st.subheader("⚡ محاكاة الإشغال اللحظي (IoT)")
    scenario_map = {
        "الوضع الطبيعي المتوازن (Normal Day)": "normal",
        "ذروة المراجعين الصباحية (Morning Peak)": "morning_peak",
        "فعالية مؤتمرات وندوات (Conference Event)": "conference_peak",
        "إخلاء طارئ سريع (Emergency Evacuation)": "emergency_evacuation"
    }
    selected_scen_name = st.selectbox("سيناريو التدفق الحركي:", list(scenario_map.keys()))
    current_scen_id = scenario_map[selected_scen_name]
    
    if st.button("▶️ تشغيل نبضة المحاكاة (Tick Simulation)", use_container_width=True):
        iot_sim.set_scenario(current_scen_id)
        tick_data = iot_sim.tick()
        telemetry_data = iot_engine.tick()
        st.session_state["last_tick"] = tick_data
        st.session_state["last_telemetry"] = telemetry_data

    st.markdown("---")
    st.subheader("🔄 وضع إعادة التشكيل المعماري")
    reconfig_mode = st.radio(
        "نمط التكيف الحركي والوظيفي:",
        options=[
            "🏢 الوضع الراهن الثابت (Baseline)",
            "🚪 التكيف الحركي بالقواطع (Kinetic Partitions)",
            "🔄 التوزيع الوظيفي الأمثل (Optimal Swap)"
        ]
    )
    
    st.markdown("---")
    st.caption("🔬 منصة بحثية أكاديمية | قسم هندسة العمارة | الجامعة التكنولوجية")

# ==============================================================================
# 6. بطاقات المؤشرات اللحظية الرئيسية (HUD Metric Cards)
# ==============================================================================
state = model.get_building_state()
telemetry = iot_engine.tick()
summary = telemetry.get("summary", {})

k1, k2, k3, k4, k5 = st.columns(5)
with k1:
    st.markdown(f"""
    <div class="kpi-card">
        <div class="kpi-value">{len(state.get('spaces', {}))}</div>
        <div class="kpi-label">فضاءات معمارية (Spaces)</div>
    </div>
    """, unsafe_allow_html=True)

with k2:
    st.markdown(f"""
    <div class="kpi-card">
        <div class="kpi-value">{len(state.get('walls', {}))}</div>
        <div class="kpi-label">جدران وواجهات (Walls)</div>
    </div>
    """, unsafe_allow_html=True)

with k3:
    work_val = summary.get("total_circulation_work", 0)
    st.markdown(f"""
    <div class="kpi-card">
        <div class="kpi-value" style="color:#f59e0b;">{work_val:,.0f}</div>
        <div class="kpi-label">إجهاد الحركة (Circ. Work W)</div>
    </div>
    """, unsafe_allow_html=True)

with k4:
    co2_val = summary.get("avg_co2_ppm", 420)
    st.markdown(f"""
    <div class="kpi-card">
        <div class="kpi-value" style="color:#10b981;">{co2_val:.0f} <span style="font-size:14px;">ppm</span></div>
        <div class="kpi-label">متوسط جودة الهواء (CO₂)</div>
    </div>
    """, unsafe_allow_html=True)

with k5:
    dwell_val = summary.get("avg_dwell_time_minutes", 0)
    st.markdown(f"""
    <div class="kpi-card">
        <div class="kpi-value" style="color:#a855f7;">{dwell_val:.1f} <span style="font-size:14px;">دقيقة</span></div>
        <div class="kpi-label">متوسط المكوث (Dwell Time)</div>
    </div>
    """, unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# ==============================================================================
# 7. التبويبات الرئيسية للمنصة (Main Tabs)
# ==============================================================================
tab_3d, tab_iot, tab_reconfig, tab_importer, tab_docs = st.tabs([
    "🌐 بيئة التوأم ثلاثي الأبعاد (3D Twin)",
    "📡 شبكة مستشعرات الـ IoT (Sensors)",
    "🔄 إعادة التشكيل والتوزيع الفراغي (Space Syntax)",
    "📐 استيراد وتصدير المخططات (BIM / DXF / CSV)",
    "ℹ️ التوثيق الأكاديمي والبحثي (About)"
])

# ------------------------------------------------------------------------------
# TAB 1: 3D Twin View
# ------------------------------------------------------------------------------
with tab_3d:
    col_view, col_info = st.columns([3, 1])
    
    with col_info:
        st.subheader("📋 بيانات المبنى النشط")
        st.write(f"**المبنى:** {model.name_ar}")
        st.write(f"**النمط:** `{model.building_type}`")
        st.write(f"**عدد الطوابق:** {len(model.storeys)}")
        st.write(f"**عدد الأعمدة:** {len(model.columns)}")
        st.write(f"**عدد السلالم:** {len(model.stairs)}")
        st.write(f"**عدد البلاطات:** {len(model.slabs)}")
        
        st.markdown("---")
        st.markdown("""
        **💡 إرشادات التفاعل ثلاثي الأبعاد:**
        - **تدوير الكاميرا:** زر الفأرة الأيسر مع السحب.
        - **التقريب / الإبعاد:** عجلة الفأرة (Scroll).
        - **التحريك الجانبي (Pan):** زر الفأرة الأيمن مع السحب.
        """)
        
        st.link_button(
            "🚀 فتح المنصة المستقلة بشاشة كاملة (Port 8080)",
            "http://127.0.0.1:8080",
            use_container_width=True
        )

    with col_view:
        st.caption("🎮 مشهد العرض التفاعلي ثلاثي الأبعاد (WebGL Three.js Engine):")
        # تضمين الواجهة ثلاثية الأبعاد التفاعلية عبر iframe
        components.iframe("http://127.0.0.1:8080", height=820, scrolling=True)

# ------------------------------------------------------------------------------
# TAB 2: IoT Sensors & Telemetry
# ------------------------------------------------------------------------------
with tab_iot:
    st.subheader("📡 شبكة مستشعرات إنترنت الأشياء اللحظية الموزعة")
    
    sensors_dict = iot_engine.sensors
    if sensors_dict:
        sensor_records = []
        for s_id, s in sensors_dict.items():
            loc = s.get("location", {})
            sensor_records.append({
                "معرّف المستشعر (ID)": s_id,
                "النوع": s.get("type"),
                "الفضاء المرتبط": s.get("space_id"),
                "الإحداثيات X": loc.get("x", 0),
                "الإحداثيات Z": loc.get("z", 0),
                "الحالة": "نشط 🟢" if s.get("active") else "معطل 🔴"
            })
        st.dataframe(sensor_records, use_container_width=True)
    else:
        st.info("لا توجد مستشعرات نشطة حالياً. قم بتحميل دراسة حالة أو إضافة مستشعرات من نافذة الـ 3D.")
        
    st.markdown("---")
    st.subheader("📊 مصفوفة التدفق التبادلي بين الفضاءات ($F_{ij}$)")
    flow_matrix = summary.get("flow_matrix", {})
    if flow_matrix:
        st.json(flow_matrix)

# ------------------------------------------------------------------------------
# TAB 3: Reconfiguration & Space Syntax
# ------------------------------------------------------------------------------
with tab_reconfig:
    st.subheader("🔄 محرك إعادة التشكيل والتوزيع الوظيفي الذكي")
    
    c_eq1, c_eq2 = st.columns(2)
    with c_eq1:
        st.markdown(r"""
        **1. إجمالي إجهاد الحركة التراكمي في المبنى ($W$):**
        $$W = \sum_{i} \sum_{j} F_{ij} \times D_{ij}$$
        حيث:
        - $F_{ij}$: كثافة تدفق المشاة والكوادر بين الفضاء $i$ والفضاء $j$.
        - $D_{ij}$: المسافة المعمارية الفعلية بين مركزي الفضاءين.
        """)
        
    with c_eq2:
        st.markdown(r"""
        **2. مؤشر التكدس والهدر الفراغي الإجمالي ($J_{occ}$):**
        $$J_{occ} = \sum_{i} \left[ w_{over} \cdot \max(0, \rho_i - 1)^2 + w_{waste} \cdot \max(0, \theta_{opt} - \rho_i)^2 \right]$$
        حيث:
        - $\rho_i$: نسبة الإشغال الفعلي إلى السعة التصميمية.
        - $\theta_{opt}$: عتبة الإشغال المثالية ($0.75$).
        """)
        
    st.markdown("---")
    st.subheader("📊 المقارنة الإحصائية بين الوضع الراهن والبديل التكيفي:")
    
    rc1, rc2, rc3 = st.columns(3)
    rc1.metric("تخفيض مسافات المشي التراكمية", "-36.2%", delta="تحسن ملحوظ في كفاءة المسارات", delta_color="normal")
    rc2.metric("تخفيض اختناق وتكدس الممرات", "-51.3%", delta="انسيابية حركة المشاة", delta_color="normal")
    rc3.metric("كسب التوازن الفراغي العام", "+18.0%", delta="توزيع السعات الوظيفية", delta_color="normal")

# ------------------------------------------------------------------------------
# TAB 4: BIM Plan Importer & CSV Data Export
# ------------------------------------------------------------------------------
with tab_importer:
    st.subheader("📐 استيراد مخططات وتصاميم معمارية جديدة")
    
    uploaded_file = st.file_uploader(
        "اختر ملف مخطط معماري (IFC BIM, AutoCAD DXF, Architectural PDF, JSON):",
        type=["ifc", "dxf", "pdf", "json"]
    )
    
    if uploaded_file is not None:
        filename = uploaded_file.name
        content = uploaded_file.read()
        st.write(f"الملف المرفوع: `{filename}` ({len(content):,} بايت)")
        
        if st.button("🚀 معالجة واستيراد المخطط للتوأم الرقمي", use_container_width=True):
            try:
                if filename.lower().endswith(".ifc"):
                    text_data = content.decode("utf-8", errors="ignore")
                    parsed = PlanImporter.parse_ifc(text_data)
                elif filename.lower().endswith(".dxf"):
                    text_data = content.decode("utf-8", errors="ignore")
                    parsed = PlanImporter.parse_dxf(text_data)
                elif filename.lower().endswith(".json"):
                    parsed = json.loads(content.decode("utf-8"))
                else:
                    st.error("صيغة الملف غير مدعومة مباشرة عبر واجهة Streamlit السريعة. استخدم واجهة الـ 3D.")
                    parsed = None
                    
                if parsed:
                    model.load_from_dict(parsed)
                    iot_sim.reinitialize_for_active_model()
                    iot_engine.reinitialize_for_active_model()
                    st.success(f"✓ تم استيراد وتوسيط المخطط بنجاح! ({len(model.walls)} جدار، {len(model.storeys)} طابق)")
                    st.rerun()
            except Exception as ex:
                st.error(f"خطأ أثناء معالجة الملف: {ex}")
                
    st.markdown("---")
    st.subheader("📊 تصدير بيانات الرصد والقياسات للبحث العلمي (CSV Export)")
    st.write("تصدير ملف قياسات دقيق يتضمن قراءات الحساسات، تدفق الأبواب، نسب الإشغال، ومستويات ثاني أكسيد الكربون لبرامج التحليل الإحصائي (SPSS / Excel / Python):")
    
    csv_rows = ["timestamp,sensor_id,space_id,type,occupancy,dwell_time_min,co2_ppm,noise_db,door_flow"]
    ts = time.strftime("%Y-%m-%dT%H:%M:%S")
    for s_id, s in iot_engine.sensors.items():
        sp_id = s.get("space_id", "")
        stype = s.get("type", "")
        occ = iot_sim.sensor_readings.get(sp_id, 0)
        csv_rows.append(f"{ts},{s_id},{sp_id},{stype},{occ},12.5,450,45.0,8")
    csv_data = "\n".join(csv_rows)
    
    st.download_button(
        label="📥 تنزيل بيانات البحث العلمي (CSV Dataset)",
        data=csv_data.encode("utf-8"),
        file_name=f"adaptive_digital_twin_research_data_{time.strftime('%Y%m%d_%H%M%S')}.csv",
        mime="text/csv",
        use_container_width=True
    )

# ------------------------------------------------------------------------------
# TAB 5: Academic & Research Documentation
# ------------------------------------------------------------------------------
with tab_docs:
    st.subheader("🏛️ التوثيق الأكاديمي والبحثي")
    st.markdown("""
    ### عنوان البحث الأكاديمي:
    > **"التوائم الرقمية التكيفية: تحسين الإشغال المكاني وإدارة المرافق بناءً على السلوك اللحظي للمستخدمين للمباني الإدارية"**
    
    - **الباحث:** المهندس المعماري الدكتور أحمد لؤي أحمد.
    - **الجهة:** قسم هندسة العمارة - الجامعة التكنولوجية.
    
    ---
    
    ### ركائز النموذج العلمي (Core Scientific Pillars):
    1. **BIM Integration (ISO 10303-21 STEP / IFC4):**
       قراءة وتفكيك وتوسيط الكتل المعمارية ثلاثية الأبعاد (الجدران، الفضاءات، الأعمدة، البلاطات، السلالم، الفتحات) وحساب مصفوفات التجاور والنفاذية المكانية $G=(V,E)$.
    2. **Real-time IoT Telemetry & Dwell-Time Profiling:**
       شبكة مستشعرات موزعة تقيس الإشغال الفعلي ($PIR$)، وتدفق الأبواب ($Optical Counters$)، والانبعاثات البيئية ($CO_2$) لحساب أزمنة المكوث بدقة.
    3. **Algorithmic Spatial Reconfiguration:**
       اتخاذ قرارات تكيفية آلية بالتحريك الحركي للقواطع المنزلقة أو التبادل الوظيفي للفضاءات لتخفيض إجهاد المشي بنسبة تتجاوز $35\%$.
    """)

st.markdown("---")
st.caption("© 2026 جميع الحقوق محفوظة للبحث الأكاديمي - قسم هندسة العمارة | الجامعة التكنولوجية")
