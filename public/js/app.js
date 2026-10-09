// public/js/app.js
/**
 * Main Application Controller for Adaptive Digital Twin.
 * Synchronizes API calls, manages UI controls, and coordinates
 * 3D rendering and analytics modules.
 */

class TwinApp {
    constructor() {
        window.app = this;
        window.twinApp = this;
        this.viewer = null;
        this.analytics = null;
        this.planManager = null;
        this.authManager = null;
        this.pollingInterval = null;
        this.activeScenario = 'normal';
        this.reconfigMode = 'baseline';
        this.isAdaptive = false;
        
        this.init();
    }

    async init() {
        console.log("Initializing Adaptive Digital Twin Dashboard...");
        
        // 0. تهيئة نظام المصادقة والصلاحيات (AuthManager - RBAC)
        try {
            if (typeof AuthManager !== 'undefined') {
                this.authManager = new AuthManager(this);
            }
        } catch (err) {
            console.error("Error in AuthManager init:", err);
        }

        // 1. تهيئة المحركات مع العزل والحماية (Fault-tolerant Multi-Stage Initialization)
        try {
            this.viewer = new Twin3DViewer('viewport-container');
        } catch (err) {
            console.error("Critical error in Twin3DViewer init:", err);
            const banner = document.getElementById('js-error-banner');
            if (banner) {
                banner.textContent = `⚠️ تعذر تشغيل محرك 3D: ${err.message}`;
                banner.style.display = 'block';
            }
        }

        try {
            this.analytics = new TwinAnalytics();
        } catch (err) {
            console.error("Error in TwinAnalytics init:", err);
        }

        try {
            this.planManager = new PlanManager(this);
        } catch (err) {
            console.error("Error in PlanManager init:", err);
        }

        try {
            if (typeof ObservationManager !== 'undefined') {
                this.observationManager = new ObservationManager(this);
            }
        } catch (err) {
            console.error("Error in ObservationManager init:", err);
        }

        // تغليف loadBuildingModel لتحديث شريط الطوابق وعارض IFC ومدخلات الملاحظة تلقائيًا عند كل استدعاء
        if (this.viewer && typeof this.viewer.loadBuildingModel === 'function') {
            const _origLoad = this.viewer.loadBuildingModel.bind(this.viewer);
            this.viewer.loadBuildingModel = (modelData) => {
                try {
                    _origLoad(modelData);
                } catch (e) {
                    console.error("Error inside viewer.loadBuildingModel:", e);
                }
                try {
                    this.updateStoreyBar(modelData);
                } catch (e) {
                    console.warn("Error updating storey bar:", e);
                }
                if (this.refreshIfcViewerUI) {
                    try {
                        this.refreshIfcViewerUI();
                    } catch (e) {
                        console.warn("Error refreshing IFC viewer UI:", e);
                    }
                }
                if (this.observationManager && typeof this.observationManager.onModelLoaded === 'function') {
                    try {
                        this.observationManager.onModelLoaded(modelData);
                    } catch (e) {
                        console.warn("Error updating observation manager model:", e);
                    }
                }
            };
        }

        // 2. جلب وتوليد النموذج المعماري ثلاثي الأبعاد
        try {
            await this.loadSpatialModel();
        } catch (err) {
            console.error("Error in loadSpatialModel:", err);
        }

        // توليد بطاقات وأزرار القواطع المنزلقة التكيفية فورياً عند بدء التشغيل
        try {
            this.renderSlidingPartitionsControls();
        } catch (err) {
            console.error("Error rendering sliding partitions controls on init:", err);
        }

        // 3. ربط أحداث واجهة المستخدم (حاسم جداً: يُنفّذ دائماً حتى لو تعثر تحميل النموذج)
        try {
            this.setupEventListeners();
        } catch (err) {
            console.error("Error in setupEventListeners:", err);
        }

        try {
            this.setupIfcViewer();
        } catch (err) {
            console.error("Error in setupIfcViewer:", err);
        }

        // 4. بدء دفق التزامن اللحظي
        try {
            this.startTelemetryLoop();
        } catch (err) {
            console.error("Error starting telemetry loop:", err);
        }
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
        if (window.__PRESETS__ && window.__PRESETS__["administrative_office"]) {
            this.viewer.loadBuildingModel(window.__PRESETS__["administrative_office"]);
            if (this.planManager) {
                this.planManager.updateActiveBuildingTitle(window.__PRESETS__["administrative_office"]);
            }
            console.log("Loaded full preset model for administrative_office.");
        } else if (window.__DEFAULT_OFFICE_MODEL__) {
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
                let label = storey.name_ar || storey.name || storeyId;
                label = label.replace(/^طابق\s*معماري:\s*/i, '').trim();
                if (!label) label = storey.name || storeyId;
                btn.textContent = `${label} (${elev >= 0 ? '+' : ''}${elev}m)`;
                btn.title = `طابق: ${storey.name || storeyId} — ارتفاع: ${elev}م`;
                btn.addEventListener('click', () => {
                    this.viewer.setStoreyFilter(storeyId);
                    container.querySelectorAll('.storey-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
                container.appendChild(btn);
            });

        // أزرار التمرير الأفقي لشريط الطوابق
        const btnScrollLeft = document.getElementById('btn-storey-scroll-left');
        const btnScrollRight = document.getElementById('btn-storey-scroll-right');
        if (btnScrollLeft && !btnScrollLeft._bound) {
            btnScrollLeft._bound = true;
            btnScrollLeft.addEventListener('click', () => {
                container.scrollBy({ left: -140, behavior: 'smooth' });
            });
        }
        if (btnScrollRight && !btnScrollRight._bound) {
            btnScrollRight._bound = true;
            btnScrollRight.addEventListener('click', () => {
                container.scrollBy({ left: 140, behavior: 'smooth' });
            });
        }

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
        // أ. التبديل بين السيناريوهات الإشغالية
        const scenarioBtns = document.querySelectorAll('[data-scenario]');
        scenarioBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const scenario = btn.dataset.scenario;
                if (!scenario) return;

                scenarioBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeScenario = scenario;

                // استجابة بصرية ورقمية فورية في الواجهة والـ HUD (Zero-Latency Local Feedback)
                this.simulateClientTick();

                try {
                    await fetch('/api/scenario', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ scenario })
                    });
                } catch (err) {
                    console.log("Scenario applied locally:", scenario);
                }

