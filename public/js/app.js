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
            const data = await res.json();
            this.viewer.loadBuildingModel(data);
            if (this.planManager) {
                this.planManager.updateActiveBuildingTitle(data);
            }
            console.log("BIM Spatial Model loaded successfully:", data);
        } catch (err) {
            console.error("Failed to load spatial model:", err);
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

            this.fetchAndUpdate();
        } catch (e) {
            console.error("Failed to apply reconfiguration mode:", e);
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
            const data = await res.json();
            
            // تحديث العرض ثلاثي الأبعاد
            this.viewer.updateRealtimeState(data);

            // تحديث المؤشرات التحليلية وجداول المقارنة
            this.analytics.updateDashboard(data);
        } catch (err) {
            console.warn("Telemetry fetch error:", err);
        }
    }
}

// بدء التشغيل عند تحميل الصفحة
window.addEventListener('DOMContentLoaded', () => {
    window.twinApp = new TwinApp();
});
