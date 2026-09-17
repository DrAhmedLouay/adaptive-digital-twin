// public/js/app.js
/**
 * Main Application Controller for Adaptive Digital Twin.
 * Synchronizes API calls, manages UI controls, and coordinates
 * 3D rendering and analytics modules.
 */

class TwinApp {
    constructor() {
        this.viewer = null;
        this.analytics = null;
        this.planManager = null;
        this.pollingInterval = null;
        this.activeScenario = 'normal';
        this.isAdaptive = false;
        
        this.init();
    }

    async init() {
        console.log("Initializing Adaptive Digital Twin Dashboard...");
        
        // 1. تهيئة المحركات
        this.viewer = new Twin3DViewer('viewport-container');
        this.analytics = new TwinAnalytics();
        this.planManager = new PlanManager(this);

        // تغليف loadBuildingModel لتحديث شريط الطوابق تلقائيًا عند كل استدعاء
        const _origLoad = this.viewer.loadBuildingModel.bind(this.viewer);
        this.viewer.loadBuildingModel = (modelData) => {
            _origLoad(modelData);
            this.updateStoreyBar(modelData);
        };

        // 2. جلب وتوليد النموذج المعماري ثلاثي الأبعاد
        await this.loadSpatialModel();

        // 3. ربط أحداث واجهة المستخدم
        this.setupEventListeners();

        // 4. بدء دفق التزامن اللحظي
        this.startTelemetryLoop();
    }

    async loadSpatialModel() {
        try {
            const res = await fetch('/api/model');
            if (res.ok) {
                const data = await res.json();
                this.viewer.loadBuildingModel(data);
                if (this.planManager) {
                    this.planManager.updateActiveBuildingTitle(data);
                }
                console.log("BIM Spatial Model loaded successfully from API:", data);
                return;
            }
        } catch (err) {
            console.warn("API not available, loading embedded default model:", err);
        }
        if (window.__DEFAULT_OFFICE_MODEL__) {
            this.viewer.loadBuildingModel(window.__DEFAULT_OFFICE_MODEL__);
            if (this.planManager) {
                this.planManager.updateActiveBuildingTitle(window.__DEFAULT_OFFICE_MODEL__);
            }
            console.log("Loaded embedded default office model.");
        }
    }

