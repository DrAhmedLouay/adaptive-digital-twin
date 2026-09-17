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

        // تغليف loadBuildingModel لتحديث شريط الطوابق وعارض IFC تلقائيًا عند كل استدعاء
        const _origLoad = this.viewer.loadBuildingModel.bind(this.viewer);
        this.viewer.loadBuildingModel = (modelData) => {
            _origLoad(modelData);
            this.updateStoreyBar(modelData);
            if (this.refreshIfcViewerUI) {
                this.refreshIfcViewerUI();
            }
        };

        // 2. جلب وتوليد النموذج المعماري ثلاثي الأبعاد
        await this.loadSpatialModel();

        // 3. ربط أحداث واجهة المستخدم
        this.setupEventListeners();
        this.setupIfcViewer();

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
        bindGizmoBtn('btn-nav-zoom-in', () => this.viewer.zoomCamera(1.25));
        bindGizmoBtn('btn-nav-zoom-out', () => this.viewer.zoomCamera(0.8));
        bindGizmoBtn('btn-nav-fit', () => this.viewer.fitCameraToBuilding());
        bindGizmoBtn('btn-toggle-bg-theme', () => {
            const isWhite = this.viewer.toggleBackgroundTheme();
            const btn = document.getElementById('btn-toggle-bg-theme');
            if (btn) btn.title = isWhite ? 'الخلفية: أبيض (انقر للتبديل للداكن)' : 'الخلفية: داكن (انقر للتبديل للأبيض)';
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

            const icons = {
                wall: '🧱', slab: '⬜', column: '🏛️', beam: '🏗️',
                opening: details.info.ifcType === 'IfcDoor' ? '🚪' : '🪟',
                stair: '🪜', space: '📦'
            };
            if (iconEl) iconEl.textContent = icons[details.info.type] || '🏢';
            if (titleEl) titleEl.textContent = name;
            if (subEl) subEl.textContent = cls;
            vpPill.style.display = 'flex';
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