                // تحديث فوري
                this.fetchAndUpdate();
            });
        });

        // ب. مفتاح تشغيل التكيف التلقائي (Autonomous Adaptive Toggle)
        const adaptiveToggle = document.getElementById('adaptive-toggle');
        if (adaptiveToggle) {
            adaptiveToggle.addEventListener('change', async (e) => {
                this.isAdaptive = e.target.checked;
                const targetMode = this.isAdaptive ? 'kinetic' : 'baseline';
                await this.applyReconfiguration(targetMode);
            });
        }

        // ج. أزرار التحكم في الكاميرا وأداة الملاحة ثلاثية الأبعاد (Navigation Gizmo)
        const btnTopView = document.getElementById('btn-top-view');
        if (btnTopView) {
            btnTopView.addEventListener('click', () => this.viewer.toggleCameraView());
        }

        const btnResetView = document.getElementById('btn-reset-view');
        if (btnResetView) {
            btnResetView.addEventListener('click', () => this.viewer.resetCamera());
        }

        const bindGizmoBtn = (id, action) => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', action);
        };
        bindGizmoBtn('btn-nav-orbit-left', () => this.viewer.orbitCamera(15, 0));
        bindGizmoBtn('btn-nav-orbit-right', () => this.viewer.orbitCamera(-15, 0));
        bindGizmoBtn('btn-nav-tilt-up', () => this.viewer.orbitCamera(0, 10));
        bindGizmoBtn('btn-nav-tilt-down', () => this.viewer.orbitCamera(0, -10));
        bindGizmoBtn('btn-nav-pan-left', () => this.viewer.panCamera(-10, 0));
        bindGizmoBtn('btn-nav-pan-right', () => this.viewer.panCamera(10, 0));
        bindGizmoBtn('btn-nav-pan-up', () => this.viewer.panCamera(0, 10));
        bindGizmoBtn('btn-nav-pan-down', () => this.viewer.panCamera(0, -10));
        bindGizmoBtn('btn-nav-hand-pan', () => {
            if (this.viewer && typeof this.viewer.togglePanMode === 'function') {
                this.viewer.togglePanMode();
            }
        });
        bindGizmoBtn('btn-nav-zoom-in', () => this.viewer.zoomCamera(1.25));
        bindGizmoBtn('btn-nav-zoom-out', () => this.viewer.zoomCamera(0.8));
        bindGizmoBtn('btn-nav-fit', () => this.viewer.fitCameraToBuilding());
        bindGizmoBtn('btn-toggle-bg-theme', () => {
            const isWhite = this.viewer.toggleBackgroundTheme();
            const btn = document.getElementById('btn-toggle-bg-theme');
            if (btn) btn.title = isWhite ? 'الخلفية: أبيض (انقر للتبديل للداكن)' : 'الخلفية: داكن (انقر للتبديل للأبيض)';
        });
        bindGizmoBtn('btn-gizmo-rot-x', () => {
            if (this.viewer && typeof this.viewer.rotateModel === 'function') {
                this.viewer.rotateModel('x', Math.PI / 2);
            }
        });
        bindGizmoBtn('btn-gizmo-rot-y', () => {
            if (this.viewer && typeof this.viewer.rotateModel === 'function') {
                this.viewer.rotateModel('y', Math.PI / 2);
            }
        });
        bindGizmoBtn('btn-gizmo-rot-z', () => {
            if (this.viewer && typeof this.viewer.rotateModel === 'function') {
                this.viewer.rotateModel('z', Math.PI / 2);
            }
        });
        bindGizmoBtn('btn-gizmo-autolevel', () => {
            if (this.viewer && typeof this.viewer.autoLevelModel === 'function') {
                this.viewer.autoLevelModel();
            }
        });

        // طي وتوسيع اللوحة الجانبية (Sidebar Collapse) لتوسيع المشهد إلى 100%
        const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
        const btnRestoreSidebar = document.getElementById('btn-restore-sidebar');
        const mainSidebar = document.getElementById('main-sidebar');

        const toggleSidebar = (collapse) => {
            if (!mainSidebar) return;
            mainSidebar.classList.toggle('collapsed', collapse);
            if (btnRestoreSidebar) btnRestoreSidebar.style.display = collapse ? 'inline-flex' : 'none';
            setTimeout(() => {
                if (this.viewer && typeof this.viewer.onWindowResize === 'function') {
                    this.viewer.onWindowResize();
                }
            }, 320);
        };

        if (btnToggleSidebar) {
            btnToggleSidebar.addEventListener('click', () => toggleSidebar(true));
        }
        if (btnRestoreSidebar) {
            btnRestoreSidebar.addEventListener('click', () => toggleSidebar(false));
        }

        // أزرار طي وتوسيع لوحات العرض (HUD & Blueprint Overlay) لتوفير أقصى مساحة رؤية
        const btnToggleHud = document.getElementById('btn-toggle-hud');
        const hudCards = document.getElementById('hud-cards-container');
        const hudArrow = document.getElementById('hud-collapse-arrow');
        if (btnToggleHud && hudCards) {
            btnToggleHud.addEventListener('click', () => {
                const isCollapsed = hudCards.classList.toggle('collapsed');
                if (hudArrow) hudArrow.textContent = isCollapsed ? '⏶' : '⏷';
            });
        }

        const btnToggleBpHud = document.getElementById('btn-toggle-blueprint-hud');
        const bpHudContent = document.getElementById('blueprint-hud-content');
        const bpArrow = document.getElementById('bp-collapse-arrow');
        if (btnToggleBpHud && bpHudContent) {
            btnToggleBpHud.addEventListener('click', () => {
                const isCollapsed = bpHudContent.classList.toggle('collapsed');
                if (bpArrow) bpArrow.textContent = isCollapsed ? '⏶' : '⏷';
            });
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

        // هـ-2. أزرار التحكم السريع بالقواطع المنزلقة التكيفية (Sliding Partitions Master Buttons)
        const btnPartOpenAll = document.getElementById('btn-partitions-open-all');
        if (btnPartOpenAll) {
            btnPartOpenAll.addEventListener('click', async () => {
                await this.openAllPartitions();
            });
        }
        const btnPartCloseAll = document.getElementById('btn-partitions-close-all');
        if (btnPartCloseAll) {
            btnPartCloseAll.addEventListener('click', async () => {
                await this.closeAllPartitions();
            });
        }

        // أزرار شريط التحكم العائم داخل شاشة 3D (Floating Viewport Partition Dock)
        const vpOpenPart = document.getElementById('vp-btn-open-partition');
        if (vpOpenPart) {
            vpOpenPart.addEventListener('click', async () => {
                await this.openAllPartitions();
            });
        }
        const vpClosePart = document.getElementById('vp-btn-close-partition');
        if (vpClosePart) {
            vpClosePart.addEventListener('click', async () => {
                await this.closeAllPartitions();
            });
        }
        const vpFocusPart = document.getElementById('vp-btn-focus-partition');
        if (vpFocusPart) {
            vpFocusPart.addEventListener('click', () => {
                const partitions = this.viewer?.buildingData?.partitions || {};
                const pId = Object.keys(partitions)[0];
                if (pId && this.viewer && typeof this.viewer.focusPartition === 'function') {
                    this.viewer.focusPartition(pId, true);
                }
            });
        }

        // زر القواطع المنزلقة في الترويسة العلوية (Header Quick Partition Access)
        const btnHeaderPart = document.getElementById('btn-header-partitions');
        if (btnHeaderPart) {
            btnHeaderPart.addEventListener('click', async () => {
                // 1. إذا كانت القائمة الجانبية مطوية، أظهرها فوراً
                const sidebar = document.getElementById('main-sidebar');
                if (sidebar && sidebar.classList.contains('collapsed')) {
                    sidebar.classList.remove('collapsed');
                    const restoreBtn = document.getElementById('btn-restore-sidebar');
                    if (restoreBtn) restoreBtn.style.display = 'none';
                }
                // 2. تمرير سلس نحو قسم القواطع في القائمة الجانبية وإبرازه
                const partSection = document.getElementById('sliding-partitions-section') || document.getElementById('btn-reconfig-kinetic');
                if (partSection) {
                    partSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    partSection.style.outline = '2px solid #00d2ff';
                    partSection.style.boxShadow = '0 0 25px rgba(0, 210, 255, 0.6)';
                    setTimeout(() => {
                        partSection.style.outline = '';
                        partSection.style.boxShadow = '';
                    }, 3500);
                }
                // 3. فتح القواطع وتوجيه الكاميرا سينمائياً
                await this.openAllPartitions();
            });
        }

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

    setupIfcViewer() {
        const modal = document.getElementById('ifc-viewer-modal');
        const btnOpen = document.getElementById('btn-open-ifc-viewer');
        const btnClose = document.getElementById('btn-close-ifc-viewer-modal');

        const openModal = () => {
            if (!modal) return;
            modal.classList.add('active');
            this.refreshIfcViewerUI();
        };

        const closeModal = () => {
            if (!modal) return;
            modal.classList.remove('active');
        };

        this.openIfcViewer = openModal;
        this.closeIfcViewer = closeModal;

        if (btnOpen) btnOpen.addEventListener('click', openModal);
        if (btnClose) btnClose.addEventListener('click', closeModal);

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });
        }

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
                closeModal();
            }
        });

        // الأزرار التفاعلية على الشريط العائم في شاشة 3D
        const btnVpOpen = document.getElementById('btn-vp-open-ifc');
        if (btnVpOpen) btnVpOpen.addEventListener('click', openModal);

        const btnVpClose = document.getElementById('btn-vp-close-pill');
        if (btnVpClose) {
            btnVpClose.addEventListener('click', () => {
                const vpPill = document.getElementById('viewport-element-pill');
                if (vpPill) vpPill.style.display = 'none';
                if (this.viewer) this.viewer.clearSelection();
            });
        }

        const btnVpConvertToSpace = document.getElementById('btn-vp-convert-to-space');
        if (btnVpConvertToSpace) {
            btnVpConvertToSpace.addEventListener('click', () => {
                this.convertSelectedElementToSpace();
            });
        }

        // أزرار الإجراءات السريعة (Quick Actions)
        const btnPureBim = document.getElementById('btn-ifc-pure-bim');
        if (btnPureBim) {
            btnPureBim.addEventListener('click', () => {
                if (this.viewer) {
                    this.viewer.setIfcCategoryVisible('slabs_site', false);
                    this.viewer.setIfcCategoryVisible('spaces', false);
                    this.viewer.cleanGhostElements();
                    this.refreshIfcViewerUI();
                }
            });
        }

        const btnCleanGhost = document.getElementById('btn-ifc-clean-ghost');
        if (btnCleanGhost) {
            btnCleanGhost.addEventListener('click', () => {
                if (this.viewer) {
                    this.viewer.cleanGhostElements();
                    this.refreshIfcViewerUI();
                }
            });
        }

        const btnShowAll = document.getElementById('btn-ifc-show-all');
        if (btnShowAll) {
            btnShowAll.addEventListener('click', () => {
                if (this.viewer) {
                    const cats = ['walls', 'slabs_floor', 'slabs_roof', 'slabs_site', 'columns', 'beams', 'doors', 'windows', 'stairs', 'spaces'];
                    cats.forEach(c => this.viewer.setIfcCategoryVisible(c, true));
                    this.refreshIfcViewerUI();
                }
            });
        }

        const btnResetView = document.getElementById('btn-ifc-reset-view');
        if (btnResetView) {
            btnResetView.addEventListener('click', () => {
                if (this.viewer) {
                    this.viewer.resetAllElementVisibility();
                    this.viewer.resetCamera();
                    this.viewer.setStoreyFilter('all');
                    this.refreshIfcViewerUI();
                }
            });
        }

        // أزرار تدوير وتصحيح استقامة مجسمات الـ IFC في نافذة الفاحص
        const bindIfcRot = (id, axis, angle) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => {
                    if (this.viewer && typeof this.viewer.rotateModel === 'function') {
                        this.viewer.rotateModel(axis, angle);
                    }
                });
            }
        };

        bindIfcRot('btn-ifc-rot-x', 'x', Math.PI / 2);
        bindIfcRot('btn-ifc-rot-y', 'y', Math.PI / 2);
        bindIfcRot('btn-ifc-rot-z', 'z', Math.PI / 2);

        const btnAutoLevelModal = document.getElementById('btn-ifc-autolevel');
        if (btnAutoLevelModal) {
            btnAutoLevelModal.addEventListener('click', () => {
                if (this.viewer && typeof this.viewer.autoLevelModel === 'function') {
                    this.viewer.autoLevelModel();
                }
            });
        }

        // أزرار فاحص خصائص العنصر (Inspector Actions)
        const btnIsolate = document.getElementById('btn-inspector-isolate');
        if (btnIsolate) {
            btnIsolate.addEventListener('click', () => {
                if (this.selectedElementDetails && this.viewer) {
                    this.viewer.isolateElement(this.selectedElementDetails.info.type, this.selectedElementDetails.info.id);
                }
            });
        }

        const btnHide = document.getElementById('btn-inspector-hide');
        if (btnHide) {
            btnHide.addEventListener('click', () => {
                if (this.selectedElementDetails && this.viewer) {
                    this.viewer.setElementVisible(this.selectedElementDetails.info.type, this.selectedElementDetails.info.id, false);
                    this.viewer.clearSelection();
                }
            });
        }

        const btnFocus = document.getElementById('btn-inspector-focus');
        if (btnFocus) {
            btnFocus.addEventListener('click', () => {
                if (this.selectedElementDetails && this.selectedElementDetails.mesh && this.viewer) {
                    this.viewer.focusOnElement(this.selectedElementDetails.mesh);
                }
            });
        }

        const btnResetElem = document.getElementById('btn-inspector-reset');
        if (btnResetElem) {
            btnResetElem.addEventListener('click', () => {
                if (this.viewer) {
                    this.viewer.resetAllElementVisibility();
                    this.refreshIfcViewerUI();
                }
            });
        }

        // ربط مستمع النقر في المنظور 3D
        if (this.viewer) {
            this.viewer.onElementSelected = (details) => {
                this.renderInspectorDetails(details);
            };
        }
    }

    refreshIfcViewerUI() {
        if (!this.viewer) return;
        const stats = this.viewer.getIfcStats ? this.viewer.getIfcStats() : {};
        const bData = this.viewer.buildingData || {};

        // تحديث شارة إجمالي العناصر النشطة
        const total = Object.values(stats).reduce((acc, v) => acc + (v || 0), 0);
        const badge = document.getElementById('ifc-total-elements-badge');
        if (badge) {
            badge.textContent = `${total} عنصر معماري نشط`;
        }

        // مصفوفة طبقات وفئات BIM
        const categories = [
            { key: 'walls', icon: '🧱', name_ar: 'الجدران المعمارية (Walls)', ifc_type: 'IfcWall / StandardCase' },
            { key: 'slabs_floor', icon: '⬜', name_ar: 'بلاطات الطوابق (Floor Slabs)', ifc_type: 'IfcSlab (Floor)' },
            { key: 'slabs_roof', icon: '🏠', name_ar: 'أسطح المبنى (Roof Slabs)', ifc_type: 'IfcRoof / IfcSlab (Roof)' },
            { key: 'slabs_site', icon: '🌐', name_ar: 'سطح الموقع العام (Site Footprint)', ifc_type: 'IfcSite / Terrain' },
            { key: 'columns', icon: '🏛️', name_ar: 'الأعمدة الإنشائية (Columns)', ifc_type: 'IfcColumn' },
            { key: 'beams', icon: '🏗️', name_ar: 'الجسور والكمرات (Beams)', ifc_type: 'IfcBeam' },
            { key: 'doors', icon: '🚪', name_ar: 'الأبواب المعمارية (Doors)', ifc_type: 'IfcDoor' },
            { key: 'windows', icon: '🪟', name_ar: 'النوافذ والواجهات الزجاجية (Windows)', ifc_type: 'IfcWindow' },
            { key: 'stairs', icon: '🪜', name_ar: 'الأدراج والسلالم (Stairs)', ifc_type: 'IfcStair' },
            { key: 'spaces', icon: '📦', name_ar: 'الفضاءات والمناطق الوظيفية (Spaces)', ifc_type: 'IfcSpace' }
        ];

        const container = document.getElementById('ifc-layers-container');
        if (container) {
            container.innerHTML = '';
            categories.forEach(cat => {
                const count = stats[cat.key] || 0;
                const isVis = this.viewer.ifcCategoryVisibility ? this.viewer.ifcCategoryVisibility[cat.key] !== false : true;

                const row = document.createElement('div');
                row.className = 'ifc-layer-row';
                row.innerHTML = `
                    <div class="ifc-layer-info">
                        <span class="ifc-layer-icon">${cat.icon}</span>
                        <div>
                            <div class="ifc-layer-title">${cat.name_ar}</div>
                            <div class="ifc-layer-sub">${cat.ifc_type}</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="ifc-layer-count">${count} عنصر</span>
                        <label class="ifc-toggle">
                            <input type="checkbox" data-ifc-cat="${cat.key}" ${isVis ? 'checked' : ''}>
                            <span class="ifc-toggle-slider"></span>
                        </label>
                    </div>
                `;

                const checkbox = row.querySelector('input');
                checkbox.addEventListener('change', (e) => {
                    this.viewer.setIfcCategoryVisible(cat.key, e.target.checked);
                });

                container.appendChild(row);
            });
        }

        // أزرار عزل الطوابق (Storey Isolator Pills)
        const pillsContainer = document.getElementById('ifc-storey-isolator-pills');
        if (pillsContainer) {
            pillsContainer.innerHTML = '';
            const btnAll = document.createElement('button');
            btnAll.className = `storey-pill ${(!this.viewer.activeStoreyFilter || this.viewer.activeStoreyFilter === 'all') ? 'active' : ''}`;
            btnAll.textContent = '🏙️ جميع الطوابق';
            btnAll.addEventListener('click', () => {
                this.viewer.setStoreyFilter('all');
                pillsContainer.querySelectorAll('.storey-pill').forEach(p => p.classList.remove('active'));
                btnAll.classList.add('active');
            });
            pillsContainer.appendChild(btnAll);

            const storeys = bData.storeys || {};
            Object.entries(storeys)
                .sort((a, b) => (a[1].elevation ?? 0) - (b[1].elevation ?? 0))
                .forEach(([storeyId, s]) => {
                    const pill = document.createElement('button');
                    const isActive = this.viewer.activeStoreyFilter === storeyId;
                    pill.className = `storey-pill ${isActive ? 'active' : ''}`;
                    const elev = (s.elevation ?? 0).toFixed(1);
                    pill.textContent = `${s.name_ar || s.name || storeyId} (+${elev}m)`;
                    pill.addEventListener('click', () => {
                        this.viewer.setStoreyFilter(storeyId);
                        pillsContainer.querySelectorAll('.storey-pill').forEach(p => p.classList.remove('active'));
                        pill.classList.add('active');
                    });
                    pillsContainer.appendChild(pill);
                });
        }
    }

    renderInspectorDetails(details) {
        this.selectedElementDetails = details;
        const emptyState = document.getElementById('ifc-inspector-empty');
        const cardState = document.getElementById('ifc-inspector-card');
        const statusText = document.getElementById('ifc-inspector-status');
        const vpPill = document.getElementById('viewport-element-pill');

        if (!details || !details.info) {
            if (emptyState) emptyState.style.display = 'flex';
            if (cardState) cardState.style.display = 'none';
            if (statusText) statusText.textContent = 'انقر على أي عنصر في 3D';
            if (vpPill) vpPill.style.display = 'none';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (cardState) cardState.style.display = 'flex';
        if (statusText) statusText.textContent = 'عنصر نشط في المنظور';

        const elemName = document.getElementById('inspector-elem-name');
        const elemClass = document.getElementById('inspector-elem-class');
        const elemStorey = document.getElementById('inspector-elem-storey');
        const paramsTable = document.getElementById('inspector-params-table');

        const name = details.info.name_ar || details.info.name_en || details.info.id;
        const cls = `${details.info.ifcType} • [ID: ${details.info.id}]`;
        const storey = `📍 ${details.info.storeyName || details.info.storey_id}`;

        if (elemName) elemName.textContent = name;
        if (elemClass) elemClass.textContent = cls;
        if (elemStorey) elemStorey.textContent = storey;

        if (paramsTable) {
            let html = '';
            for (const [k, v] of Object.entries(details.info.dimensions || {})) {
                html += `
                    <tr style="border-bottom: 1px solid rgba(148, 163, 184, 0.1);">
                        <td style="padding: 6px 4px; color: #94a3b8; width: 45%;">${k}</td>
                        <td style="padding: 6px 4px; font-weight: 500; color: #f8fafc; text-align: left; font-family: monospace;">${v}</td>
                    </tr>
                `;
            }
            paramsTable.innerHTML = html;
        }

        // تحديث الشريط العائم في شاشة الـ 3D
        if (vpPill) {
            const iconEl = document.getElementById('vp-pill-icon');
            const titleEl = document.getElementById('vp-pill-title');
            const subEl = document.getElementById('vp-pill-sub');
            const convertBtn = document.getElementById('btn-vp-convert-to-space');

            const icons = {
                wall: '🧱', slab: '⬜', column: '🏛️', beam: '🏗️',
                opening: details.info.ifcType === 'IfcDoor' ? '🚪' : '🪟',
                stair: '🪜', space: '📦'
            };
            if (iconEl) iconEl.textContent = icons[details.info.type] || '🏢';
            if (titleEl) titleEl.textContent = name;
            if (subEl) subEl.textContent = cls;

            if (convertBtn) {
                const canConvert = details.info.type === 'slab' || details.info.ifcType === 'IfcSlab' || details.info.type === 'wall' || details.info.ifcType === 'IfcWall' || details.info.ifcType === 'IfcWallStandardCase';
                convertBtn.style.display = canConvert ? 'inline-block' : 'none';
            }

            vpPill.style.display = 'flex';
        }
    }

    async convertSelectedElementToSpace() {
        const details = this.selectedElementDetails;
        if (!details || !details.info) {
            alert("⚠️ يرجى تحديد عنصر (بلاطة أو جدار) في المشهد ثلاثي الأبعاد أولاً.");
            return;
        }

        const bData = this.viewer?.buildingData;
        if (!bData) return;
        if (!bData.spaces) bData.spaces = {};

        let minX = -5, maxX = 5, minZ = -5, maxZ = 5, elev = 0;
        let width = 10, depth = 10;

        if (details.mesh && window.THREE) {
            const box = new THREE.Box3().setFromObject(details.mesh);
            if (isFinite(box.min.x) && isFinite(box.max.x)) {
                minX = box.min.x;
                maxX = box.max.x;
                minZ = box.min.z;
                maxZ = box.max.z;
                width = Math.max(1.5, maxX - minX);
                depth = Math.max(1.5, maxZ - minZ);
                elev = Math.round(box.min.y * 10) / 10;
            }
        } else if (details.info.dimensions) {
            const d = details.info.dimensions;
            width = parseFloat(d.Width || d['العرض'] || 6.0) || 6.0;
            depth = parseFloat(d.Length || d['الطول'] || 6.0) || 6.0;
        }

        const area = Math.round(width * depth * 10) / 10;
        const cx = Math.round(((minX + maxX) / 2) * 10) / 10;
        const cz = Math.round(((minZ + maxZ) / 2) * 10) / 10;

        const elemLabel = details.info.name_ar || details.info.ifcType || 'عنصر إنشائي IFC';
        const roomName = prompt(`تحويل العنصر (${elemLabel}) إلى فضاء معماري نشط:\nالمساحة المقدرة: ${area}م²\nأدخل اسم الفضاء:`, `فضاء مشتق من ${elemLabel}`);
        if (!roomName) return;

        const spaceId = `space_ifc_${Date.now()}`;
        const spaceObj = {
            id: spaceId,
            name_ar: roomName,
            name_en: `Derived Space (${details.info.ifcType || 'IFC'})`,
            type: "flexible",
            capacity: Math.max(2, Math.round(area / 3.5)),
            area_m2: area,
            centroid: [cx, cz],
            polygon: [
                [Math.round(minX * 100) / 100, Math.round(minZ * 100) / 100],
                [Math.round(maxX * 100) / 100, Math.round(minZ * 100) / 100],
                [Math.round(maxX * 100) / 100, Math.round(maxZ * 100) / 100],
                [Math.round(minX * 100) / 100, Math.round(maxZ * 100) / 100]
            ],
            bounds: {
                x: Math.round(minX * 10) / 10,
                z: Math.round(minZ * 10) / 10,
                width: Math.round(width * 10) / 10,
                depth: Math.round(depth * 10) / 10,
                height: 3.5
            },
            base_elevation: elev,
            storey_id: details.info.storey_id || this.viewer?.activeStoreyFilter || 'st_g',
            color: "#9b59b6"
        };

        bData.spaces[spaceId] = spaceObj;

        this.viewer.loadBuildingModel(bData);
        if (this.planManager) {
            this.planManager.populateSpacesEditor();
        }

        const tracerHint = document.getElementById('tracer-hint');
        if (tracerHint) {
            tracerHint.textContent = `✓ تم تحويل ${elemLabel} إلى فضاء معماري نشط (${roomName}) بمساحة ${area}م²!`;
        }
        alert(`✨ تم التحويل بنجاح!\nتم إنشاء فضاء معماري نشط (${roomName}) بمساحة ${area}م²، وتوليد أرضيته ثلاثية الأبعاد وربطه بشبكة حساسات IoT والتوأم الرقمي.`);

        try {
            await fetch('/api/model/add_element', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'space', element: spaceObj })
            });
            if (this.analytics) {
                await this.analytics.fetchAndUpdateSensorsInventory();
                await this.analytics.fetchAndUpdateIoTTelemetry();
            }
        } catch(err) {
            console.error("Failed to sync converted space:", err);
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

            // تحديث القواطع فورياً في المشهد ثلاثي الأبعاد
            if (this.viewer && this.viewer.buildingData && this.viewer.buildingData.partitions) {
                const isOpen = (mode !== 'baseline');
                for (const p of Object.values(this.viewer.buildingData.partitions)) {
                    p.status = isOpen ? 'open' : 'closed';
                }
                if (typeof this.viewer.setPartitionStates === 'function') {
                    this.viewer.setPartitionStates(this.viewer.buildingData.partitions);
                }
                // تركيز الكاميرا سينمائياً تلقائياً على القاطع عند تفعيل التكيف الحركي
                if (isOpen && typeof this.viewer.focusPartition === 'function') {
                    const firstPId = Object.keys(this.viewer.buildingData.partitions)[0];
                    if (firstPId) {
                        this.viewer.focusPartition(firstPId, true);
                    }
                }
            }
            this.renderSlidingPartitionsControls();

            // 5. استجابة بصرية ورقمية فورية في الواجهة والـ HUD (Zero-Latency Local Feedback)
            this.simulateClientTick();

            // 6. إرسال طلب التكيف إلى الخادم إذا كان متاحاً
            try {
                await fetch('/api/reconfiguration/apply', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode })
                });
            } catch (err) {
                console.log("Reconfiguration applied locally:", mode);
            }

            // 7. مزامنة البيانات وتحديث الحساسات
            this.fetchAndUpdate();
        } catch (e) {
            console.error("Error in applyReconfiguration:", e);
            this.simulateClientTick();
        }
    }

    renderSlidingPartitionsControls() {
        const container = document.getElementById('sliding-partitions-list');
        const countBadge = document.getElementById('partitions-active-count');
        if (!container) return;

        const partitions = this.viewer?.buildingData?.partitions || {};
        const entries = Object.entries(partitions);

        if (countBadge) {
            countBadge.textContent = `${entries.length} قاطع`;
        }

        const vpDock = document.getElementById('viewport-partitions-dock');
        if (vpDock) {
            vpDock.style.display = entries.length > 0 ? 'flex' : 'none';
        }

        if (entries.length === 0) {
            container.innerHTML = `
                <div style="font-size:11px; color:var(--text-muted); text-align:center; padding:10px; background:rgba(15,23,42,0.5); border-radius:6px;">
                    لا توجد قواطع مرنة منزلقة في المخطط الحالي.
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        const spaces = this.viewer?.buildingData?.spaces || {};

        for (const [pId, part] of entries) {
            const pObj = this.viewer?.partitionMeshes?.[pId];
            const isOpen = (pObj ? (pObj.status === 'open') : (part.status === 'open'));
            const expCap = part.expansion_capacity || 18;

            let spaceNames = '';
            if (part.between && part.between.length >= 2) {
                const s1 = spaces[part.between[0]]?.name_ar || part.between[0];
                const s2 = spaces[part.between[1]]?.name_ar || part.between[1];
                spaceNames = `${s1} ↔ ${s2}`;
            }

            const card = document.createElement('div');
            card.className = 'sliding-partition-card';
            card.id = `partition-card-${pId}`;
            card.innerHTML = `
                <div class="sliding-partition-header">
                    <span class="sliding-partition-title">${part.name_ar || 'قاطع منزلق تكيفي'}</span>
                    <span class="sliding-partition-status-pill ${isOpen ? 'open' : 'closed'}" id="partition-status-${pId}">
                        ${isOpen ? '🔓 منزلق ومفتوح' : '🔒 مغلق ومحكم'}
                    </span>
                </div>
                ${spaceNames ? `<div style="font-size:11px; color:#94a3b8; font-weight:500;">🔗 بين: ${spaceNames}</div>` : ''}
                <div class="sliding-partition-body">
                    <span>العائد الفراغي: <strong style="color:var(--accent-cyan);">+${expCap} سعة</strong></span>
                    <span id="partition-progress-text-${pId}" style="color:${isOpen ? 'var(--accent-cyan)' : 'var(--text-muted)'}; font-weight:bold;">
                        ${isOpen ? '100% مفتوح' : '0% مغلق'}
                    </span>
                </div>
                <div class="sliding-progress-bar">
                    <div class="sliding-progress-fill" id="partition-progress-bar-${pId}" style="width: ${isOpen ? '100%' : '0%'};"></div>
                </div>
                <div class="sliding-partition-actions">
                    <button class="sliding-btn-toggle" data-pid="${pId}" id="btn-toggle-part-${pId}">
                        ${isOpen ? '🔒 إغلاق القاطع' : '🚪 انزلاق وفتح القاطع'}
                    </button>
                    <button class="sliding-btn-focus" data-pid="${pId}" title="تركيز الكاميرا على القاطع المنزلق">
                        👁️ تركيز
                    </button>
                </div>
            `;

            // ربط زر التبديل
            const toggleBtn = card.querySelector(`.sliding-btn-toggle`);
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    this.togglePartition(pId);
                });
            }

            // ربط زر التركيز
            const focusBtn = card.querySelector(`.sliding-btn-focus`);
            if (focusBtn) {
                focusBtn.addEventListener('click', () => {
                    if (this.viewer && typeof this.viewer.focusPartition === 'function') {
                        this.viewer.focusPartition(pId);
                    }
                });
            }

            container.appendChild(card);
        }
    }

    async togglePartition(pId) {
        if (!this.viewer) return;
        this.viewer.togglePartition(pId);
    }

    async onPartitionToggled(pId, newStatus) {
        const isOpen = (newStatus === 'open');
        const part = this.viewer?.buildingData?.partitions?.[pId];
        const expCap = part?.expansion_capacity || 18;

        // تحديث بطاقة الواجهة
        const statusPill = document.getElementById(`partition-status-${pId}`);
        if (statusPill) {
            statusPill.className = `sliding-partition-status-pill ${isOpen ? 'open' : 'closed'}`;
            statusPill.textContent = isOpen ? '🔓 منزلق ومفتوح' : '🔒 مغلق ومحكم';
        }

        const progressText = document.getElementById(`partition-progress-text-${pId}`);
        if (progressText) {
            progressText.textContent = isOpen ? '100% مفتوح' : '0% مغلق';
            progressText.style.color = isOpen ? 'var(--accent-cyan)' : 'var(--text-muted)';
        }

        const progressBar = document.getElementById(`partition-progress-bar-${pId}`);
        if (progressBar) {
            progressBar.style.width = isOpen ? '100%' : '0%';
        }

        const toggleBtn = document.getElementById(`btn-toggle-part-${pId}`);
        if (toggleBtn) {
            toggleBtn.innerHTML = isOpen ? '🔒 إغلاق القاطع' : '🚪 انزلاق وفتح القاطع';
        }

        // تحديث الـ Floating Viewport Dock
        const dockBadge = document.getElementById('vp-dock-status-badge');
        if (dockBadge) {
            dockBadge.textContent = isOpen ? 'مفتوح 🔓' : 'مغلق 🔒';
            dockBadge.classList.toggle('open', isOpen);
        }

        // إظهار إشعار Toast جميل للمستخدم
        const name = part?.name_ar || 'القاطع المنزلق';
        const toastMsg = isOpen
            ? `🚪 انزلق ${name} بنجاح: تم دمج الفضاءين وتوسيع السعة بمقدار +${expCap} شخصاً.`
            : `🔒 تم إغلاق ${name}: تم عزل الفضاءين صوتياً وفصل السعة الاستيعابية.`;
        this.showActionToast(toastMsg);

        // فحص حالة كافة القواطع لتحديث نمط التشكيل المعماري
        const allPartitions = Object.values(this.viewer?.buildingData?.partitions || {});
        const anyOpen = allPartitions.some(p => p.status === 'open');
        const targetMode = anyOpen ? 'kinetic' : 'baseline';
        this.reconfigMode = targetMode;
        this.isAdaptive = anyOpen;

        // تحديث حالة أزرار نمط التشكيل في الشريط الجانبي
        document.querySelectorAll('[data-reconfig-mode]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.reconfigMode === targetMode);
        });

        const adaptiveToggle = document.getElementById('adaptive-toggle');
        if (adaptiveToggle) {
            adaptiveToggle.checked = anyOpen;
        }

        const impactBox = document.getElementById('reconfig-impact-box');
        if (impactBox) {
            impactBox.style.display = anyOpen ? 'block' : 'none';
        }

        const modeLabel = document.getElementById('mode-status-text');
        if (modeLabel) {
            if (targetMode === 'kinetic') {
                modeLabel.textContent = 'التكيف الحركي بالقواطع (نشط)';
                modeLabel.style.color = 'var(--accent-cyan)';
            } else {
                modeLabel.textContent = 'الوضع الثابت (Baseline)';
                modeLabel.style.color = 'var(--text-muted)';
            }
        }

        // إرسال التحديث إلى الخادم
        try {
            await fetch('/api/partition', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ partition_id: pId, status: newStatus })
            });
        } catch (e) {
            console.log("Partition status synced locally:", pId, newStatus);
        }

        // محاكاة فورية للنتائج وتحديث الحساسات
        this.simulateClientTick();
    }

    async openAllPartitions() {
        if (!this.viewer || !this.viewer.buildingData?.partitions) return;
        const partitions = this.viewer.buildingData.partitions;
        for (const p of Object.values(partitions)) {
            p.status = 'open';
        }
        if (typeof this.viewer.setPartitionStates === 'function') {
            this.viewer.setPartitionStates(partitions);
        }
        const firstPId = Object.keys(partitions)[0];
        if (firstPId && typeof this.viewer.focusPartition === 'function') {
            this.viewer.focusPartition(firstPId, true);
        }
        const dockBadge = document.getElementById('vp-dock-status-badge');
        if (dockBadge) {
            dockBadge.textContent = 'مفتوح 🔓';
            dockBadge.classList.add('open');
        }
        this.showActionToast('🚪 جاري فتح كافة القواطع المنزلقة التكيفية بالتوازي لدمج الفضاءات وتوسيع السعة.');
        await this.applyReconfiguration('kinetic');
        this.renderSlidingPartitionsControls();
    }

    async closeAllPartitions() {
        if (!this.viewer || !this.viewer.buildingData?.partitions) return;
        const partitions = this.viewer.buildingData.partitions;
        for (const p of Object.values(partitions)) {
            p.status = 'closed';
        }
        if (typeof this.viewer.setPartitionStates === 'function') {
            this.viewer.setPartitionStates(partitions);
        }
        const firstPId = Object.keys(partitions)[0];
        if (firstPId && typeof this.viewer.focusPartition === 'function') {
            this.viewer.focusPartition(firstPId, true);
        }
        const dockBadge = document.getElementById('vp-dock-status-badge');
        if (dockBadge) {
            dockBadge.textContent = 'مغلق 🔒';
            dockBadge.classList.remove('open');
        }
        this.showActionToast('🔒 تم إغلاق كافة القواطع المنزلقة وعزل الفضاءات وتفعيل الوضع الراهن.');
        await this.applyReconfiguration('baseline');
        this.renderSlidingPartitionsControls();
    }

    showActionToast(msg) {
        let toast = document.getElementById('auth-floating-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'auth-floating-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.className = 'auth-toast show';
        if (this._toastTimer) clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            toast.className = 'auth-toast';
        }, 4000);
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
                if (data.layout_mode) {
                    this.reconfigMode = data.layout_mode;
                    this.isAdaptive = (data.layout_mode !== 'baseline');
                }
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
            let factor = 0.50;
            const isWaitOrLobby = (id.includes('wait') || id.includes('reception') || id.includes('triage') || id.includes('citizen') || id.includes('grand') || sp.type === 'public');

            if (scenario === 'morning_peak') {
                if (isWaitOrLobby) {
                    factor = (mode === 'baseline') ? 1.45 : 0.65;
                } else {
                    factor = 0.35;
                }
            } else if (scenario === 'corridor_choke') {
                factor = (sp.type === 'circulation' || id.includes('corridor')) ? 1.35 : 0.45;
            } else if (scenario === 'after_hours') {
                factor = 0.08;
            }

            if (mode === 'kinetic' && isWaitOrLobby && scenario !== 'morning_peak') {
                factor = Math.min(0.70, factor * 0.75);
            } else if (mode === 'functional_swap' && (id.includes('corridor') || sp.type === 'circulation')) {
                factor = Math.min(0.65, factor * 0.60);
            }

            const currentCount = Math.max(1, Math.round(cap * (factor + 0.05 * Math.sin(Date.now() / 3500 + id.charCodeAt(0)))));
            occ[id] = currentCount;

            // حساب التكدس بالنظر إلى السعة الفعالة بعد فتح القاطع
            let effectiveCap = cap;
            for (const [pId, part] of Object.entries(partitions)) {
                const meshStatus = this.viewer?.partitionMeshes?.[pId]?.status;
                const isPartOpen = (meshStatus === 'open') || (part.status === 'open') || (mode === 'kinetic') || (mode === 'functional_swap');
                if (isPartOpen && part.between && part.between.includes(id)) {
                    effectiveCap += (part.expansion_capacity || 18);
                    break;
                }
            }

            if (currentCount > effectiveCap) {
                overcrowdedRooms.push(id);
            }
        }

        let centralFlow = 24.0;
        if (scenario === 'morning_peak') centralFlow = 38.0;
        else if (scenario === 'corridor_choke') centralFlow = 54.0;
        else if (scenario === 'after_hours') centralFlow = 6.0;

        if (mode === 'kinetic') centralFlow = Math.max(12.0, centralFlow * 0.72);
        else if (mode === 'functional_swap') centralFlow = Math.max(10.0, centralFlow * 0.49);

        centralFlow = +(centralFlow + 1.5 * Math.sin(Date.now() / 3000)).toFixed(1);

        let balanceScore = 78.0;
        if (scenario === 'morning_peak') balanceScore = (mode === 'baseline') ? 66.0 : 86.5;
        else if (scenario === 'corridor_choke') balanceScore = (mode === 'baseline') ? 62.0 : 84.0;

        let circWork = 4200;
        if (scenario === 'morning_peak') circWork = (mode === 'baseline') ? 5600 : 3800;
        else if (scenario === 'corridor_choke') circWork = (mode === 'baseline') ? 6100 : 3650;

        const actions = [];
        if (mode === 'kinetic') {
            balanceScore = +(balanceScore + (scenario === 'morning_peak' ? 0 : 14.5)).toFixed(1);
            circWork = Math.round(circWork * 0.72);
            actions.push({
                type: "MOVABLE_PARTITION_EXPANSION",
                title_ar: "فتح القاطع التكيفي المنزلق (Kinetic Partition)",
                reason_ar: "رصد ذروة تدفق المراجعين وتجاوز السعة التصميمية للصالة",
                impact_ar: "دمج الفضاءين ورفع السعة الاستيعابية فورياً بمقدار +18 فرداً وتفادي التكدس"
            });
        } else if (mode === 'functional_swap') {
            balanceScore = +(balanceScore + (scenario === 'morning_peak' ? 0 : 18.0)).toFixed(1);
            circWork = Math.round(circWork * 0.64);
            actions.push({
                type: "FUNCTIONAL_ZONE_SWAP",
                title_ar: "التوزيع الوظيفي الأمثل لمسارات الحركة (Optimal Swap)",
                reason_ar: "تقريب الفعاليات الجماهيرية من ردهة الاستقبال لتفادي اختراق الحشود للمبنى",
                impact_ar: "تخفيض مسافات السير التراكمية بنسبة 36.2% واختناق الممرات بنسبة 51.3%"
            });
        }

        const simulatedPartitions = {};
        for (const [pId, part] of Object.entries(partitions)) {
            const meshStatus = this.viewer?.partitionMeshes?.[pId]?.status;
            let partStatus = meshStatus || part.status || 'closed';
            if (mode === 'kinetic' || mode === 'functional_swap') {
                partStatus = 'open';
            }
            simulatedPartitions[pId] = {
                ...part,
                status: partStatus
            };
        }

        const anyOpenPart = Object.values(simulatedPartitions).some(p => p.status === 'open');
        const effectiveMode = (mode === 'functional_swap') ? 'functional_swap' : (anyOpenPart ? 'kinetic' : mode);

        const state = {
            step: this.stepCount,
            scenario: scenario,
            layout_mode: effectiveMode,
            sensor_readings: occ,
            corridor_flows: { "corridor_central": centralFlow },
            partitions: simulatedPartitions,
            evaluation: {
                spatial_balance_score: balanceScore,
                current_kpis: {
                    spatial_balance_score: balanceScore,
                    overcrowded_rooms: overcrowdedRooms,
                    j_circ_penalty: +(circWork / 100).toFixed(1),
                    circulation_work_index: circWork
                },
                baseline_kpis: {
                    spatial_balance_score: 68.0,
                    overcrowded_rooms: (scenario === 'morning_peak') ? ["waiting_hall"] : (scenario === 'corridor_choke' ? ["corridor_central"] : []),
                    j_circ_penalty: 56.0,
                    circulation_work_index: 5600
                },
                improvement_summary: {
                    balance_gain_percent: +(Math.max(0, balanceScore - 68.0)).toFixed(1),
                    congestion_reduction_percent: mode === 'baseline' ? 0.0 : (mode === 'functional_swap' ? 51.3 : 38.5),
                    overcrowd_resolved_count: (scenario === 'morning_peak' && mode !== 'baseline') ? 1 : 0
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

// بدء التشغيل المرن عند تحميل الصفحة (سواء اكتمل التحميل مسبقاً أو قيد التحميل)
function startTwinApp() {
    if (!window.twinApp) {
        try {
            window.twinApp = new TwinApp();
            window.app = window.twinApp;
        } catch (err) {
            console.error("Critical: Failed to instantiate TwinApp:", err);
            const banner = document.getElementById('js-error-banner');
            if (banner) {
                banner.textContent = `⚠️ تعذر تشغيل منصة التوأم الرقمي: ${err.message || err}`;
                banner.style.display = 'block';
            }
        }
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startTwinApp);
} else {
    startTwinApp();
}