    /**
     * updateStoreyBar — يُحدّث شريط تحكم الطوابق (BIM Multi-Storey Bar)
     * عند استيراد ملف IFC متعدد الطوابق، يُظهر الشريط ويملأه بأزرار كل طابق
     * وزر "الكل"، ويربط زر الفصل (Exploded View).
     */
    updateStoreyBar(modelData) {
        const bar       = document.getElementById('storey-control-bar');
        const container = document.getElementById('storey-btn-container');
        const pill      = document.getElementById('bim-summary-pill');
        const btnExplod = document.getElementById('btn-exploded-view');
        if (!bar || !container) return;

        const storeys = modelData.storeys || {};
        const storeyEntries = Object.entries(storeys);

        // إخفاء الشريط إذا لم يكن هناك طوابق متعددة
        if (storeyEntries.length < 2) {
            bar.style.display = 'none';
            return;
        }

        bar.style.display = 'flex';
        container.innerHTML = '';

        // زر "الكل"
        const btnAll = document.createElement('button');
        btnAll.className = 'storey-btn active';
        btnAll.textContent = '🏙️ الكل';
        btnAll.dataset.storeyId = 'all';
        btnAll.addEventListener('click', () => {
            this.viewer.setStoreyFilter('all');
            container.querySelectorAll('.storey-btn').forEach(b => b.classList.remove('active'));
            btnAll.classList.add('active');
            if (btnExplod) btnExplod.disabled = false;
        });
        container.appendChild(btnAll);

        // زر لكل طابق مرتّباً حسب الارتفاع
        storeyEntries
            .sort((a, b) => (a[1].elevation ?? 0) - (b[1].elevation ?? 0))
            .forEach(([storeyId, storey]) => {
                const btn = document.createElement('button');
                btn.className = 'storey-btn';
                btn.dataset.storeyId = storeyId;
                const elev = (storey.elevation ?? 0).toFixed(1);
                btn.textContent = `${storey.name_ar || storey.name || storeyId}  (+${elev}m)`;
                btn.title = `طابق: ${storey.name || storeyId} — ارتفاع: ${elev}م`;
                btn.addEventListener('click', () => {
                    this.viewer.setStoreyFilter(storeyId);
                    container.querySelectorAll('.storey-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
                container.appendChild(btn);
            });

        // زر الفصل (Exploded View)
        if (btnExplod) {
            // إزالة أي مستمع قديم
            const fresh = btnExplod.cloneNode(true);
            btnExplod.parentNode.replaceChild(fresh, btnExplod);
            fresh.addEventListener('click', () => {
                const nowExploded = !this.viewer.isExplodedView;
                this.viewer.setExplodedView(nowExploded);
                fresh.classList.toggle('active', nowExploded);
                fresh.textContent = nowExploded ? '🔄 دمج الطوابق' : '💥 فصل الطوابق';
            });
        }

        // حبة الملخص (بيانات BIM)
        if (pill) {
            const nWalls   = Object.keys(modelData.walls   || {}).length;
            const nSpaces  = Object.keys(modelData.spaces  || {}).length;
            const nColumns = Object.keys(modelData.columns || {}).length;
            const nSlabs   = Object.keys(modelData.slabs   || {}).length;
            pill.textContent =
                `${storeyEntries.length} طوابق · ${nWalls} جدار · ${nSpaces} فضاء · ${nColumns} عمود · ${nSlabs} بلاطة`;
        }
    }

    setupEventListeners() {
        // أ. التبديل بين السيناريوهات
        const scenarioBtns = document.querySelectorAll('.scenario-btn');
        scenarioBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const scenario = btn.dataset.scenario;
                if (!scenario || scenario === this.activeScenario) return;

                scenarioBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeScenario = scenario;

                await fetch('/api/scenario', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scenario })
                });

                // تحديث فوري
                this.fetchAndUpdate();
            });
        });

        // ب. مفتاح تشغيل التكيف التلقائي (Autonomous Adaptive Toggle)
        const adaptiveToggle = document.getElementById('adaptive-toggle');
        if (adaptiveToggle) {
            adaptiveToggle.addEventListener('change', async (e) => {
                this.isAdaptive = e.target.checked;
                
                const modeLabel = document.getElementById('mode-status-text');
                if (modeLabel) {
                    modeLabel.textContent = this.isAdaptive ? 'الوضع التكيفي الذكي (نشط)' : 'الوضع الثابت (Baseline)';
                    modeLabel.style.color = this.isAdaptive ? 'var(--accent-cyan)' : 'var(--text-muted)';
                }

                await fetch('/api/adaptive_mode', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ enabled: this.isAdaptive })
                });

                this.fetchAndUpdate();
            });
        }

        // ج. أزرار التحكم في الكاميرا
        const btnTopView = document.getElementById('btn-top-view');
        if (btnTopView) {
            btnTopView.addEventListener('click', () => this.viewer.toggleCameraView());
        }

        const btnResetView = document.getElementById('btn-reset-view');
        if (btnResetView) {
            btnResetView.addEventListener('click', () => this.viewer.resetCamera());
        }

        // د. زر تصدير البيانات للرسالة الأكاديمية (JSON & CSV)
        const btnExport = document.getElementById('btn-export-data');
        if (btnExport) {
            btnExport.addEventListener('click', () => this.analytics.exportData());
        }

        const btnExportCsv = document.getElementById('btn-export-csv');
        if (btnExportCsv) {
            btnExportCsv.addEventListener('click', () => this.analytics.exportCSV());
        }

        // هـ. أزرار تبديل أوضاع إعادة التشكيل والتوزيع الوظيفي المكاني
        const reconfigBtns = document.querySelectorAll('[data-reconfig-mode]');
        reconfigBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const mode = btn.dataset.reconfigMode;
                reconfigBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                await this.applyReconfiguration(mode);
            });
        });

        // و. النوافذ المنبثقة لمستشعرات IoT وإعادة التشكيل
        const iotModal = document.getElementById('iot-modal');
        const btnOpenIot = document.getElementById('btn-open-iot-modal');
        const btnCloseIot = document.getElementById('btn-close-iot-modal');
        if (btnOpenIot && iotModal) {
            btnOpenIot.addEventListener('click', () => {
                iotModal.classList.add('active');
                this.analytics.updateSensorTargetOptions();
                this.analytics.fetchAndUpdateSensorsInventory();
                this.analytics.fetchAndUpdateIoTTelemetry();
            });
        }
        if (btnCloseIot && iotModal) {
            btnCloseIot.addEventListener('click', () => iotModal.classList.remove('active'));
        }

        const reconfigModal = document.getElementById('reconfig-modal');
        const btnOpenReconfig = document.getElementById('btn-open-reconfig-modal');
        const btnCloseReconfig = document.getElementById('btn-close-reconfig-modal');
        if (btnOpenReconfig && reconfigModal) {
            btnOpenReconfig.addEventListener('click', () => reconfigModal.classList.add('active'));
        }
        if (btnCloseReconfig && reconfigModal) {
            btnCloseReconfig.addEventListener('click', () => reconfigModal.classList.remove('active'));
        }

        // أزرار تطبيق السيناريوهات من داخل نافذة إعادة التشكيل
        const btnModalBase = document.getElementById('btn-modal-apply-baseline');
        if (btnModalBase) {
            btnModalBase.addEventListener('click', async () => {
                await this.applyReconfiguration('baseline');
                if (reconfigModal) reconfigModal.classList.remove('active');
            });
        }
        const btnModalKinetic = document.getElementById('btn-modal-apply-kinetic');
        if (btnModalKinetic) {
            btnModalKinetic.addEventListener('click', async () => {
                await this.applyReconfiguration('kinetic');
                if (reconfigModal) reconfigModal.classList.remove('active');
            });
        }
        const btnModalSwap = document.getElementById('btn-modal-apply-swap');
        if (btnModalSwap) {
            btnModalSwap.addEventListener('click', async () => {
                await this.applyReconfiguration('functional_swap');
                if (reconfigModal) reconfigModal.classList.remove('active');
            });
        }
    }

    async applyReconfiguration(mode) {
        try {
            // تحديث حالة الأزرار
            const reconfigBtns = document.querySelectorAll('[data-reconfig-mode]');
            reconfigBtns.forEach(b => {
                if (b.dataset.reconfigMode === mode) b.classList.add('active');
                else b.classList.remove('active');
            });

            // إرسال طلب التكيف إلى الخادم
            const res = await fetch('/api/reconfiguration/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode })
            });
            const data = await res.json();

            this.reconfigMode = mode;
            this.isAdaptive = (mode !== 'baseline');

            // إظهار أو إخفاء صندوق العائد المعماري
            const impactBox = document.getElementById('reconfig-impact-box');
            if (impactBox) {
                impactBox.style.display = (mode === 'baseline') ? 'none' : 'block';
            }

            // مزامنة حالة مفتاح التكيف في الواجهة
            const adaptiveToggle = document.getElementById('adaptive-toggle');
            if (adaptiveToggle) {
                adaptiveToggle.checked = (mode !== 'baseline');
            }
            const modeLabel = document.getElementById('mode-status-text');
            if (modeLabel) {
                if (mode === 'functional_swap') {
                    modeLabel.textContent = 'التوزيع الوظيفي الأمثل (نشط)';
                    modeLabel.style.color = '#34d399';
                } else if (mode === 'kinetic') {
                    modeLabel.textContent = 'التكيف الحركي بالقواطع (نشط)';
                    modeLabel.style.color = 'var(--accent-cyan)';
                } else {
                    modeLabel.textContent = 'الوضع الثابت (Baseline)';
                    modeLabel.style.color = 'var(--text-muted)';
                }
            }

            // إرسال طلب التكيف إلى الخادم إذا كان متاحاً
            await fetch('/api/reconfiguration/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode })
            });

            this.fetchAndUpdate();
        } catch (e) {
            // صامت في بيئة العرض الثابتة
            this.fetchAndUpdate();
        }
    }

    startTelemetryLoop() {
        // نبضة كل 1.5 ثانية لمحاكاة التحديث اللحظي لحساسات الـ IoT
        this.fetchAndUpdate();
        this.pollingInterval = setInterval(() => {
            this.fetchAndUpdate();
        }, 1500);
    }

    async fetchAndUpdate() {
        try {
            const res = await fetch('/api/state');
            if (res.ok) {
                const data = await res.json();
                this.lastState = data;
                if (this.viewer) this.viewer.updateRealtimeState(data);
                if (this.analytics) this.analytics.updateDashboard(data);
                return;
            }
        } catch (err) {
            // صامت في بيئة العرض الثابتة (مثل GitHub Pages)
        }
        if (this.viewer && (this.viewer.buildingData || this.viewer.currentModel)) {
            this.simulateClientTick();
        }
    }

    simulateClientTick() {
        this.stepCount = (this.stepCount || 0) + 1;
        const bData = this.viewer?.buildingData || this.viewer?.currentModel || {};
        const spaces = bData.spaces || {};
        const partitions = bData.partitions || {};

        const scenario = this.activeScenario || 'normal';
        const mode = this.reconfigMode || (this.isAdaptive ? 'kinetic' : 'baseline');

        const occ = {};
        const overcrowdedRooms = [];

        for (const [id, sp] of Object.entries(spaces)) {
            const cap = sp.capacity || 10;
            let factor = 0.45;
            if (scenario === 'morning_peak') {
                factor = (id.includes('reception') || id.includes('wait') || id.includes('lobby') || sp.type === 'public') ? 1.25 : 0.8;
            } else if (scenario === 'corridor_choke') {
                factor = (sp.type === 'circulation' || id.includes('corridor')) ? 1.35 : 0.5;
            } else if (scenario === 'after_hours') {
                factor = 0.08;
            }

            if (mode === 'kinetic' && (id.includes('wait') || id.includes('reception'))) {
                factor = Math.min(0.85, factor * 0.7);
            } else if (mode === 'functional_swap' && (id.includes('corridor') || sp.type === 'circulation')) {
                factor = Math.min(0.8, factor * 0.65);
            }

            const currentCount = Math.max(1, Math.round(cap * (factor + 0.12 * Math.sin(Date.now() / 3500 + id.charCodeAt(0)))));
            occ[id] = currentCount;

            if (currentCount > cap) {
                overcrowdedRooms.push(id);
            }
        }

        let centralFlow = 24.0;
        if (scenario === 'morning_peak') centralFlow = 36.5;
        else if (scenario === 'corridor_choke') centralFlow = 48.0;
        else if (scenario === 'after_hours') centralFlow = 6.0;

        if (mode === 'kinetic') centralFlow = Math.max(12.0, centralFlow * 0.75);
        else if (mode === 'functional_swap') centralFlow = Math.max(10.0, centralFlow * 0.58);

        centralFlow = +(centralFlow + 2.0 * Math.sin(Date.now() / 3000)).toFixed(1);

        let balanceScore = 74.0;
        if (scenario === 'morning_peak') balanceScore = 66.5;
        else if (scenario === 'corridor_choke') balanceScore = 62.0;

        let circWork = 4350;
        if (scenario === 'morning_peak') circWork = 5400;
        else if (scenario === 'corridor_choke') circWork = 5950;

        const actions = [];
        if (mode === 'kinetic') {
            balanceScore = +(balanceScore + 17.5).toFixed(1);
            circWork = Math.round(circWork * 0.74);
            actions.push({
                type: "MOVABLE_PARTITION_EXPANSION",
                title_ar: "تمدد القاطع الذكي الميكانيكي (Smart Partition P1)",
                reason_ar: "تكدس الفضاء الرئيسي وتجاوز عتبة الإشغال المسموحة",
                impact_ar: "زيادة السعة الاستيعابية بنسبة 45% وتخفيض زمن الانتظار"
            });
        } else if (mode === 'functional_swap') {
            balanceScore = +(balanceScore + 21.0).toFixed(1);
            circWork = Math.round(circWork * 0.68);
            actions.push({
                type: "FUNCTIONAL_ZONE_SWAP",
                title_ar: "إعادة توجيه التدفق والتوزيع الوظيفي التكيفي",
                reason_ar: "ارتفاع تدفق الممرات واختناق عنق الزجاجة",
                impact_ar: "تخفيض إجهاد حركة المشاة (Circulation Work W) بنسبة 32%"
            });
        }

        const state = {
            step: this.stepCount,
            scenario: scenario,
            layout_mode: mode,
            sensor_readings: occ,
            corridor_flows: { "corridor_central": centralFlow },
            partitions: partitions,
            evaluation: {
                spatial_balance_score: balanceScore,
                current_kpis: {
                    spatial_balance_score: balanceScore,
                    overcrowded_rooms: overcrowdedRooms,
                    j_circ_penalty: +(circWork / 100).toFixed(1),
                    circulation_work_index: circWork
                },
                baseline_kpis: {
                    spatial_balance_score: 72.0,
                    overcrowded_rooms: scenario === 'normal' ? [] : ["reception_space"],
                    j_circ_penalty: 45.8,
                    circulation_work_index: 4580
                },
                improvement_summary: {
                    balance_gain_percent: +(Math.max(0, balanceScore - 72.0)).toFixed(1),
                    congestion_reduction_percent: mode === 'baseline' ? 0.0 : 28.5
                },
                actions: actions
            }
        };

        this.lastState = state;
        if (this.viewer) {
            this.viewer.updateRealtimeState(state);
        }
        if (this.analytics) {
            this.analytics.updateDashboard(state);
        }
    }
}

// بدء التشغيل عند تحميل الصفحة
window.addEventListener('DOMContentLoaded', () => {
    window.twinApp = new TwinApp();
    window.app = window.twinApp;
});
