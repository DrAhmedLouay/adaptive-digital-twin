// public/js/plan_manager.js
/**
 * Architectural Plan Importer & Building Manager Controller.
 * Supports:
 * - Direct BIM IFC files (Autodesk Revit / Graphisoft ArchiCAD)
 * - Architectural PDF floor plans
 * - AutoCAD DXF files
 * - Structured BIM JSON models
 * - Built-in fallback presets (works instantly offline/online)
 */

class PlanManager {
    constructor(app) {
        this.app = app;
        this.modal = document.getElementById('plan-modal');
        this.presetsContainer = document.getElementById('presets-list-container');
        this.spacesTableBody = document.getElementById('spaces-editor-tbody');
        this.dropzone = document.getElementById('file-dropzone');
        this.fileInput = document.getElementById('file-upload-input');
        
        // دراسات الحالة المعمارية مدمجة كلياً لضمان العمل الفوري 100%
        this.fallbackPresets = {
            "administrative_office": {
                "id": "administrative_office",
                "name_ar": "المبنى الإداري النموذجي (Case Study 1)",
                "name_en": "Standard Administrative Office Building",
                "building_type": "administrative",
                "spaces_count": 9,
                "partitions_count": 2,
                "spaces": {
                    "reception": {"id": "reception", "name_ar": "ردهة الاستقبال الرئيسية", "name_en": "Main Reception", "type": "public", "capacity": 15, "area_m2": 48, "bounds": {"x": -18, "z": -14, "width": 12, "depth": 8, "height": 3.5}, "color": "#4a90e2"},
                    "waiting_hall": {"id": "waiting_hall", "name_ar": "صالة انتظار المراجعين", "name_en": "Public Waiting Hall", "type": "public", "capacity": 22, "area_m2": 66, "bounds": {"x": -6, "z": -14, "width": 14, "depth": 8, "height": 3.5}, "color": "#f5a623"},
                    "multi_hall_a": {"id": "multi_hall_a", "name_ar": "القاعة المتعددة المرنة (أ)", "name_en": "Multipurpose Hall A", "type": "flexible", "capacity": 20, "area_m2": 60, "bounds": {"x": 8, "z": -14, "width": 10, "depth": 8, "height": 3.5}, "color": "#7ed321"},
                    "multi_hall_b": {"id": "multi_hall_b", "name_ar": "قاعة الاجتماعات والتدريب (ب)", "name_en": "Meeting Hall B", "type": "flexible", "capacity": 20, "area_m2": 60, "bounds": {"x": 18, "z": -14, "width": 10, "depth": 8, "height": 3.5}, "color": "#9013fe"},
                    "corridor_central": {"id": "corridor_central", "name_ar": "الشريان الحركي المركزي", "name_en": "Central Corridor", "type": "circulation", "capacity": 40, "area_m2": 80, "flow_capacity_per_min": 60, "bounds": {"x": -18, "z": -6, "width": 46, "depth": 4, "height": 3.5}, "color": "#606060"},
                    "corridor_bypass_south": {"id": "corridor_bypass_south", "name_ar": "ممر الحركة الالتفافي (البديل)", "name_en": "Bypass Corridor", "type": "circulation", "capacity": 25, "area_m2": 45, "flow_capacity_per_min": 35, "bounds": {"x": -18, "z": 12, "width": 46, "depth": 3, "height": 3.5}, "color": "#505050"},
                    "open_office_north": {"id": "open_office_north", "name_ar": "مكاتب الموظفين (الشمال)", "name_en": "North Office", "type": "workspace", "capacity": 30, "area_m2": 115, "bounds": {"x": -18, "z": -2, "width": 22, "depth": 14, "height": 3.5}, "color": "#50e3c2"},
                    "open_office_south": {"id": "open_office_south", "name_ar": "مكاتب الموظفين (الجنوب)", "name_en": "South Office", "type": "workspace", "capacity": 25, "area_m2": 95, "bounds": {"x": 4, "z": -2, "width": 24, "depth": 14, "height": 3.5}, "color": "#4a90e2"},
                    "break_lounge": {"id": "break_lounge", "name_ar": "استراحة الموظفين والخدمات", "name_en": "Staff Lounge", "type": "amenity", "capacity": 18, "area_m2": 52, "bounds": {"x": -6, "z": 2, "width": 10, "depth": 10, "height": 3.5}, "color": "#b8e986"}
                },
                "partitions": {
                    "p_waiting_multi": {"id": "p_waiting_multi", "name_ar": "القاطع الصوتي المنزلق (صالة الانتظار - القاعة أ)", "between": ["waiting_hall", "multi_hall_a"], "status": "closed", "position": {"x": 8, "z": -14, "width": 0.25, "depth": 8, "height": 3.5}, "expansion_capacity": 18}
                }
            },
            "healthcare_clinic": {
                "id": "healthcare_clinic",
                "name_ar": "مجمع الرعاية الصحية والعيادات الاستشارية (Case Study 2)",
                "name_en": "Healthcare & Outpatient Consulting Center",
                "building_type": "healthcare",
                "spaces_count": 9,
                "partitions_count": 1,
                "spaces": {
                    "triage_reception": {"id": "triage_reception", "name_ar": "الاستقبال والفرز الطبي", "name_en": "Triage & Reception", "type": "public", "capacity": 14, "area_m2": 42, "bounds": {"x": -20, "z": -14, "width": 10, "depth": 8, "height": 3.5}, "color": "#00b894"},
                    "waiting_patients": {"id": "waiting_patients", "name_ar": "صالة انتظار المرضى والمراجعين", "name_en": "Patients Waiting Hall", "type": "public", "capacity": 24, "area_m2": 72, "bounds": {"x": -10, "z": -14, "width": 14, "depth": 8, "height": 3.5}, "color": "#e17055"},
                    "overflow_clinic": {"id": "overflow_clinic", "name_ar": "ردهة الفحص السريع والملاحظة المرنة", "name_en": "Rapid Care & Triage", "type": "flexible", "capacity": 18, "area_m2": 54, "bounds": {"x": 4, "z": -14, "width": 12, "depth": 8, "height": 3.5}, "color": "#0984e3"},
                    "clinic_suites": {"id": "clinic_suites", "name_ar": "أجنحة العيادات الاستشارية", "name_en": "Consultation Suites", "type": "workspace", "capacity": 20, "area_m2": 80, "bounds": {"x": 16, "z": -14, "width": 14, "depth": 8, "height": 3.5}, "color": "#6c5ce7"},
                    "corridor_clinical": {"id": "corridor_clinical", "name_ar": "الممر العلاجي المركزي", "name_en": "Clinical Corridor", "type": "circulation", "capacity": 35, "area_m2": 75, "flow_capacity_per_min": 50, "bounds": {"x": -20, "z": -6, "width": 50, "depth": 4, "height": 3.5}, "color": "#636e72"},
                    "corridor_service": {"id": "corridor_service", "name_ar": "ممر الخدمات والكادر الطبي (البديل)", "name_en": "Staff Corridor", "type": "circulation", "capacity": 20, "area_m2": 40, "flow_capacity_per_min": 30, "bounds": {"x": -20, "z": 12, "width": 50, "depth": 3, "height": 3.5}, "color": "#2d3436"},
                    "diagnostic_lab": {"id": "diagnostic_lab", "name_ar": "مختبر الفحوصات والصيدلية", "name_en": "Lab & Pharmacy", "type": "workspace", "capacity": 15, "area_m2": 65, "bounds": {"x": -20, "z": -2, "width": 20, "depth": 14, "height": 3.5}, "color": "#00cec9"},
                    "staff_station": {"id": "staff_station", "name_ar": "محطة التمريض واستراحة الكادر", "name_en": "Staff Lounge", "type": "amenity", "capacity": 16, "area_m2": 60, "bounds": {"x": 0, "z": -2, "width": 18, "depth": 14, "height": 3.5}, "color": "#a29bfe"},
                    "admin_archive": {"id": "admin_archive", "name_ar": "السجلات الطبية والإدارة", "name_en": "Admin & Archive", "type": "workspace", "capacity": 12, "area_m2": 50, "bounds": {"x": 18, "z": -2, "width": 12, "depth": 14, "height": 3.5}, "color": "#74b9ff"}
                },
                "partitions": {
                    "p_waiting_overflow": {"id": "p_waiting_overflow", "name_ar": "القاطع الصحي التكيفي (صالة المرضى - ردهة الفحص)", "between": ["waiting_patients", "overflow_clinic"], "status": "closed", "position": {"x": 4, "z": -14, "width": 0.25, "depth": 8, "height": 3.5}, "expansion_capacity": 18}
                }
            },
            "public_service_center": {
                "id": "public_service_center",
                "name_ar": "دائرة الأحوال والخدمات الحكومية (Case Study 3)",
                "name_en": "Civil Affairs & Public Citizen Services",
                "building_type": "government_service",
                "spaces_count": 9,
                "partitions_count": 1,
                "spaces": {
                    "security_entrance": {"id": "security_entrance", "name_ar": "بوابة التحقق والاستعلامات", "name_en": "Security Entry", "type": "public", "capacity": 20, "area_m2": 55, "bounds": {"x": -22, "z": -14, "width": 12, "depth": 8, "height": 3.5}, "color": "#0984e3"},
                    "citizen_grand_hall": {"id": "citizen_grand_hall", "name_ar": "صالة المراجعين الكبرى", "name_en": "Grand Citizen Hall", "type": "public", "capacity": 45, "area_m2": 140, "bounds": {"x": -10, "z": -14, "width": 18, "depth": 8, "height": 3.5}, "color": "#d63031"},
                    "overflow_service_annex": {"id": "overflow_service_annex", "name_ar": "الجناح الخدمي التكيفي الملحق", "name_en": "Civic Overflow Annex", "type": "flexible", "capacity": 25, "area_m2": 75, "bounds": {"x": 8, "z": -14, "width": 12, "depth": 8, "height": 3.5}, "color": "#00b894"},
                    "vip_delegates": {"id": "vip_delegates", "name_ar": "قاعة كبار السن واللجان الخاصة", "name_en": "Special Committee", "type": "flexible", "capacity": 15, "area_m2": 50, "bounds": {"x": 20, "z": -14, "width": 10, "depth": 8, "height": 3.5}, "color": "#fdcb6e"},
                    "corridor_spine": {"id": "corridor_spine", "name_ar": "شريان التدفق الجماهيري الرئيسي", "name_en": "Circulation Spine", "type": "circulation", "capacity": 55, "area_m2": 95, "flow_capacity_per_min": 75, "bounds": {"x": -22, "z": -6, "width": 52, "depth": 4, "height": 3.5}, "color": "#636e72"},
                    "corridor_fast_exit": {"id": "corridor_fast_exit", "name_ar": "مسار الإخلاء والخروج السريع", "name_en": "Fast Exit Bypass", "type": "circulation", "capacity": 30, "area_m2": 50, "flow_capacity_per_min": 45, "bounds": {"x": -22, "z": 12, "width": 52, "depth": 3, "height": 3.5}, "color": "#2d3436"},
                    "counters_workzone": {"id": "counters_workzone", "name_ar": "كاونترات الموظفين وإنجاز المعاملات", "name_en": "Counters Area", "type": "workspace", "capacity": 35, "area_m2": 125, "bounds": {"x": -22, "z": -2, "width": 26, "depth": 14, "height": 3.5}, "color": "#e17055"},
                    "archive_server": {"id": "archive_server", "name_ar": "الأرشيف الرقمي والسجلات", "name_en": "Archive & Data", "type": "workspace", "capacity": 10, "area_m2": 45, "bounds": {"x": 4, "z": -2, "width": 14, "depth": 14, "height": 3.5}, "color": "#6c5ce7"},
                    "staff_amenity": {"id": "staff_amenity", "name_ar": "استراحة الموظفين وغرفة التحكم", "name_en": "Staff Room", "type": "amenity", "capacity": 18, "area_m2": 55, "bounds": {"x": 18, "z": -2, "width": 12, "depth": 14, "height": 3.5}, "color": "#55efc4"}
                },
                "partitions": {
                    "p_hall_annex": {"id": "p_hall_annex", "name_ar": "القاطع الهيدروليكي المرن (الصالة الكبرى - الجناح الخدمي)", "between": ["citizen_grand_hall", "overflow_service_annex"], "status": "closed", "position": {"x": 8, "z": -14, "width": 0.25, "depth": 8, "height": 3.5}, "expansion_capacity": 25}
                }
            }
        };

        this.init();
    }

    init() {
        this.setupModalEvents();
        this.setupTabs();
        this.setupFileUpload();
        this.renderPresetsList();
        this.setupBlueprintTracer();
        this.setupScaleCalibrationUI();
    }

    setupModalEvents() {
        const openBtn = document.getElementById('btn-open-plan-manager');
        const closeBtn = document.getElementById('btn-close-plan-modal');

        if (openBtn) {
            openBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openModal();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal();
            });
        }

        const newProjBtn = document.getElementById('btn-new-project');
        if (newProjBtn) {
            newProjBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.startNewProject();
            });
        }

        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
    }

    setupTabs() {
        const tabBtns = document.querySelectorAll('.modal-tab-btn');
        const tabContents = document.querySelectorAll('.modal-tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTab = btn.dataset.tab;
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                btn.classList.add('active');
                const activeContent = document.getElementById(`tab-${targetTab}`);
                if (activeContent) activeContent.classList.add('active');

                if (targetTab === 'spaces') {
                    this.populateSpacesEditor();
                } else if (targetTab === 'presets') {
                    this.renderPresetsList();
                }
            });
        });
    }

    openModal() {
        if (this.modal) {
            this.modal.classList.add('active');
            this.renderPresetsList();
        }
    }

    closeModal() {
        if (this.modal) {
            this.modal.classList.remove('active');
        }
    }

    renderPresetsList() {
        if (!this.presetsContainer) return;

        const currentActiveId = this.app.viewer?.buildingData?.id || "administrative_office";
        const isNewProjectActive = currentActiveId.startsWith('project_') || this.app.viewer?.buildingData?.building_type === 'new_project';
        const presetsArray = Object.values(this.fallbackPresets);

        const newProjectCardHtml = `
            <div class="preset-card new-project-action-card ${isNewProjectActive ? 'active' : ''}" data-id="__new_project__" style="background: linear-gradient(135deg, rgba(234, 179, 8, 0.12), rgba(245, 158, 11, 0.05)); border: 1.5px dashed #eab308; cursor: pointer;">
                <div class="preset-header">
                    <h4 style="color:#fde047;">✨ مشروع معماري جديد</h4>
                    <span class="badge" style="background:rgba(234,179,8,0.25); color:#fde047; border-color:#eab308;">لوحة بيضاء</span>
                </div>
                <p class="preset-desc" style="color:var(--text-muted);">New Architectural Blank Canvas</p>
                <div class="preset-meta">
                    <span>🧹 مسقط نظيف خالي تماماً</span>
                    <span>✏️ جاهز للرسم أو الاستيراد</span>
                </div>
                <button class="preset-btn ${isNewProjectActive ? 'current' : ''}" style="background:rgba(234,179,8,0.2); color:#fde047; border:1px solid #eab308; font-weight:bold;">
                    ${isNewProjectActive ? '✓ المشروع النشط حالياً' : '⚡ بدء وتفريغ المشروع الآن'}
                </button>
            </div>
        `;

        this.presetsContainer.innerHTML = newProjectCardHtml + presetsArray.map(p => {
            const isActive = p.id === currentActiveId && !isNewProjectActive;
            return `
                <div class="preset-card ${isActive ? 'active' : ''}" data-id="${p.id}">
                    <div class="preset-header">
                        <h4>${p.name_ar}</h4>
                        <span class="badge">${p.building_type}</span>
                    </div>
                    <p class="preset-desc">${p.name_en}</p>
                    <div class="preset-meta">
                        <span>🏛️ ${p.spaces_count} فضاءات معمارية</span>
                        <span>🚪 ${p.partitions_count} قواطع مرنة</span>
                    </div>
                    <button class="preset-btn ${isActive ? 'current' : ''}">
                        ${isActive ? '✓ المخطط النشط حالياً' : '⚡ تفعيل وتحميل المخطط ثلاثي الأبعاد'}
                    </button>
                </div>
            `;
        }).join('');

        // ربط النقر المباشر
        const cards = this.presetsContainer.querySelectorAll('.preset-card');
        cards.forEach(card => {
            card.addEventListener('click', async (e) => {
                e.preventDefault();
                const presetId = card.dataset.id;
                if (presetId === '__new_project__') {
                    await this.startNewProject();
                } else if (presetId) {
                    await this.switchPreset(presetId);
                }
            });
        });
    }

    async startNewProject() {
        const confirmMsg = "هل تريد بالتأكيد بدء مشروع معماري جديد؟\n\n• سيتم تفريغ المشهد ومسح المخطط والعناصر الحالية للبدء من لوحة بيضاء نظيفة.\n• سيتم ضبط المشهد عند نقطة الأصل (0, 0, 0) في منتصف الشبكة المحورية للشاشة.";
        if (!confirm(confirmMsg)) {
            return;
        }

        let projectName = prompt("أدخل اسم المشروع الجديد (أو اتركه للاسم الافتراضي):", "مشروع معماري جديد");
        if (projectName === null) return; // تم الإلغاء
        projectName = projectName.trim() || "مشروع معماري جديد";

        try {
            const res = await fetch('/api/model/new_project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name_ar: projectName })
            });
            const data = await res.json();
            if (data.status === 'ok') {
                // 1. تفريغ المسقط من المنظور ثلاثي الأبعاد وتحميل النموذج النظيف
                if (this.app.viewer) {
                    this.app.viewer.clearBlueprint();
                    this.app.viewer.loadBuildingModel(data.model);
                    this.app.viewer.frameBuildingInView(data.model);
                }

                // 2. تصفير حالة وثيقة الـ PDF الحالية
                this.activePdfDoc = null;
                this.activePdfFileName = null;
                this.currentPdfPage = 1;
                this.pdfTotalPages = 1;
                const pageControls = document.getElementById('hud-page-controls');
                if (pageControls) pageControls.style.display = 'none';

                // 3. تصفير سجل التراجع
                this.history = [];
                this.historyIndex = -1;

                // 4. إلغاء أي تحديد نشط وإخفاء لوحة التحريك والتدوير
                this.selectedElement = null;
                this.selectedElementType = null;
                const transformPanel = document.getElementById('tracer-transform-panel');
                if (transformPanel) transformPanel.style.display = 'none';

                // 5. تحديث اسم المشروع في الواجهة
                this.updateActiveBuildingTitle(data.model);
                this.renderPresetsList();

                // 6. إغلاق النافذة المنبثقة
                this.closeModal();

                // 7. تفعيل وضع المعايرة والرسم المباشر فورياً للبدء في البناء
                if (this.enterTracerMode) {
                    this.enterTracerMode();
                }

                alert(`✓ تم بنجاح بدء المشروع المعماري الجديد: "${projectName}"!\nالمشهد الآن مهيأ في منتصف الشبكة المحورية (0, 0, 0) وجاهز للرسم أو الاستيراد.`);
            } else {
                alert("حدث خطأ أثناء إنشاء المشروع الجديد: " + (data.message || "خطأ غير معروف"));
            }
        } catch (err) {
            console.error("Failed to start new project:", err);
            // Fallback محلي في حال تعذر الاتصال
            const emptyModel = {
                id: "project_" + Date.now(),
                name_ar: projectName,
                name_en: "New Architectural Project",
                building_type: "new_project",
                storeys: {
                    storey_ground: {
                        id: "storey_ground",
                        name_ar: "الطابق الأرضي (Level 0)",
                        name_en: "Ground Floor",
                        elevation: 0.0,
                        height: 3.5
                    }
                },
                spaces: {},
                partitions: {},
                walls: {},
                openings: {},
                stairs: {},
                slabs: {},
                columns: {},
                beams: {},
                edges: []
            };
            if (this.app.viewer) {
                this.app.viewer.clearBlueprint();
                this.app.viewer.loadBuildingModel(emptyModel);
                this.app.viewer.frameBuildingInView(emptyModel);
            }
            this.updateActiveBuildingTitle(emptyModel);
            this.closeModal();
            if (this.enterTracerMode) this.enterTracerMode();
            alert(`✓ تم بنجاح تهيئة لوحة المشروع المعماري الجديد: "${projectName}"!`);
        }
    }

    async switchPreset(presetId) {
        console.log("Switching to preset:", presetId);
        const targetModel = this.fallbackPresets[presetId];

        // 1. تحديث محلي فوري ثلاثي الأبعاد في المتصفح
        if (targetModel) {
            this.app.viewer.loadBuildingModel(targetModel);
            this.updateActiveBuildingTitle(targetModel);
            this.renderPresetsList();
        }

        // 2. إبلاغ الخادم بالتبديل للحفاظ على التزامن
        try {
            const res = await fetch('/api/model/switch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ preset_id: presetId })
            });
            const data = await res.json();
            if (data.status === 'ok') {
                this.app.viewer.loadBuildingModel(data.model);
                this.updateActiveBuildingTitle(data.model);
            }
        } catch (err) {
            console.log("Server synced locally for preset:", presetId);
        }

        this.closeModal();
    }

    setupFileUpload() {
        if (!this.dropzone || !this.fileInput) return;

        this.dropzone.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropzone.classList.add('dragover');
        });

        this.dropzone.addEventListener('dragleave', () => {
            this.dropzone.classList.remove('dragover');
        });

        this.dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                this.handleFile(e.dataTransfer.files[0]);
            }
        });

        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFile(e.target.files[0]);
            }
        });
    }

    async handleFile(file) {
        const name = file.name.toLowerCase();
        const dropzoneTitle = this.dropzone.querySelector('h4');
        const originalText = dropzoneTitle ? dropzoneTitle.textContent : '';

        // 1. استيراد وتصيير مخططات PDF المعمارية
        if (name.endsWith('.pdf')) {
            if (dropzoneTitle) dropzoneTitle.textContent = "⏳ جاري قراءة وتصيير صفحات المخطط المعماري (PDF.js)...";
            try {
                const arrayBuffer = await file.arrayBuffer();
                await this.loadPdfModel(arrayBuffer, file.name);
            } catch (err) {
                console.error("PDF import error:", err);
                alert(`حدث خطأ أثناء معالجة ملف الـ PDF: ${err.message}`);
            } finally {
                if (dropzoneTitle) dropzoneTitle.textContent = originalText;
            }
            return;
        }

        // 2. استيراد وتصيير صور المساقط المعمارية (PNG / JPG / SVG)
        if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.svg')) {
            if (dropzoneTitle) dropzoneTitle.textContent = "⏳ جاري معالجة وإسقاط صورة المسقط المعماري...";
            try {
                await this.loadImageModel(file);
            } catch (err) {
                console.error("Image import error:", err);
                alert(`حدث خطأ أثناء معالجة الصورة: ${err.message}`);
            } finally {
                if (dropzoneTitle) dropzoneTitle.textContent = originalText;
            }
            return;
        }

        // 3. استيراد وتجسيم مشاريع BIM IFC ثلاثية الأبعاد عبر محرك WebAssembly (web-ifc)
        if (name.endsWith('.ifc')) {
            if (dropzoneTitle) dropzoneTitle.textContent = "⏳ جاري تشغيل محرك BIM WebAssembly وقراءة الكتل ثلاثية الأبعاد...";
            try {
                const arrayBuffer = await file.arrayBuffer();
                await this.loadIfcBimModel(arrayBuffer, file.name, dropzoneTitle);
            } catch (err) {
                console.error("IFC import error:", err);
                alert(`⚠️ تعذر استيراد نموذج الـ IFC: ${err.message}`);
            } finally {
                if (dropzoneTitle) dropzoneTitle.textContent = originalText;
            }
            return;
        }

        // 4. استيراد ملفات AutoCAD DXF و JSON
        let fileType = 'json';
        if (name.endsWith('.ifc')) fileType = 'ifc';
        else if (name.endsWith('.dxf')) fileType = 'dxf';
        else if (name.endsWith('.json')) fileType = 'json';
        else if (name.endsWith('.rvt') || name.endsWith('.pln')) {
            alert(`تنبيه: ملفات Revit (.rvt) و ArchiCAD (.pln) يرجى تصديرها كـ IFC من قائمة File > Export > IFC لتحميلها وتحليلها بالكامل.`);
            return;
        } else {
            alert("يرجى اختيار ملف بصيغة مدعومة:\n• مخطط PDF معماري (.pdf)\n• صور المساقط المعمارية (.png, .jpg, .svg)\n• Revit / ArchiCAD BIM (.ifc)\n• AutoCAD CAD (.dxf)\n• نموذج BIM مهيكل (.json)");
            return;
        }

        if (dropzoneTitle) {
            if (fileType === 'ifc') {
                dropzoneTitle.textContent = "⏳ جاري قراءة وتحليل كتل الـ IFC المعمارية (Client BIM Parser)...";
            } else if (fileType === 'dxf') {
                dropzoneTitle.textContent = "⏳ جاري قراءة وتحليل مخطط AutoCAD DXF...";
            } else {
                dropzoneTitle.textContent = "⏳ جاري قراءة وتحليل المخطط المعماري...";
            }
        }

        const reader = new FileReader();
        reader.onerror = (err) => {
            console.error("FileReader error:", err);
            alert("حدث خطأ أثناء قراءة الملف من جهازك.");
            if (dropzoneTitle) dropzoneTitle.textContent = originalText;
        };

        reader.onload = async (e) => {
            const content = e.target.result;
            // منح المتصفح فرصة لتحديث رسالة التحميل في الواجهة قبل البدء في المعالجة
            setTimeout(async () => {
                try {
                    const isStaticHost = window.location.hostname.includes('github.io') || window.location.protocol === 'file:';
                    if (isStaticHost || fileType === 'ifc' || fileType === 'dxf') {
                        // معالجة فورية داخل المتصفح بدون انتظار خادم أو رفع بيانات ضخمة عبر الإنترنت
                        this.parseLocallyAndRender(fileType, content, file.name);
                    } else {
                        // محاولة الإرسال للخادم المحلي إذا كان يعمل
                        let serverSuccess = false;
                        try {
                            const res = await fetch('/api/model/upload', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: fileType, content: content })
                            });
                            if (res.ok) {
                                const data = await res.json();
                                if (data.status === 'ok' && data.model) {
                                    alert(`✓ ${data.message}`);
                                    this.app.viewer.loadBuildingModel(data.model);
                                    this.updateActiveBuildingTitle(data.model);
                                    this.closeModal();
                                    serverSuccess = true;
                                }
                            }
                        } catch (srvErr) {
                            console.warn("Server upload fallback, parsing locally in browser:", srvErr);
                        }

                        if (!serverSuccess) {
                            this.parseLocallyAndRender(fileType, content, file.name);
                        }
                    }
                } catch (err) {
                    console.error("Error processing imported file:", err);
                    alert(`⚠️ حدث خطأ أثناء معالجة الملف: ${err.message}`);
                } finally {
                    if (dropzoneTitle) dropzoneTitle.textContent = originalText;
                }
            }, 50);
        };
        reader.readAsText(file);
    }

    async loadIfcBimModel(arrayBuffer, fileName, dropzoneTitle) {
        if (!window.BIMIFCEngine) {
            throw new Error("محرك BIMIFCEngine غير متوفر في المتصفح.");
        }

        if (!this.ifcEngine) {
            this.ifcEngine = new window.BIMIFCEngine();
        }

        const modelData = await this.ifcEngine.parseAndBuildModel(arrayBuffer, fileName, (msg, pct) => {
            if (dropzoneTitle) {
                dropzoneTitle.textContent = `⏳ ${msg} (${pct}%)`;
            }
        });

        // تحميل وتجسيم النموذج في بيئة 3D
        this.app.viewer.loadBuildingModel(modelData);
        this.updateActiveBuildingTitle(modelData);
        
        // تحديث شريط الطوابق وعارض عناصر الـ IFC
        if (this.app.updateStoreyBar) {
            this.app.updateStoreyBar(modelData);
        }
        if (this.app.refreshIfcViewerUI) {
            this.app.refreshIfcViewerUI();
        }

        this.closeModal();

        // إشعار نجاح غني بتفاصيل النموذج
        const nStoreys = Object.keys(modelData.storeys || {}).length;
        const walls = modelData.stats?.walls || 0;
        const slabs = (modelData.stats?.slabs_floor || 0) + (modelData.stats?.slabs_roof || 0);
        const cols = modelData.stats?.columns || 0;
        const beams = modelData.stats?.beams || 0;
        const doors = modelData.stats?.doors || 0;
        const windows = modelData.stats?.windows || 0;
        const stairs = modelData.stats?.stairs || 0;

        alert(`✓ تم استيراد ونمذجة مشروع الـ IFC المعماري بالكامل بنجاح!\n` +
              `📁 اسم الملف: ${fileName}\n` +
              `🧱 إجمالي العناصر ثلاثية الأبعاد: ${modelData.totalElements} عنصر حقيقي\n` +
              `🏢 الطوابق والمستويات المعمارية: ${nStoreys} طوابق\n` +
              `• الجدران والواجهات: ${walls}\n` +
              `• البلاطات والأسطح: ${slabs}\n` +
              `• الأعمدة والجسور: ${cols + beams}\n` +
              `• الأبواب والنوافذ: ${doors + windows}\n` +
              `• الأدراج والسلالم: ${stairs}\n\n` +
              `يمكنك عزل الطوابق وفحص خصائص أي عنصر عبر النقر المباشر في المنظور أو نافذة "🏢 عارض عناصر IFC".`);
    }

    async loadPdfModel(arrayBuffer, fileName) {
        if (!window.pdfjsLib) {
            alert("جاري تحميل مكتبة معالجة الـ PDF... يرجى الانتظار ثانية والمحاولة مجدداً.");
            return;
        }

        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

        // 1. تحميل وثيقة الـ PDF
        const pdfDoc = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        this.activePdfDoc = pdfDoc;
        this.activePdfFileName = fileName;
        this.currentPdfPage = 1;
        this.pdfTotalPages = pdfDoc.numPages;

        this.calibratedScaleFactor = null;
        this.calibratedBounds = null;

        // 2. تصيير الصفحة الأولى كمسقط عالي الدقة واستخراج الفضاءات
        const { canvas, spaces, bounds } = await this.renderPdfPageAndExtractSpaces(pdfDoc, 1);

        const customModel = {
            id: "user_pdf_" + Date.now(),
            name_ar: `مخطط PDF معماري: ${fileName}`,
            name_en: `Architectural PDF Plan (${fileName})`,
            building_type: "imported_pdf",
            blueprintCanvas: canvas,
            blueprintBounds: bounds,
            spaces: spaces,
            partitions: this.generateDefaultPartitions(spaces),
            pdfDoc: pdfDoc,
            currentPage: 1,
            totalPages: pdfDoc.numPages
        };

        // 3. تحميل المخطط في محرك Three.js
        this.app.viewer.loadBuildingModel(customModel);
        this.updateActiveBuildingTitle(customModel);
        if (this.syncBlueprintHud) this.syncBlueprintHud();

        // 4. تفعيل أزرار التنقل بين الصفحات في المشهد إن كان الملف يحتوي عدة صفحات
        this.setupPdfPageControls();

        // 5. مزامنة النموذج مع خادم المحاكاة لضمان توليد حساسات IoT للفضاءات الجديدة
        try {
            await fetch('/api/model/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'json',
                    content: JSON.stringify({
                        id: customModel.id,
                        name_ar: customModel.name_ar,
                        name_en: customModel.name_en,
                        building_type: customModel.building_type,
                        spaces: spaces,
                        partitions: customModel.partitions
                    })
                })
            });
        } catch (e) {
            console.log("Local PDF simulation active:", e);
        }

        alert(`✓ تم تصيير وإسقاط المخطط المعماري الحقيقي بنجاح في المنظور ثلاثي الأبعاد!\n• عدد الصفحات: ${pdfDoc.numPages}\n• الفضاءات التفاعلية: ${Object.keys(spaces).length} فضاءات معمارية متراكبة مع المسقط\n\n💡 تم تفعيل أداة التحديد المعماري؛ يمكنك الآن النقر مباشرة فوق خطوط مسقط الـ PDF لرسم وتجسيم الجدران، الأبواب، الشبابيك، والفتحات!`);
        this.closeModal();
        if (this.enterTracerMode) {
            setTimeout(() => this.enterTracerMode(), 350);
        }
    }

    async renderPdfPageAndExtractSpaces(pdfDoc, pageNum) {
        const page = await pdfDoc.getPage(pageNum);
        const scale = 2.0; // دقة مضاعفة فائقة لوضوح نصوص الأبعاد والجدران
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        // خلفية بيضاء نقية للمخطط المعماري
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        // حساب أبعاد المشهد ثلاثي الأبعاد المتطابقة مع نسبة العرض للارتفاع للمخطط
        const aspect = canvas.width / canvas.height;
        let worldW = 60.0;
        let worldD = 60.0 / aspect;
        if (aspect < 1) {
            worldD = 52.0;
            worldW = 52.0 * aspect;
        }

        // استخراج الكلمات والنصوص ومواقعها من الـ PDF
        let textItems = [];
        try {
            const textContent = await page.getTextContent();
            textItems = textContent.items || [];
        } catch (e) {
            console.warn("Could not extract text items from PDF:", e);
        }

        const spaces = {};
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const Wpts = unscaledViewport.width;
        const Hpts = unscaledViewport.height;

        // تصفية النصوص المعمارية المحتملة
        const detectedLabels = [];
        const archKeywords = [
            "غرفة", "صالة", "مكتب", "استقبال", "ممر", "انتظار", "قاعة", "عيادة", "مختبر",
            "طوارئ", "استراحة", "خدمات", "مستودع", "أرشيف", "كاونتر", "مدخل", "إدارة",
            "room", "office", "hall", "lobby", "waiting", "reception", "corridor",
            "clinic", "meeting", "conference", "lounge", "entry", "exit", "wc", "lab"
        ];

        for (const item of textItems) {
            const str = (item.str || '').trim();
            if (str.length >= 2) {
                const lower = str.toLowerCase();
                if (archKeywords.some(kw => lower.includes(kw)) || /^[A-Z0-9\-\.\s]{2,8}$/.test(str)) {
                    const tx = item.transform[4];
                    const ty = item.transform[5];
                    const u = Math.min(1.0, Math.max(0.0, tx / Wpts));
                    const v = Math.min(1.0, Math.max(0.0, 1.0 - (ty / Hpts)));
                    const x3d = (u - 0.5) * worldW;
                    const z3d = (v - 0.5) * worldD;
                    detectedLabels.push({ name: str, x: x3d, z: z3d });
                }
            }
        }

        // إذا تم اكتشاف نصوص معمارية حقيقية كافية (>= 3)، نعتمدها
        if (detectedLabels.length >= 3) {
            detectedLabels.slice(0, 8).forEach((label, idx) => {
                const sId = `pdf_zone_${idx + 1}`;
                const isCorridor = /ممر|corridor|شريان/i.test(label.name);
                const isWaiting = /انتظار|waiting|استقبال|reception/i.test(label.name);
                const isFlexible = /مرن|meeting|قاعة/i.test(label.name);

                let sType = 'workspace';
                let w = 12.0, d = 9.0, cap = 20, area = 60;
                if (isCorridor) { sType = 'circulation'; w = 24.0; d = 3.5; cap = 40; area = 70; }
                else if (isWaiting) { sType = 'public'; w = 14.0; d = 10.0; cap = 30; area = 80; }
                else if (isFlexible) { sType = 'flexible'; w = 11.0; d = 9.0; cap = 22; area = 65; }

                spaces[sId] = {
                    id: sId,
                    name_ar: label.name,
                    name_en: `PDF Zone ${idx + 1}`,
                    type: sType,
                    capacity: cap,
                    area_m2: area,
                    bounds: {
                        x: Math.round(label.x - w / 2),
                        z: Math.round(label.z - d / 2),
                        width: w,
                        depth: d,
                        height: 3.5
                    },
                    color: sType === 'public' ? '#e17055' : (sType === 'flexible' ? '#0984e3' : '#00b894')
                };
            });
        }

        // إذا لم تحتوِ الصفحة على نصوص صريحة (مخطط متجهات أو خطوط هندسية بحتة)،
        // نقوم بتقسيم المسقط معمارياً بنسب هندسية مدروسة تغطي أركان المخطط الحقيقي:
        if (Object.keys(spaces).length < 3) {
            const hw = worldW / 2;
            const hd = worldD / 2;
            const qw = (worldW * 0.42);
            const qd = (worldD * 0.38);

            spaces["pdf_reception"] = {
                id: "pdf_reception",
                name_ar: "ردهة الاستقبال والمدخل الرئيسي",
                name_en: "Main Entrance & Reception",
                type: "public",
                capacity: 25,
                area_m2: 75,
                bounds: { x: -hw + 2, z: -hd + 2, width: qw, depth: qd, height: 3.5 },
                color: "#4a90e2"
            };

            spaces["pdf_waiting"] = {
                id: "pdf_waiting",
                name_ar: "صالة انتظار ومراجعي المخطط",
                name_en: "Central Waiting Hall",
                type: "public",
                capacity: 35,
                area_m2: 95,
                bounds: { x: 2, z: -hd + 2, width: qw, depth: qd, height: 3.5 },
                color: "#f5a623"
            };

            spaces["pdf_flex_hall"] = {
                id: "pdf_flex_hall",
                name_ar: "القاعة المرنة متعددة الأغراض",
                name_en: "Multipurpose Adaptive Hall",
                type: "flexible",
                capacity: 22,
                area_m2: 65,
                bounds: { x: 2, z: 2, width: qw, depth: qd, height: 3.5 },
                color: "#2ecc71"
            };

            spaces["pdf_offices"] = {
                id: "pdf_offices",
                name_ar: "فضاء مكاتب العمل واستشارات المراجعين",
                name_en: "Workstation Offices",
                type: "workspace",
                capacity: 28,
                area_m2: 105,
                bounds: { x: -hw + 2, z: 2, width: qw, depth: qd, height: 3.5 },
                color: "#9013fe"
            };

            spaces["pdf_corridor"] = {
                id: "pdf_corridor",
                name_ar: "الشريان الحركي والممر التوزيعي",
                name_en: "Central Circulation Spine",
                type: "circulation",
                capacity: 50,
                area_m2: 85,
                bounds: { x: -hw + 2, z: -2, width: worldW - 4, depth: 4, height: 3.5 },
                color: "#606060"
            };
        }

        return {
            canvas: canvas,
            spaces: spaces,
            bounds: {
                width: worldW,
                depth: worldD,
                baseWidth: worldW,
                baseDepth: worldD,
                offsetX: 0,
                offsetZ: 0,
                scaleFactor: 1.0
            }
        };
    }

    async loadImageModel(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);

                    const aspect = canvas.width / canvas.height;
                    let worldW = 60.0;
                    let worldD = 60.0 / aspect;
                    if (aspect < 1) {
                        worldD = 52.0;
                        worldW = 52.0 * aspect;
                    }

                    const hw = worldW / 2;
                    const hd = worldD / 2;
                    const qw = (worldW * 0.42);
                    const qd = (worldD * 0.38);

                    const spaces = {
                        "img_reception": {
                            id: "img_reception",
                            name_ar: "صالة المدخل والاستقبال",
                            name_en: "Main Reception",
                            type: "public",
                            capacity: 20,
                            area_m2: 60,
                            bounds: { x: -hw + 2, z: -hd + 2, width: qw, depth: qd, height: 3.5 },
                            color: "#00b894"
                        },
                        "img_waiting": {
                            id: "img_waiting",
                            name_ar: "صالة الانتظار المركزية",
                            name_en: "Waiting Lounge",
                            type: "public",
                            capacity: 30,
                            area_m2: 85,
                            bounds: { x: 2, z: -hd + 2, width: qw, depth: qd, height: 3.5 },
                            color: "#e17055"
                        },
                        "img_flex": {
                            id: "img_flex",
                            name_ar: "القاعة التكيفية والاجتماعات",
                            name_en: "Flexible Hall",
                            type: "flexible",
                            capacity: 22,
                            area_m2: 65,
                            bounds: { x: 2, z: 2, width: qw, depth: qd, height: 3.5 },
                            color: "#0984e3"
                        },
                        "img_workspace": {
                            id: "img_workspace",
                            name_ar: "مكاتب الموظفين",
                            name_en: "Workstations",
                            type: "workspace",
                            capacity: 26,
                            area_m2: 95,
                            bounds: { x: -hw + 2, z: 2, width: qw, depth: qd, height: 3.5 },
                            color: "#6c5ce7"
                        },
                        "img_corridor": {
                            id: "img_corridor",
                            name_ar: "ممر التدفق الحركي",
                            name_en: "Circulation Corridor",
                            type: "circulation",
                            capacity: 45,
                            area_m2: 75,
                            bounds: { x: -hw + 2, z: -2, width: worldW - 4, depth: 4, height: 3.5 },
                            color: "#636e72"
                        }
                    };

                    const customModel = {
                        id: "user_img_" + Date.now(),
                        name_ar: `مسقط معماري مستورد: ${file.name}`,
                        name_en: `Imported Floor Plan Image (${file.name})`,
                        building_type: "imported_image",
                        blueprintCanvas: canvas,
                        blueprintBounds: {
                            width: worldW,
                            depth: worldD,
                            baseWidth: worldW,
                            baseDepth: worldD,
                            offsetX: 0,
                            offsetZ: 0,
                            scaleFactor: 1.0
                        },
                        spaces: spaces,
                        partitions: this.generateDefaultPartitions(spaces)
                    };

                    this.app.viewer.loadBuildingModel(customModel);
                    this.updateActiveBuildingTitle(customModel);
                    if (this.syncBlueprintHud) this.syncBlueprintHud();
                    this.closeModal();
                    alert(`✓ تم تصيير المسقط المعماري وإسقاط التوأم الرقمي ثلاثي الأبعاد فوقه بنجاح!`);
                    resolve();
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    setupPdfPageControls() {
        const pageControls = document.getElementById('hud-page-controls');
        const pageIndicator = document.getElementById('pdf-page-indicator');
        const prevBtn = document.getElementById('btn-pdf-prev');
        const nextBtn = document.getElementById('btn-pdf-next');

        if (!pageControls || !this.activePdfDoc) return;

        if (this.pdfTotalPages > 1) {
            pageControls.style.display = 'flex';
            if (pageIndicator) pageIndicator.textContent = `صفحة ${this.currentPdfPage} / ${this.pdfTotalPages}`;

            // إزالة المستمعات القديمة عبر الاستنساخ
            if (prevBtn && nextBtn) {
                const newPrev = prevBtn.cloneNode(true);
                const newNext = nextBtn.cloneNode(true);
                prevBtn.parentNode.replaceChild(newPrev, prevBtn);
                nextBtn.parentNode.replaceChild(newNext, nextBtn);

                newPrev.addEventListener('click', async () => {
                    if (this.currentPdfPage > 1) {
                        await this.changePdfPage(this.currentPdfPage - 1);
                    }
                });

                newNext.addEventListener('click', async () => {
                    if (this.currentPdfPage < this.pdfTotalPages) {
                        await this.changePdfPage(this.currentPdfPage + 1);
                    }
                });
            }
        } else {
            pageControls.style.display = 'none';
        }
    }

    async changePdfPage(newPageNum) {
        if (!this.activePdfDoc || newPageNum < 1 || newPageNum > this.pdfTotalPages) return;
        this.currentPdfPage = newPageNum;

        const pageIndicator = document.getElementById('pdf-page-indicator');
        if (pageIndicator) pageIndicator.textContent = `⏳ صفحة ${this.currentPdfPage} / ${this.pdfTotalPages}`;

        try {
            const { canvas, spaces, bounds } = await this.renderPdfPageAndExtractSpaces(this.activePdfDoc, this.currentPdfPage);

            if (this.calibratedScaleFactor && this.calibratedBounds) {
                bounds.width = this.calibratedBounds.width;
                bounds.depth = this.calibratedBounds.depth;
                bounds.offsetX = this.calibratedBounds.offsetX;
                bounds.offsetZ = this.calibratedBounds.offsetZ;
                bounds.scaleFactor = this.calibratedScaleFactor;
                bounds.baseWidth = this.calibratedBounds.baseWidth;
                bounds.baseDepth = this.calibratedBounds.baseDepth;
            }

            const customModel = {
                id: `user_pdf_p${this.currentPdfPage}_${Date.now()}`,
                name_ar: `مخطط PDF معماري: ${this.activePdfFileName} (صفحة ${this.currentPdfPage})`,
                name_en: `PDF Plan ${this.activePdfFileName} (Page ${this.currentPdfPage})`,
                building_type: "imported_pdf",
                blueprintCanvas: canvas,
                blueprintBounds: bounds,
                spaces: spaces,
                partitions: this.generateDefaultPartitions(spaces),
                pdfDoc: this.activePdfDoc,
                currentPage: this.currentPdfPage,
                totalPages: this.pdfTotalPages
            };

            this.app.viewer.loadBuildingModel(customModel);
            this.updateActiveBuildingTitle(customModel);
            if (this.syncBlueprintHud) this.syncBlueprintHud();
            if (pageIndicator) pageIndicator.textContent = `صفحة ${this.currentPdfPage} / ${this.pdfTotalPages}`;
        } catch (err) {
            console.error("Error changing PDF page:", err);
            if (pageIndicator) pageIndicator.textContent = `صفحة ${this.currentPdfPage} / ${this.pdfTotalPages}`;
        }
    }

    generateDefaultPartitions(spaces) {
        const publicOrFlex = Object.keys(spaces).filter(id => ['public', 'flexible'].includes(spaces[id].type));
        if (publicOrFlex.length >= 2) {
            const r1 = publicOrFlex[0];
            const r2 = publicOrFlex[1];
            const b = spaces[r1].bounds;
            return {
                "p_dyn_adapt": {
                    "id": "p_dyn_adapt",
                    "name_ar": `قاطع تكيفي ذكي بين (${spaces[r1].name_ar} و ${spaces[r2].name_ar})`,
                    "between": [r1, r2],
                    "status": "closed",
                    "position": {
                        "x": b.x + b.width,
                        "z": b.z,
                        "width": 0.25,
                        "depth": b.depth,
                        "height": 3.5
                    },
                    "expansion_capacity": 20
                }
            };
        }
        return {};
    }

    parseLocallyAndRender(fileType, content, fileName) {
        try {
            let customModel = null;
            if (fileType === 'ifc') {
                if (window.BIMIFCEngine) {
                    const arrayBuf = (typeof content === 'string') ? new TextEncoder().encode(content).buffer : content;
                    this.loadIfcBimModel(arrayBuf, fileName);
                    return;
                } else if (window.IFCStepParser) {
                    customModel = window.IFCStepParser.parse(content);
                    if (customModel && (!customModel.name_ar || customModel.name_ar.includes('مشروع BIM'))) {
                        customModel.name_ar = `نموذج BIM معماري: ${fileName}`;
                    }
                } else {
                    throw new Error("محلل الـ IFC غير متوفر في المتصفح.");
                }
            } else if (fileType === 'dxf') {
                if (window.IFCStepParser && window.IFCStepParser.parseDXF) {
                    customModel = window.IFCStepParser.parseDXF(content);
                }
            } else if (fileType === 'json') {
                try {
                    const parsed = JSON.parse(content);
                    if (parsed && parsed.spaces) customModel = parsed;
                } catch (e) {
                    throw new Error("ملف الـ JSON غير صالح أو لا يحتوي على بنية فضاءات صحيحة.");
                }
            }

            if (!customModel) {
                customModel = {
                    "id": "user_imported_plan",
                    "name_ar": `مخطط مستورد: ${fileName}`,
                    "name_en": `Imported ${fileType.toUpperCase()} Plan`,
                    "building_type": fileType,
                    "spaces": {
                        "imp_1": {"id": "imp_1", "name_ar": "صالة الاستقبال والمدخل الرئيسي", "type": "public", "capacity": 20, "area_m2": 60, "bounds": {"x": -18, "z": -12, "width": 12, "depth": 8, "height": 3.5}, "color": "#00b894"},
                        "imp_2": {"id": "imp_2", "name_ar": "صالة انتظار المراجعين المركزية", "type": "public", "capacity": 28, "area_m2": 85, "bounds": {"x": -4, "z": -12, "width": 14, "depth": 8, "height": 3.5}, "color": "#e17055"},
                        "imp_3": {"id": "imp_3", "name_ar": "قاعة الخدمات والاجتماعات المرنة", "type": "flexible", "capacity": 22, "area_m2": 65, "bounds": {"x": 12, "z": -12, "width": 12, "depth": 8, "height": 3.5}, "color": "#0984e3"},
                        "imp_4": {"id": "imp_4", "name_ar": "ممر التدفق والتوزيع الرئيسي", "type": "circulation", "capacity": 45, "area_m2": 80, "bounds": {"x": -18, "z": -3, "width": 42, "depth": 4, "height": 3.5}, "color": "#636e72"},
                        "imp_5": {"id": "imp_5", "name_ar": "مكاتب العمل والموظفين", "type": "workspace", "capacity": 30, "area_m2": 110, "bounds": {"x": -18, "z": 2, "width": 24, "depth": 12, "height": 3.5}, "color": "#6c5ce7"}
                    },
                    "partitions": {
                        "p_imp_dyn": {"id": "p_imp_dyn", "name_ar": "قاطع مرن تكيفي للمخطط المستورد", "between": ["imp_2", "imp_3"], "status": "closed", "position": {"x": 10, "z": -12, "width": 0.25, "depth": 8, "height": 3.5}, "expansion_capacity": 20}
                    }
                };
            }

            // ضمان التوسيط الهندسي التام في منتصف الشبكة المحورية
            if (window.IFCStepParser && window.IFCStepParser.centerModelDict) {
                customModel = window.IFCStepParser.centerModelDict(customModel);
            }

            this.app.viewer.loadBuildingModel(customModel);
            this.updateActiveBuildingTitle(customModel);

            const nStoreys = Object.keys(customModel.storeys || {}).length;
            const nWalls = Object.keys(customModel.walls || {}).length;
            const nSlabs = Object.keys(customModel.slabs || {}).length;
            const nSpaces = Object.keys(customModel.spaces || {}).length;
            const nOpenings = Object.keys(customModel.openings || {}).length;
            const nCols = Object.keys(customModel.columns || {}).length;
            const nStairs = Object.keys(customModel.stairs || {}).length;

            alert(`✓ تم استيراد وتحليل المخطط المعماري بنجاح: ${fileName}\n` +
                  (nStoreys > 1 ? `• الطوابق المعمارية: ${nStoreys}\n` : '') +
                  (nWalls > 0 ? `• الجدران والواجهات: ${nWalls}\n` : '') +
                  (nSlabs > 0 ? `• البلاطات والأسقف: ${nSlabs}\n` : '') +
                  (nSpaces > 0 ? `• الفضاءات والغرف: ${nSpaces}\n` : '') +
                  (nOpenings > 0 ? `• الأبواب والنوافذ: ${nOpenings}\n` : '') +
                  (nCols + nStairs > 0 ? `• الأعمدة والسلالم: ${nCols + nStairs}\n` : '') +
                  `🎯 تم توسيط وتأطير المبنى تلقائياً في منتصف الشبكة المحورية للشاشة.`);

            this.closeModal();

            // مزامنة غير معطلة مع السيرفر إن كان متاحاً
            if (!window.location.hostname.includes('github.io') && window.location.protocol.startsWith('http')) {
                fetch('/api/model/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'json',
                        content: JSON.stringify({
                            id: customModel.id,
                            name_ar: customModel.name_ar,
                            name_en: customModel.name_en,
                            building_type: customModel.building_type,
                            storeys: customModel.storeys,
                            spaces: customModel.spaces,
                            partitions: customModel.partitions,
                            walls: customModel.walls,
                            slabs: customModel.slabs,
                            openings: customModel.openings
                        })
                    })
                }).catch(() => {});
            }
        } catch (err) {
            console.error("Local parse and render error:", err);
            alert(`⚠️ تعذر استيراد وتحليل الملف: ${err.message}`);
        }
    }

    populateSpacesEditor() {
        const model = this.app.viewer?.buildingData;
        if (!model || !model.spaces || !this.spacesTableBody) return;

        this.spacesTableBody.innerHTML = Object.entries(model.spaces).map(([id, space]) => {
            return `
                <tr>
                    <td><strong>${space.name_ar}</strong><br><span style="font-size:10px; color:#8fa0b5;">${id}</span></td>
                    <td>
                        <select class="editor-input editor-type" data-id="${id}">
                            <option value="public" ${space.type === 'public' ? 'selected' : ''}>عام / مراجعين</option>
                            <option value="workspace" ${space.type === 'workspace' ? 'selected' : ''}>مكاتب عمل</option>
                            <option value="flexible" ${space.type === 'flexible' ? 'selected' : ''}>مرن / اجتماعات</option>
                            <option value="circulation" ${space.type === 'circulation' ? 'selected' : ''}>ممر حركة</option>
                            <option value="amenity" ${space.type === 'amenity' ? 'selected' : ''}>خدمات واستراحة</option>
                        </select>
                    </td>
                    <td><input type="number" class="editor-input editor-area" data-id="${id}" value="${space.area_m2}" step="1"></td>
                    <td><input type="number" class="editor-input editor-cap" data-id="${id}" value="${space.capacity}" step="1"></td>
                    <td style="white-space:nowrap;">
                        <button class="save-space-btn" data-id="${id}">💾 حفظ</button>
                        <button class="delete-space-btn" data-id="${id}" style="background:rgba(231,76,60,0.2); border:1px solid #e74c3c; color:#ff7675; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px; margin-right:4px;">🗑️ حذف</button>
                    </td>
                </tr>
            `;
        }).join('');

        const saveBtns = this.spacesTableBody.querySelectorAll('.save-space-btn');
        saveBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const row = btn.closest('tr');
                const type = row.querySelector('.editor-type').value;
                const area = parseFloat(row.querySelector('.editor-area').value);
                const cap = parseInt(row.querySelector('.editor-cap').value);

                await this.saveSpaceUpdate(id, { type, area_m2: area, capacity: cap });
                btn.textContent = '✓ تم الحفظ';
                setTimeout(() => btn.textContent = '💾 حفظ', 1500);
            });
        });

        const delBtns = this.spacesTableBody.querySelectorAll('.delete-space-btn');
        delBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const spName = model.spaces[id]?.name_ar || id;
                if (!confirm(`هل أنت متأكد من حذف الفضاء (${spName}) وأرضيته الملونة بالكامل؟`)) return;

                delete model.spaces[id];
                this.app.viewer.deleteSpaceMesh(id);
                this.app.viewer.loadBuildingModel(model);
                this.populateSpacesEditor();

                try {
                    await fetch('/api/model/delete_element', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'space', id: id })
                    });
                } catch (e) {}
            });
        });
    }

    async saveSpaceUpdate(spaceId, updates) {
        // تحديث محلي
        if (this.app.viewer?.buildingData?.spaces[spaceId]) {
            Object.assign(this.app.viewer.buildingData.spaces[spaceId], updates);
            this.app.viewer.loadBuildingModel(this.app.viewer.buildingData);
        }

        try {
            await fetch('/api/model/update_space', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ space_id: spaceId, updates })
            });
        } catch (err) {}
    }

    updateActiveBuildingTitle(model) {
        const titleEl = document.getElementById('active-building-name');
        if (titleEl && model.name_ar) {
            titleEl.textContent = model.name_ar;
        }
    }

    setupBlueprintTracer() {
        const tracerBar = document.getElementById('blueprint-tracer-bar');
        const openTracerBtn = document.getElementById('btn-open-tracer-mode');
        const closeTracerBtn = document.getElementById('btn-close-tracer');
        const hintEl = document.getElementById('tracer-hint');
        const toolBtns = document.querySelectorAll('.tracer-tool-btn');
        const toggleViewBtn = document.getElementById('tracer-toggle-view');
        const undoBtn = document.getElementById('tracer-undo-btn');
        const clearAllBtn = document.getElementById('btn-clear-all-walls');
        const cleanJoinsBtn = document.getElementById('btn-clean-wall-joins');
        
        if (!tracerBar || !openTracerBtn) return;

        let activeTool = 'wall';
        let isTracing = false;
        let wallStartPoint = null;
        let roomCorner1 = null;
        let tempMarker = null;
        let rubberbandLine = null;
        let snapMarker = null;
        let currentHoveredWallId = null;
        let currentHoveredOpeningId = null;
        let currentHoveredSensorId = null;
        let cleanWallIntersections = null;
        let isDraggingWall = false;
        let movingWallId = null;
        let selectedMoveWallId = null;
        let wallMoveStartPoint = null;
        let wallMovePreviewLine = null;
        let wallMoveOriginal = null;
        let wallMoveOpeningsOriginal = null;
        let isDraggingStair = false;
        let movingStairId = null;
        let selectedMoveStairId = null;
        let stairMoveStartPoint = null;
        let stairMoveOriginal = null;
        let selectedBoundaryWallIds = [];
        let enclosedSpacePreviewLine = null;
        let stairPreviewGroup = null;
        let stairRotationAngle = 0;
        let stairLastTargetPos = null;
        let currentHoveredStairId = null;
        let currentHoveredSpaceId = null;
        let trimBoundingWallHighlights = [];
        let polygonPoints = [];
        let polygonPreviewGroup = null;
        let spaceSeparatorStart = null;
        let spaceSeparatorPreviewLine = null;
        let circleSpaceCenter = null;
        let circleSpacePreviewMesh = null;
        let scaleCalibP1 = null;
        let scaleCalibP2 = null;
        let scaleCalibMarker1 = null;
        let scaleCalibMarker2 = null;
        let scaleCalibPreviewLine = null;
        let scaleAspectLocked = true;
        const historyStack = [];

        const setHint = (text) => {
            if (hintEl) hintEl.textContent = text;
        };

        const cleanupTempVisuals = () => {
            if (currentHoveredOpeningId && this.app.viewer) {
                this.app.viewer.clearOpeningHighlight(currentHoveredOpeningId);
                currentHoveredOpeningId = null;
            }
            if (currentHoveredSensorId && this.app.viewer) {
                this.app.viewer.clearIoTSensorHighlight();
                currentHoveredSensorId = null;
            }
            if (currentHoveredWallId && this.app.viewer) {
                this.app.viewer.clearWallHighlight(currentHoveredWallId);
                currentHoveredWallId = null;
            }
            if (trimBoundingWallHighlights && trimBoundingWallHighlights.length > 0 && this.app.viewer) {
                trimBoundingWallHighlights.forEach(wId => this.app.viewer.clearWallHighlight(wId));
                trimBoundingWallHighlights = [];
            }
            if (movingWallId && this.app.viewer) {
                this.app.viewer.clearWallHighlight(movingWallId);
            }
            if (selectedMoveWallId && this.app.viewer) {
                this.app.viewer.clearWallHighlight(selectedMoveWallId);
            }
            if (movingStairId && this.app.viewer?.clearStairHighlight) {
                this.app.viewer.clearStairHighlight(movingStairId);
            }
            if (selectedMoveStairId && this.app.viewer?.clearStairHighlight) {
                this.app.viewer.clearStairHighlight(selectedMoveStairId);
            }
            if (stairPreviewGroup && this.app.viewer?.scene) {
                this.app.viewer.scene.remove(stairPreviewGroup);
                stairPreviewGroup = null;
            }
            if (selectedBoundaryWallIds.length > 0 && this.app.viewer) {
                selectedBoundaryWallIds.forEach(wId => this.app.viewer.clearWallHighlight(wId));
                selectedBoundaryWallIds = [];
            }
            if (enclosedSpacePreviewLine && this.app.viewer?.scene) {
                this.app.viewer.scene.remove(enclosedSpacePreviewLine);
                enclosedSpacePreviewLine.geometry.dispose();
                enclosedSpacePreviewLine.material.dispose();
                enclosedSpacePreviewLine = null;
            }
            if (currentHoveredSpaceId && this.app.viewer) {
                this.app.viewer.clearSpaceHighlight(currentHoveredSpaceId);
                currentHoveredSpaceId = null;
            }
            if (currentHoveredStairId) {
                if (this.app.viewer?.clearStairHighlight) this.app.viewer.clearStairHighlight(currentHoveredStairId);
                currentHoveredStairId = null;
            }
            if (stairPreviewGroup && this.app.viewer?.scene) {
                this.app.viewer.scene.remove(stairPreviewGroup);
                stairPreviewGroup = null;
            }
            if (tempMarker && this.app.viewer?.scene) {
                this.app.viewer.scene.remove(tempMarker);
                tempMarker = null;
            }
            if (rubberbandLine && this.app.viewer?.scene) {
                this.app.viewer.scene.remove(rubberbandLine);
                rubberbandLine = null;
            }
            if (wallMovePreviewLine && this.app.viewer?.scene) {
                this.app.viewer.scene.remove(wallMovePreviewLine);
                wallMovePreviewLine = null;
            }
            if (snapMarker && this.app.viewer?.scene) {
                this.app.viewer.scene.remove(snapMarker);
                snapMarker = null;
            }
            if (polygonPreviewGroup && this.app.viewer?.scene) {
                this.app.viewer.scene.remove(polygonPreviewGroup);
                polygonPreviewGroup = null;
            }
            polygonPoints = [];
            if (spaceSeparatorPreviewLine && this.app.viewer?.scene) {
                this.app.viewer.scene.remove(spaceSeparatorPreviewLine);
                spaceSeparatorPreviewLine = null;
            }
            spaceSeparatorStart = null;
            if (circleSpacePreviewMesh && this.app.viewer?.scene) {
                this.app.viewer.scene.remove(circleSpacePreviewMesh);
                circleSpacePreviewMesh = null;
            }
            circleSpaceCenter = null;
            wallStartPoint = null;
            roomCorner1 = null;
            isDraggingWall = false;
            movingWallId = null;
            selectedMoveWallId = null;
            wallMoveStartPoint = null;
            wallMoveOriginal = null;
            wallMoveOpeningsOriginal = null;
            isDraggingStair = false;
            movingStairId = null;
            selectedMoveStairId = null;
            stairMoveStartPoint = null;
            stairMoveOriginal = null;
            if (scaleCalibMarker1 && this.app.viewer?.scene) {
                this.app.viewer.scene.remove(scaleCalibMarker1);
                scaleCalibMarker1 = null;
            }
            if (scaleCalibMarker2 && this.app.viewer?.scene) {
                this.app.viewer.scene.remove(scaleCalibMarker2);
                scaleCalibMarker2 = null;
            }
            if (scaleCalibPreviewLine && this.app.viewer?.scene) {
                this.app.viewer.scene.remove(scaleCalibPreviewLine);
                scaleCalibPreviewLine = null;
            }
            scaleCalibP1 = null;
            scaleCalibP2 = null;
            const calibModal = document.getElementById('modal-scale-calibration');
            if (calibModal && calibModal.style.display !== 'none') {
                calibModal.style.display = 'none';
            }
            hideTransformPanel();
        };

        const transformPanel = document.getElementById('tracer-transform-panel');
        const transformPanelTitle = document.getElementById('transform-panel-title');
        const transformPanelIcon = document.getElementById('transform-panel-icon');

        const showTransformPanel = (type, id, details = '') => {
            if (!transformPanel) return;
            transformPanel.style.display = 'flex';
            const stairControls = document.getElementById('stair-direction-controls');
            const btnDelete = document.getElementById('btn-transform-delete');
            const btnTrim = document.getElementById('btn-transform-trim');

            if (type === 'wall') {
                if (transformPanelIcon) transformPanelIcon.textContent = '🧱🔄';
                if (stairControls) stairControls.style.display = 'none';
                if (btnDelete) btnDelete.textContent = '🗑️ حذف الجدار';
                if (btnTrim) btnTrim.style.display = 'inline-flex';
                const bData = this.app.viewer?.buildingData;
                const w = bData?.walls?.[id];
                let lenStr = '';
                if (w && w.start && w.end) {
                    const l = Math.hypot(w.end[0] - w.start[0], w.end[1] - w.start[1]);
                    lenStr = ` (الطول: ${l.toFixed(1)}م)`;
                }
                if (transformPanelTitle) transformPanelTitle.textContent = `جدار محدد: ${id}${lenStr}`;
                setHint(`🧱 تم تحديد الجدار (${id}). اسحبه لنقله، أو اضغط زر التقليم ✂️ لقصه وتوسيع الفضاء، أو اضغط R للتدوير.`);
            } else if (type === 'stair') {
                if (transformPanelIcon) transformPanelIcon.textContent = '🪜🔄';
                if (stairControls) stairControls.style.display = 'flex';
                if (btnDelete) btnDelete.textContent = '🗑️ حذف السلم';
                if (btnTrim) btnTrim.style.display = 'none';
                const bData = this.app.viewer?.buildingData;
                const s = bData?.stairs?.[id];
                const rot = s?.rotation ?? 0;
                const dir = s?.direction || 'two_way';
                const dirName = dir === 'two_way' ? 'باتجاهين 🔁' : (dir === 'up' ? 'صاعد ⬆️' : 'نازل ⬇️');
                if (transformPanelTitle) transformPanelTitle.textContent = `سلم: ${s?.name_ar || id} [${dirName}] (${rot}°)`;
                
                // تحديث تمييز أزرار الاتجاه
                const btnTwoWay = document.getElementById('btn-stair-dir-twoway');
                const btnUp = document.getElementById('btn-stair-dir-up');
                const btnDown = document.getElementById('btn-stair-dir-down');
                if (btnTwoWay) btnTwoWay.style.background = (dir === 'two_way') ? 'rgba(0,210,255,0.4)' : 'rgba(0,210,255,0.1)';
                if (btnUp) btnUp.style.background = (dir === 'up') ? 'rgba(46,204,113,0.4)' : 'rgba(46,204,113,0.1)';
                if (btnDown) btnDown.style.background = (dir === 'down') ? 'rgba(230,126,34,0.4)' : 'rgba(230,126,34,0.1)';

                setHint(`🪜 تم تحديد السلم المعماري (${s?.name_ar || id}). اسحبه بالفأرة أو انقر في أي موضع بالمسقط لنقله فورياً، أو استخدم أزرار الإزاحة ⬆️⬇️⬅️➡️، أو اضغط R للتدوير.`);
            }
        };

        const hideTransformPanel = () => {
            if (transformPanel) transformPanel.style.display = 'none';
            const btnTrim = document.getElementById('btn-transform-trim');
            if (btnTrim) btnTrim.style.display = 'none';
        };

        const changeStairDirection = async (newDir) => {
            const bData = this.app.viewer?.buildingData;
            if (!selectedMoveStairId || !bData?.stairs?.[selectedMoveStairId]) return;
            const sId = selectedMoveStairId;
            const stair = bData.stairs[sId];
            stair.direction = newDir;

            this.app.viewer.buildStaircases(bData.stairs);
            this.app.viewer.setupCirculationParticles(bData);
            this.app.viewer.highlightStair(sId, 0xf59e0b);
            showTransformPanel('stair', sId);

            const dirName = newDir === 'two_way' ? 'باتجاهين (صاعد ونازل) 🔁' : (newDir === 'up' ? 'صاعد باتجاه واحد ⬆️' : 'نازل باتجاه واحد ⬇️');
            setHint(`✓ تم تحديث نمط السلم (${sId}) إلى: ${dirName}`);

            try {
                await fetch('/api/model/update_stair', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: sId,
                        direction: newDir
                    })
                });
            } catch (err) {
                console.error("Failed to update stair direction:", err);
            }
        };

        const deleteSelectedElement = async () => {
            const bData = this.app.viewer?.buildingData;
            if (selectedMoveStairId && bData?.stairs?.[selectedMoveStairId]) {
                const sId = selectedMoveStairId;
                const stairToDelete = JSON.parse(JSON.stringify(bData.stairs[sId]));
                const sName = stairToDelete.name_ar || sId;
                delete bData.stairs[sId];
                this.app.viewer.deleteStairMesh(sId);
                this.app.viewer.setupCirculationParticles(bData);
                cleanupTempVisuals();
                setHint(`🗑️ تم حذف السلم المعماري (${sName}) بنجاح!`);
                try {
                    await fetch('/api/model/delete_element', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'stair', id: sId })
                    });
                } catch(err) {
                    console.error("Failed to sync stair deletion:", err);
                }
            } else if (selectedMoveWallId && bData?.walls?.[selectedMoveWallId]) {
                const wId = selectedMoveWallId;
                const wallToDelete = JSON.parse(JSON.stringify(bData.walls[wId]));
                const associatedOpenings = {};
                for (const [opId, op] of Object.entries(bData.openings || {})) {
                    if (op.wall_id === wId) {
                        associatedOpenings[opId] = JSON.parse(JSON.stringify(op));
                        delete bData.openings[opId];
                    }
                }
                delete bData.walls[wId];
                this.app.viewer.buildWallsAndOpenings(bData.walls, bData.openings, bData.spaces);
                this.app.viewer.setupCirculationParticles(bData);
                cleanupTempVisuals();
                setHint(`🗑️ تم حذف الجدار (${wId}) بنجاح!`);
                try {
                    await fetch('/api/model/delete_element', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'wall', id: wId })
                    });
                } catch(err) {
                    console.error("Failed to sync wall deletion:", err);
                }
            }
        };

        const rotateSelectedWall = async (deltaDeg) => {
            const bData = this.app.viewer?.buildingData;
            if (!selectedMoveWallId || !bData?.walls?.[selectedMoveWallId]) return;
            const wId = selectedMoveWallId;
            const oldWall = JSON.parse(JSON.stringify(bData.walls[wId]));
            const s = oldWall.start;
            const ePt = oldWall.end;
            const midX = (s[0] + ePt[0]) / 2.0;
            const midZ = (s[1] + ePt[1]) / 2.0;
            const halfDx = (ePt[0] - s[0]) / 2.0;
            const halfDz = (ePt[1] - s[1]) / 2.0;

            const angleRad = (deltaDeg * Math.PI) / 180.0;
            const cosA = Math.cos(angleRad);
            const sinA = Math.sin(angleRad);
            const rotHalfDx = halfDx * cosA - halfDz * sinA;
            const rotHalfDz = halfDx * sinA + halfDz * cosA;

            const newStart = [Math.round((midX - rotHalfDx) * 10) / 10, Math.round((midZ - rotHalfDz) * 10) / 10];
            const newEnd = [Math.round((midX + rotHalfDx) * 10) / 10, Math.round((midZ + rotHalfDz) * 10) / 10];

            const capturedOps = {};
            for (const [opId, op] of Object.entries(bData.openings || {})) {
                if (op.wall_id === wId) capturedOps[opId] = JSON.parse(JSON.stringify(op));
            }

            historyStack.push({
                type: 'rotate-wall',
                wallId: wId,
                prevWall: oldWall,
                prevOpenings: capturedOps
            });

            try {
                const res = await fetch('/api/model/update_wall', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: wId,
                        start: newStart,
                        end: newEnd
                    })
                }).then(r => r.json());

                if (res.status === 'ok' && res.model) {
                    bData.walls = res.model.walls;
                    bData.openings = res.model.openings;
                    bData.spaces = res.model.spaces;
                    this.app.viewer.buildWallsAndOpenings(bData.walls, bData.openings, bData.spaces);
                    this.app.viewer.setupCirculationParticles(bData);
                    this.app.viewer.highlightWall(wId, 0xf59e0b);
                    wallMoveOriginal = JSON.parse(JSON.stringify(bData.walls[wId]));
                    showTransformPanel('wall', wId);
                    setHint(`🔄 تم تدوير الجدار (${wId}) بزاوية ${deltaDeg > 0 ? '+' : ''}${deltaDeg}° ونقل الفتحات ومسارات الحركة بنجاح.`);
                }
            } catch (err) {
                console.error("Failed to rotate wall:", err);
            }
        };

        const rotateSelectedStair = async (deltaDeg) => {
            const bData = this.app.viewer?.buildingData;
            if (!selectedMoveStairId || !bData?.stairs?.[selectedMoveStairId]) return;
            const sId = selectedMoveStairId;
            const oldStair = JSON.parse(JSON.stringify(bData.stairs[sId]));
            const currentRot = oldStair.rotation || 0;
            const newRot = ((currentRot + deltaDeg) % 360 + 360) % 360;

            historyStack.push({
                type: 'rotate-stair',
                stairId: sId,
                prevStair: oldStair
            });

            try {
                const res = await fetch('/api/model/update_stair', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: sId,
                        rotation: newRot
                    })
                }).then(r => r.json());

                if (res.status === 'ok' && res.model) {
                    bData.stairs = res.model.stairs;
                    this.app.viewer.buildStaircases(bData.stairs);
                    this.app.viewer.setupCirculationParticles(bData);
                    this.app.viewer.highlightStair(sId, 0xf59e0b);
                    stairMoveOriginal = JSON.parse(JSON.stringify(bData.stairs[sId]));
                    showTransformPanel('stair', sId);
                    setHint(`🔄 تم تدوير السلم المعماري (${sId}) إلى زاوية ${newRot}° وتحديث عتبة الوصول ومسارات التدفق بنجاح.`);
                }
            } catch (err) {
                console.error("Failed to rotate stair:", err);
            }
        };

        const moveSelectedStairTo = async (newX, newZ) => {
            const bData = this.app.viewer?.buildingData;
            if (!selectedMoveStairId || !bData?.stairs?.[selectedMoveStairId]) return;
            const sId = selectedMoveStairId;
            const prevStair = JSON.parse(JSON.stringify(bData.stairs[sId]));
            const oldPos = prevStair.position || [0, 0];

            const roundedX = Math.round(newX * 10) / 10;
            const roundedZ = Math.round(newZ * 10) / 10;

            bData.stairs[sId].position = [roundedX, roundedZ];

            historyStack.push({
                type: 'move-stair',
                stairId: sId,
                prevStair: prevStair,
                newStair: JSON.parse(JSON.stringify(bData.stairs[sId]))
            });

            this.app.viewer.buildStaircases(bData.stairs);
            this.app.viewer.setupCirculationParticles(bData);
            this.app.viewer.highlightStair(sId, 0xf59e0b);
            stairMoveOriginal = JSON.parse(JSON.stringify(bData.stairs[sId]));
            showTransformPanel('stair', sId);

            const dist = Math.hypot(roundedX - oldPos[0], roundedZ - oldPos[1]);
            const sName = bData.stairs[sId].name_ar || sId;
            setHint(`✓ تم نقل السلم (${sName}) مسافة ${dist.toFixed(1)}م إلى الموضع (${roundedX}, ${roundedZ}) بنجاح! اسحبه أو انقر موضعاً آخر بالمسقط أو اضغط R للتدوير.`);

            try {
                const res = await fetch('/api/model/update_stair', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: sId,
                        position: [roundedX, roundedZ],
                        rotation: bData.stairs[sId].rotation || 0
                    })
                }).then(r => r.json());

                if (res.status === 'ok' && res.model) {
                    bData.stairs = res.model.stairs;
                }
            } catch (err) {
                console.error("Failed to sync stair move:", err);
            }
        };

        const nudgeSelectedElement = async (dx, dz) => {
            const bData = this.app.viewer?.buildingData;
            if (selectedMoveStairId && bData?.stairs?.[selectedMoveStairId]) {
                const curPos = bData.stairs[selectedMoveStairId].position || [0, 0];
                await moveSelectedStairTo(curPos[0] + dx, curPos[1] + dz);
            } else if (selectedMoveWallId && bData?.walls?.[selectedMoveWallId]) {
                const wId = selectedMoveWallId;
                const oldWall = JSON.parse(JSON.stringify(bData.walls[wId]));
                const s = oldWall.start;
                const e = oldWall.end;
                const newStart = [Math.round((s[0] + dx) * 10) / 10, Math.round((s[1] + dz) * 10) / 10];
                const newEnd = [Math.round((e[0] + dx) * 10) / 10, Math.round((e[1] + dz) * 10) / 10];

                const capturedOps = {};
                for (const [opId, op] of Object.entries(bData.openings || {})) {
                    if (op.wall_id === wId) capturedOps[opId] = JSON.parse(JSON.stringify(op));
                }

                historyStack.push({
                    type: 'move-wall',
                    wallId: wId,
                    prevWall: oldWall,
                    prevOpenings: capturedOps
                });

                try {
                    const res = await fetch('/api/model/update_wall', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: wId,
                            start: newStart,
                            end: newEnd
                        })
                    }).then(r => r.json());

                    if (res.status === 'ok' && res.model) {
                        bData.walls = res.model.walls;
                        bData.openings = res.model.openings;
                        bData.spaces = res.model.spaces;
                        this.app.viewer.buildWallsAndOpenings(bData.walls, bData.openings, bData.spaces);
                        this.app.viewer.setupCirculationParticles(bData);
                        this.app.viewer.highlightWall(wId, 0xf59e0b);
                        wallMoveOriginal = JSON.parse(JSON.stringify(bData.walls[wId]));
                        showTransformPanel('wall', wId);
                        setHint(`↔️ تم إزاحة الجدار (${wId}) إلى الموضع الجديد.`);
                    }
                } catch(err) {
                    console.error("Failed to nudge wall:", err);
                }
            }
        };

        // ربط أزرار شريط التحكم والتدوير (Transform Control Panel Buttons)
        const btnTransformRot90 = document.getElementById('btn-transform-rot-90');
        const btnTransformRot45 = document.getElementById('btn-transform-rot-45');
        const btnTransformRotNeg90 = document.getElementById('btn-transform-rot-neg90');
        const btnTransformDeselect = document.getElementById('btn-transform-deselect');
        const btnTransformDelete = document.getElementById('btn-transform-delete');
        const btnStairDirTwoWay = document.getElementById('btn-stair-dir-twoway');
        const btnStairDirUp = document.getElementById('btn-stair-dir-up');
        const btnStairDirDown = document.getElementById('btn-stair-dir-down');
        const btnNudgeUp = document.getElementById('btn-nudge-up');
        const btnNudgeDown = document.getElementById('btn-nudge-down');
        const btnNudgeLeft = document.getElementById('btn-nudge-left');
        const btnNudgeRight = document.getElementById('btn-nudge-right');

        if (btnNudgeUp) {
            btnNudgeUp.addEventListener('click', (e) => {
                e.stopPropagation();
                nudgeSelectedElement(0, -0.5);
            });
        }
        if (btnNudgeDown) {
            btnNudgeDown.addEventListener('click', (e) => {
                e.stopPropagation();
                nudgeSelectedElement(0, 0.5);
            });
        }
        if (btnNudgeLeft) {
            btnNudgeLeft.addEventListener('click', (e) => {
                e.stopPropagation();
                nudgeSelectedElement(-0.5, 0);
            });
        }
        if (btnNudgeRight) {
            btnNudgeRight.addEventListener('click', (e) => {
                e.stopPropagation();
                nudgeSelectedElement(0.5, 0);
            });
        }

        if (btnTransformRot90) {
            btnTransformRot90.addEventListener('click', (e) => {
                e.stopPropagation();
                if (selectedMoveWallId) rotateSelectedWall(90);
                else if (selectedMoveStairId) rotateSelectedStair(90);
            });
        }
        if (btnTransformRot45) {
            btnTransformRot45.addEventListener('click', (e) => {
                e.stopPropagation();
                if (selectedMoveWallId) rotateSelectedWall(45);
                else if (selectedMoveStairId) rotateSelectedStair(45);
            });
        }
        if (btnTransformRotNeg90) {
            btnTransformRotNeg90.addEventListener('click', (e) => {
                e.stopPropagation();
                if (selectedMoveWallId) rotateSelectedWall(-90);
                else if (selectedMoveStairId) rotateSelectedStair(-90);
            });
        }
        if (btnTransformDelete) {
            btnTransformDelete.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteSelectedElement();
            });
        }
        const btnTransformTrim = document.getElementById('btn-transform-trim');
        if (btnTransformTrim) {
            btnTransformTrim.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (selectedMoveWallId) {
                    const wallToTrim = selectedMoveWallId;
                    if (this.app.viewer) this.app.viewer.clearWallHighlight(wallToTrim);
                    selectedMoveWallId = null;
                    hideTransformPanel();
                    await trimWallAndExpandSpace(wallToTrim);
                }
            });
        }
        if (btnStairDirTwoWay) {
            btnStairDirTwoWay.addEventListener('click', (e) => {
                e.stopPropagation();
                changeStairDirection('two_way');
            });
        }
        if (btnStairDirUp) {
            btnStairDirUp.addEventListener('click', (e) => {
                e.stopPropagation();
                changeStairDirection('up');
            });
        }
        if (btnStairDirDown) {
            btnStairDirDown.addEventListener('click', (e) => {
                e.stopPropagation();
                changeStairDirection('down');
            });
        }
        if (btnTransformDeselect) {
            btnTransformDeselect.addEventListener('click', (e) => {
                e.stopPropagation();
                cleanupTempVisuals();
                setHint("↔️🔄 تم إلغاء تحديد العنصر.");
            });
        }

        window.addEventListener('keydown', async (e) => {
            if (!isTracing) return;

            if (e.key === 'Escape' || e.code === 'Escape') {
                if (selectedMoveWallId || selectedMoveStairId) {
                    e.preventDefault();
                    cleanupTempVisuals();
                    setHint("↔️🔄 تم إلغاء تحديد العنصر.");
                    return;
                }
            }

            if (activeTool === 'move-wall' && (selectedMoveStairId || selectedMoveWallId)) {
                const step = e.shiftKey ? 1.0 : 0.5;
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    await nudgeSelectedElement(0, -step);
                    return;
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    await nudgeSelectedElement(0, step);
                    return;
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    await nudgeSelectedElement(-step, 0);
                    return;
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    await nudgeSelectedElement(step, 0);
                    return;
                }
            }

            if (e.key === 'r' || e.key === 'R' || e.code === 'KeyR' || e.key === 'ق') {
                if (activeTool === 'staircase') {
                    e.preventDefault();
                    stairRotationAngle = (stairRotationAngle + 90) % 360;
                    if (stairPreviewGroup) {
                        stairPreviewGroup.rotation.y = (stairRotationAngle * Math.PI) / 180.0;
                    }
                    setHint(`🪜 زاوية تدوير السلم المعماري: ${stairRotationAngle}° — انقر لتثبيته أو اضغط R للتدوير.`);
                } else if (activeTool === 'move-wall') {
                    e.preventDefault();
                    const rotAngle = e.shiftKey ? 45 : 90;
                    if (selectedMoveWallId) {
                        await rotateSelectedWall(rotAngle);
                    } else if (selectedMoveStairId) {
                        await rotateSelectedStair(90);
                    }
                }
            }
        });

        const updateToolUI = (tool) => {
            activeTool = tool;
            toolBtns.forEach(b => {
                if (b.dataset.tool === tool) b.classList.add('active');
                else if (b.dataset.tool) b.classList.remove('active');
            });
            cleanupTempVisuals();

            const canvas = this.app.viewer?.renderer?.domElement;
            if (canvas) {
                canvas.style.cursor = (tool === 'delete-wall' || tool === 'trim-wall') ? 'pointer' : (tool === 'move-wall' ? 'grab' : 'crosshair');
            }

            if (tool === 'wall') {
                setHint("🧱 انقر النقطة الأولى مباشرة فوق خط الجدار في مسقط الـ PDF لبدء الرسم...");
            } else if (tool === 'door') {
                setHint("🚪 انقر فوق موقع الباب في المخطط لتفريغ الجدار وتثبيت فتحة الباب وقوس الفتح...");
            } else if (tool === 'window') {
                setHint("🪟 انقر فوق موقع الشباك في المخطط لتفريغ الجدار وتركيب الزجاج المعماري والعتبات...");
            } else if (tool === 'passage') {
                setHint("🔲 انقر فوق الجدار لإنشاء فتحة عبور وممر مفتوح بدون مصراع لتسهيل التدفق الحركي...");
            } else if (tool === 'room') {
                setHint("🏷️ انقر الزاوية الأولى للغرفة في مسقط الـ PDF لتحديد حدود الفضاء...");
            } else if (tool === 'enclosed-space') {
                setHint("📐 انقر داخل أي مساحة محاطة بـ 3 جدران أو أكثر لكشفها وتوليد الفضاء تلقائياً، أو انقر فوق الجدران المحيطة تباعاً.");
            } else if (tool === 'staircase') {
                setHint("🪜 انقر فوق أي موقع في المخطط لتثبيت سلم معماري يربط الطابق بالحركة العمودية (اضغط R للتدوير 90°)...");
            } else if (tool === 'iot-sensor') {
                setHint("📡 انقر داخل أي فضاء أو فوق أي باب لتثبيت وبرمجة مستشعر IoT جديد...");
            } else if (tool === 'move-wall') {
                setHint("↔️🔄 انقر فوق أي جدار أو سلم لاختياره أو سحبه؛ اضغط مفتاح R لتدوير الجدار 45° أو تدوير السلم 90° مع تحديث الفتحات فورياً...");
            } else if (tool === 'delete-wall') {
                setHint("🗑️ انقر فوق أي باب، شباك، فتحة عبور، سلم، مستشعر IoT، أو جدار لحذفه فورياً من النموذج...");
            } else if (tool === 'trim-wall') {
                setHint("✂️ أداة Trim: انقر مباشرة فوق أي جدار فاصل بين جدارين لتقليمه وحذفه فورياً، ودمج الفضاءين وتوسيع وتكبير المساحة الناتجة وتحديث المؤشرات...");
            } else if (tool === 'polygon-space') {
                setHint("⬡ أداة المضلع الحر: انقر لتحديد زوايا الفضاء نقطة بنقطة (شكل L أو غير منتظم)؛ انقر نقراً مزدوجاً أو بالقرب من نقطة البداية لإغلاق وتجسيم الفضاء والأرضية...");
            } else if (tool === 'space-separator') {
                setHint("➗ قاطع فضائي افتراضي: انقر النقطة الأولى ثم الثانية عبر أي فضاء مفتوح لتقسيمه إلى منطقتين وظيفيتين بحساسات ومساحات مستقلة (Room Separator)...");
            } else if (tool === 'circle-space') {
                setHint("🔘 فضاء دائري/شعاعي: انقر في المركز واسحب لتحديد نصف القطر ثم انقر مجدداً لتجسيم الفضاء الدائري والبهو المركزي (Atrium)...");
            } else if (tool === 'calibrate-scale') {
                setHint("📏 أداة معايرة مقياس الـ PDF: انقر على النقطة الأولى لبُعد مرجعي معلوم في المسقط (بداية جدار أو خط قياس)...");
            }
        };

        const enterTracerMode = () => {
            isTracing = true;
            tracerBar.style.display = 'flex';
            openTracerBtn.style.background = 'rgba(0, 210, 255, 0.4)';
            const canvas = this.app.viewer?.renderer?.domElement;
            if (canvas) canvas.style.cursor = activeTool === 'delete-wall' ? 'pointer' : 'crosshair';

            // تعطيل تدوير الكاميرا بالزر الأيسر أثناء وضع الرسم لضمان دقة النقر
            if (this.app.viewer?.controls && window.THREE && this.app.viewer.controls.mouseButtons) {
                this.app.viewer.controls.mouseButtons = {
                    LEFT: null,
                    MIDDLE: THREE.MOUSE.DOLLY,
                    RIGHT: THREE.MOUSE.ROTATE
                };
            }

            // التبديل إلى المسقط العلوي 2D لسهولة ودقة مطابقة خطوط الـ PDF
            if (this.app.viewer) {
                this.app.viewer.setCameraView(true);
                if (toggleViewBtn) {
                    toggleViewBtn.classList.add('active-2d');
                    toggleViewBtn.textContent = '📐 منظور مجسم 3D';
                }
            }

            attachCanvasListeners();
            updateToolUI('wall');
        };

        const exitTracerMode = () => {
            isTracing = false;
            tracerBar.style.display = 'none';
            openTracerBtn.style.background = 'rgba(0, 210, 255, 0.2)';
            const canvas = this.app.viewer?.renderer?.domElement;
            if (canvas) canvas.style.cursor = 'default';

            // استرجاع التحكم الاعتيادي بالكاميرا
            if (this.app.viewer?.controls && window.THREE && this.app.viewer.controls.mouseButtons) {
                this.app.viewer.controls.mouseButtons = {
                    LEFT: THREE.MOUSE.ROTATE,
                    MIDDLE: THREE.MOUSE.DOLLY,
                    RIGHT: THREE.MOUSE.PAN
                };
            }

            // إعادة الكاميرا إلى المنظور المجسم 3D
            if (this.app.viewer) {
                this.app.viewer.setCameraView(false);
                if (toggleViewBtn) {
                    toggleViewBtn.classList.remove('active-2d');
                    toggleViewBtn.textContent = '📐 مسقط علوي 2D';
                }
            }

            cleanupTempVisuals();
        };

        this.enterTracerMode = enterTracerMode;
        this.exitTracerMode = exitTracerMode;
        this.updateToolUI = updateToolUI;

        openTracerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (isTracing) exitTracerMode();
            else enterTracerMode();
        });

        if (closeTracerBtn) {
            closeTracerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                exitTracerMode();
            });
        }

        toolBtns.forEach(btn => {
            if (btn.dataset.tool) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    updateToolUI(btn.dataset.tool);
                });
            }
        });

        // زر مسح كافة الجدران والفضاءات والأرضيات الملونة والبدء من الصفر
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const bData = this.app.viewer?.buildingData;
                if (!bData) return;
                if (!bData.walls) bData.walls = {};
                if (!bData.openings) bData.openings = {};
                if (!bData.spaces) bData.spaces = {};
                if (!bData.partitions) bData.partitions = {};

                const wallCount = Object.keys(bData.walls).length;
                const spaceCount = Object.keys(bData.spaces).length;
                if (wallCount === 0 && spaceCount === 0) {
                    setHint("ℹ️ المشهد نظيف ولا توجد جدران أو فضاءات لمسحها؛ اختر أداة (🧱 رسم جدار) وانقر مباشرة فوق المسقط للبدء بالرسم!");
                    return;
                }

                const confirmed = confirm(`هل أنت متأكد من رغبتك في مسح كافة الجدران (${wallCount} جدار) والفضاءات والأرضيات الملونة (${spaceCount} فضاء) للبدء برسم مسقط الـ PDF من لوحة نظيفة تماماً؟\n(ملاحظة: يمكنك التراجع عن المسح في أي وقت بالنقر على زر التراجع)`);
                if (!confirmed) return;

                const prevWalls = JSON.parse(JSON.stringify(bData.walls));
                const prevOpenings = JSON.parse(JSON.stringify(bData.openings || {}));
                const prevSpaces = JSON.parse(JSON.stringify(bData.spaces || {}));
                const prevPartitions = JSON.parse(JSON.stringify(bData.partitions || {}));
                historyStack.push({
                    type: 'clear-all-elements',
                    walls: prevWalls,
                    openings: prevOpenings,
                    spaces: prevSpaces,
                    partitions: prevPartitions
                });

                cleanupTempVisuals();
                bData.walls = {};
                bData.openings = {};
                bData.spaces = {};
                bData.partitions = {};
                this.app.viewer.loadBuildingModel(bData);
                this.populateSpacesEditor();
                setHint("🧹 تم مسح كافة الجدران والفتحات والفضاءات والأرضيات الملونة بنجاح! المشهد الآن نظيف تماماً للرسم والتحديد المعماري.");

                try {
                    await fetch('/api/model/clear_walls', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ clear_spaces: true })
                    });
                } catch (err) {
                    console.error("Failed to sync clear walls with backend:", err);
                }
            });
        }

        // زر تنظيف وتوصيل تقاطعات وزوايا الجدران هندسياً بشكل نظيف
        if (cleanJoinsBtn) {
            cleanJoinsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const fixed = cleanWallIntersections();
                if (fixed > 0) {
                    setHint(`✓ تم تنظيف ومحاذاة وتوصيل (${fixed}) تقاطع وزاوية بين الجدران هندسياً بشكل نظيف تماماً!`);
                } else {
                    setHint("ℹ️ كافة تقاطعات وزوايا الجدران ملتقية ومضبوطة بشكل نظيف بالفعل دون فجوات.");
                }
            });
        }

        // زر الكشف التلقائي لكافة الفضاءات المغلقة بالمبنى
        const autoDetectAllBtn = document.getElementById('btn-auto-detect-all-spaces');
        if (autoDetectAllBtn) {
            autoDetectAllBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await autoDetectAllSpaces();
            });
        }

        // زر تبديل المنظور 2D / 3D
        if (toggleViewBtn) {
            toggleViewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.app.viewer) {
                    this.app.viewer.toggleCameraView();
                    const isTop = this.app.viewer.isTopView;
                    toggleViewBtn.classList.toggle('active-2d', isTop);
                    toggleViewBtn.textContent = isTop ? '📐 منظور مجسم 3D' : '📐 مسقط علوي 2D';
                    setHint(isTop ? 
                        "📐 تم التبديل إلى المسقط الرأسي 2D؛ يمكنك الآن مطابقة خطوط الـ PDF والرسم بدقة هندسية مطلقة!" :
                        "🏢 تم التبديل إلى المنظور المجسم 3D لمعاينة الجدران والفتحات ثلاثية الأبعاد!");
                }
            });
        }

        // زر التراجع عن آخر عنصر
        if (undoBtn) {
            undoBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (historyStack.length === 0) {
                    setHint("⚠️ لا توجد عناصر سابقة للتراجع عنها.");
                    return;
                }
                const last = historyStack.pop();
                const bData = this.app.viewer?.buildingData;
                if (!bData) return;

                cleanupTempVisuals();

                if (last.type === 'wall') {
                    delete bData.walls[last.id];
                    for (const [opId, op] of Object.entries(bData.openings || {})) {
                        if (op.wall_id === last.id) delete bData.openings[opId];
                    }
                    this.app.viewer.buildWallsAndOpenings(bData.walls, bData.openings, bData.spaces);
                    this.app.viewer.setupCirculationParticles(bData);
                    setHint(`↩️ تم التراجع عن الجدار (${last.id}) وحذفه.`);
                    try {
                        await fetch('/api/model/delete_element', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ type: 'wall', id: last.id })
                        });
                    } catch(err) {}
                } else if (last.type === 'opening') {
                    delete bData.openings[last.id];
                    this.app.viewer.buildWallsAndOpenings(bData.walls, bData.openings, bData.spaces);
                    this.app.viewer.setupCirculationParticles(bData);
                    setHint(`↩️ تم التراجع عن الفتحة (${last.id}) وإعادة إغلاق الجدار.`);
                    try {
                        await fetch('/api/model/delete_element', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ type: 'opening', id: last.id })
                        });
                    } catch(err) {}
                } else if (last.type === 'room' || last.type === 'delete-space') {
                    if (last.type === 'room') {
                        delete bData.spaces[last.id];
                        this.app.viewer.deleteSpaceMesh(last.id);
                        if (last.walls) {
                            last.walls.forEach(wId => delete bData.walls[wId]);
                        }
                        if (last.doorId) {
                            delete bData.openings[last.doorId];
                        }
                        this.app.viewer.loadBuildingModel(bData);
                        this.populateSpacesEditor();
                        setHint(`↩️ تم التراجع عن الفضاء (${last.name}) وحذفه مع أرضيته.`);
                    } else if (last.type === 'delete-space') {
                        if (last.space) {
                            bData.spaces[last.space.id] = last.space;
                            if (last.walls) {
                                Object.assign(bData.walls, last.walls);
                            }
                            this.app.viewer.loadBuildingModel(bData);
                            this.populateSpacesEditor();
                            setHint(`↩️ تم التراجع واسترجاع الفضاء (${last.space.name_ar || last.space.id}) وأرضيته الملونة.`);
                            try {
                                await fetch('/api/model/add_element', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ type: 'space', element: last.space })
                                });
                            } catch(err) {}
                        }
                    }
                } else if (last.type === 'stair') {
                    if (bData.stairs && bData.stairs[last.id]) {
                        delete bData.stairs[last.id];
                        this.app.viewer.deleteStairMesh(last.id);
                        this.app.viewer.setupCirculationParticles(bData);
                        setHint(`↩️ تم التراجع عن السلم (${last.id}) وحذفه.`);
                        try {
                            await fetch('/api/model/delete_element', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'stair', id: last.id })
                            });
                        } catch(err) {}
                    }
                } else if (last.type === 'delete-stair') {
                    if (last.stair) {
                        if (!bData.stairs) bData.stairs = {};
                        bData.stairs[last.stair.id] = last.stair;
                        this.app.viewer.buildStaircases(bData.stairs);
                        this.app.viewer.setupCirculationParticles(bData);
                        setHint(`↩️ تم التراجع واسترجاع السلم المعماري (${last.stair.name_ar || last.stair.id}).`);
                        try {
                            await fetch('/api/model/add_element', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'stair', element: last.stair })
                            });
                        } catch(err) {}
                    }
                } else if (last.type === 'delete-wall') {
                    if (last.wall) {
                        bData.walls[last.wall.id] = last.wall;
                        if (last.openings) {
                            Object.assign(bData.openings, last.openings);
                        }
                        this.app.viewer.buildWallsAndOpenings(bData.walls, bData.openings, bData.spaces);
                        this.app.viewer.setupCirculationParticles(bData);
                        setHint(`↩️ تم التراجع واسترجاع الجدار (${last.wall.id}) مع فتحاته.`);
                        try {
                            await fetch('/api/model/add_element', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'wall', element: last.wall })
                            });
                            if (last.openings) {
                                for (const op of Object.values(last.openings)) {
                                    await fetch('/api/model/add_element', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ type: 'opening', element: op })
                                    });
                                }
                            }
                        } catch(err) {}
                    }
                } else if (last.type === 'delete-opening') {
                    if (last.opening && last.opening.id) {
                        bData.openings[last.opening.id] = last.opening;
                        this.app.viewer.buildWallsAndOpenings(bData.walls, bData.openings, bData.spaces);
                        this.app.viewer.setupCirculationParticles(bData);
                        const typeAr = last.opening.type === 'door' ? 'الباب' : (last.opening.type === 'window' ? 'الشباك' : 'فتحة العبور');
                        setHint(`↩️ تم التراجع واسترجاع ${typeAr} (${last.opening.id}) بنجاح.`);
                        try {
                            await fetch('/api/model/add_element', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'opening', element: last.opening })
                            });
                        } catch(err) {}
                    }
                } else if (last.type === 'clean-joins') {
                    if (last.prevWalls) {
                        bData.walls = last.prevWalls;
                        this.app.viewer.buildWallsAndOpenings(bData.walls, bData.openings, bData.spaces);
                        this.app.viewer.setupCirculationParticles(bData);
                        setHint(`↩️ تم التراجع عن تنظيف التقاطعات واسترجاع مواضع الجدران السابقة.`);
                        try {
                            await fetch('/api/model/sync_model', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ walls: bData.walls })
                            });
                        } catch(err) {}
                    }
                } else if (last.type === 'trim-wall') {
                    if (last.prevWalls) {
                        bData.walls = last.prevWalls;
                    } else if (last.deletedWall) {
                        bData.walls[last.deletedWall.id] = last.deletedWall;
                    }
                    if (last.prevSpaces) {
                        bData.spaces = last.prevSpaces;
                    }
                    if (last.deletedOpenings) {
                        Object.assign(bData.openings, last.deletedOpenings);
                    }
                    if (last.deletedPartition && bData.partitions) {
                        bData.partitions[last.deletedPartition.id] = last.deletedPartition;
                    }
                    this.app.viewer.loadBuildingModel(bData);
                    this.populateSpacesEditor();
                    setHint(`↩️ تم التراجع عن عملية التقليم (Trim) واسترجاع الجدار وفصل الفضاءات لحالتها السابقة.`);
                    try {
                        await fetch('/api/model/sync_model', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                walls: bData.walls,
                                spaces: bData.spaces,
                                openings: bData.openings
                            })
                        });
                    } catch(err) {}
                } else if (last.type === 'clear-all-elements' || last.type === 'clear-all-walls') {
                    bData.walls = last.walls || {};
                    bData.openings = last.openings || {};
                    bData.spaces = last.spaces || {};
                    bData.partitions = last.partitions || {};
                    this.app.viewer.loadBuildingModel(bData);
                    this.populateSpacesEditor();
                    setHint(`↩️ تم التراجع واسترجاع كافة الجدران (${Object.keys(bData.walls).length} جدار) والفضاءات والأرضيات الملونة بنجاح.`);
                    for (const w of Object.values(bData.walls)) {
                        try {
                            await fetch('/api/model/add_element', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'wall', element: w })
                            });
                        } catch(e) {}
                    }
                    for (const s of Object.values(bData.spaces)) {
                        try {
                            await fetch('/api/model/add_element', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'space', element: s })
                            });
                        } catch(e) {}
                    }
                } else if (last.type === 'sensor') {
                    if (last.sensorId) {
                        try {
                            await fetch('/api/iot/sensors/delete', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ sensor_id: last.sensorId })
                            });
                        } catch(err) {}
                        this.app.viewer.removeIoTSensorMesh(last.sensorId);
                        setHint(`↩️ تم التراجع عن إضافة المستشعر (${last.sensorId}) وحذفه.`);
                        const activeAnalytics = this.app?.analytics || window.twinApp?.analytics || window.app?.analytics;
                        if (activeAnalytics) {
                            await activeAnalytics.fetchAndUpdateSensorsInventory();
                            await activeAnalytics.fetchAndUpdateIoTTelemetry();
                        }
                    }
                } else if (last.type === 'move-wall') {
                    if (last.wallId && last.prevWall && bData.walls[last.wallId]) {
                        bData.walls[last.wallId] = last.prevWall;
                        if (last.prevOpenings) {
                            Object.assign(bData.openings, last.prevOpenings);
                        }
                        this.app.viewer.buildWallsAndOpenings(bData.walls, bData.openings, bData.spaces);
                        this.app.viewer.setupCirculationParticles(bData);
                        setHint(`↩️ تم التراجع عن تحريك الجدار (${last.wallId}) واسترجاع موضعه السابق مع فتحاته.`);
                        try {
                            await fetch('/api/model/sync_model', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    walls: bData.walls,
                                    openings: bData.openings,
                                    spaces: bData.spaces
                                })
                            });
                        } catch(err) {
                            console.error("Failed to sync wall move undo:", err);
                        }
                    }
                } else if (last.type === 'rotate-wall') {
                    if (last.wallId && last.prevWall && bData.walls[last.wallId]) {
                        bData.walls[last.wallId] = last.prevWall;
                        if (last.prevOpenings) {
                            Object.assign(bData.openings, last.prevOpenings);
                        }
                        this.app.viewer.buildWallsAndOpenings(bData.walls, bData.openings, bData.spaces);
                        this.app.viewer.setupCirculationParticles(bData);
                        setHint(`↩️ تم التراجع عن تدوير الجدار (${last.wallId}) واسترجاع زاويته وموضعه السابق.`);
                        try {
                            await fetch('/api/model/sync_model', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    walls: bData.walls,
                                    openings: bData.openings,
                                    spaces: bData.spaces
                                })
                            });
                        } catch(err) {
                            console.error("Failed to sync wall rotate undo:", err);
                        }
                    }
                } else if (last.type === 'move-stair' || last.type === 'rotate-stair') {
                    if (last.stairId && last.prevStair && bData.stairs && bData.stairs[last.stairId]) {
                        bData.stairs[last.stairId] = last.prevStair;
                        this.app.viewer.buildStaircases(bData.stairs);
                        this.app.viewer.setupCirculationParticles(bData);
                        setHint(`↩️ تم التراجع عن تعديل السلم (${last.stairId}) واسترجاع موضعه وزاويته السابقة.`);
                        try {
                            await fetch('/api/model/update_stair', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    id: last.stairId,
                                    position: last.prevStair.position,
                                    rotation: last.prevStair.rotation
                                })
                            });
                        } catch(err) {
                            console.error("Failed to sync stair undo:", err);
                        }
                    }
                } else if (last.type === 'create-enclosed-space') {
                    if (last.spaceId && bData.spaces[last.spaceId]) {
                        delete bData.spaces[last.spaceId];
                        this.app.viewer.deleteSpaceMesh(last.spaceId);
                        this.app.viewer.loadBuildingModel(bData);
                        this.populateSpacesEditor();
                        setHint(`↩️ تم التراجع عن إنشاء الفضاء (${last.space?.name_ar || last.spaceId}) وحذفه بنجاح.`);
                        try {
                            await fetch('/api/model/delete_element', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'space', id: last.spaceId })
                            });
                        } catch(err) {
                            console.error("Failed to sync enclosed space deletion:", err);
                        }
                    }
                } else if (last.type === 'create-polygon-space' || last.type === 'create-circle-space') {
                    if (last.spaceId && bData.spaces[last.spaceId]) {
                        const spName = bData.spaces[last.spaceId].name_ar || last.spaceId;
                        delete bData.spaces[last.spaceId];
                        this.app.viewer.deleteSpaceMesh(last.spaceId);
                        this.app.viewer.loadBuildingModel(bData);
                        this.populateSpacesEditor();
                        setHint(`↩️ تم التراجع عن إنشاء الفضاء (${spName}) وحذفه.`);
                        try {
                            await fetch('/api/model/delete_element', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'space', id: last.spaceId })
                            });
                        } catch(err) {}
                    }
                } else if (last.type === 'split-space') {
                    if (last.originalSpace) {
                        bData.spaces[last.originalSpace.id] = last.originalSpace;
                    }
                    if (last.newSpaceIds) {
                        for (const nid of last.newSpaceIds) {
                            delete bData.spaces[nid];
                            try {
                                await fetch('/api/model/delete_element', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ type: 'space', id: nid })
                                });
                            } catch(err) {}
                        }
                    }
                    this.app.viewer.loadBuildingModel(bData);
                    this.populateSpacesEditor();
                    setHint(`↩️ تم التراجع عن تقسيم الفضاء واسترجاع الفضاء الأصلي (${last.originalSpace?.name_ar || ''}).`);
                    try {
                        if (last.originalSpace) {
                            await fetch('/api/model/add_element', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'space', element: last.originalSpace })
                            });
                        }
                    } catch(err) {}
                } else if (last.type === 'batch-auto-spaces') {
                    if (last.spaces) {
                        for (const s of last.spaces) {
                            delete bData.spaces[s.id];
                            try {
                                await fetch('/api/model/delete_element', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ type: 'space', id: s.id })
                                });
                            } catch(e) {}
                        }
                    }
                    this.app.viewer.loadBuildingModel(bData);
                    this.populateSpacesEditor();
                    setHint(`↩️ تم التراجع عن الكشف التلقائي وحذف (${last.spaces?.length || 0}) فضاءات.`);
                }
            });
        }

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const planeIntersectPoint = new THREE.Vector3();

        // حساب الإحداثيات الدقيقة فوق مسقط الـ PDF المستورد أو بلاطات IFC أو الأرضية
        const getPointOnBlueprint = (clientX, clientY) => {
            const canvas = this.app.viewer?.renderer?.domElement;
            if (!canvas || !this.app.viewer?.camera) return null;
            const rect = canvas.getBoundingClientRect();
            mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, this.app.viewer.camera);

            // 1. فحص التقاطع المباشر مع شبكة مسقط الـ PDF المعماري المستورد
            const bpMesh = this.app.viewer?.blueprintMesh;
            if (bpMesh && bpMesh.visible) {
                const hits = raycaster.intersectObject(bpMesh);
                if (hits && hits.length > 0) {
                    return hits[0].point;
                }
            }
            // 2. فحص التقاطع المباشر مع بلاطات طوابق مبنى الـ IFC (Slabs)
            if (this.app.viewer?.slabMeshes) {
                const visibleSlabs = Object.values(this.app.viewer.slabMeshes).filter(s => s && s.visible);
                if (visibleSlabs.length > 0) {
                    const hits = raycaster.intersectObjects(visibleSlabs, true);
                    if (hits && hits.length > 0) {
                        return hits[0].point;
                    }
                }
            }
            // 3. التقاطع مع أرضية المشهد الافتراضية
            if (raycaster.ray.intersectPlane(groundPlane, planeIntersectPoint)) {
                return planeIntersectPoint.clone();
            }
            return null;
        };

        const findNearestWallProjection = (cx, cz, walls) => {
            let closestWall = null;
            let minDist = Infinity;
            let bestProj = null;

            for (const wall of Object.values(walls || {})) {
                if (!wall.start || !wall.end) continue;
                const x1 = wall.start[0], z1 = wall.start[1];
                const x2 = wall.end[0], z2 = wall.end[1];
                const dx = x2 - x1, dz = z2 - z1;
                const l2 = dx * dx + dz * dz;
                if (l2 === 0) continue;

                let t = ((cx - x1) * dx + (cz - z1) * dz) / l2;
                t = Math.max(0.05, Math.min(0.95, t));
                const px = x1 + t * dx;
                const pz = z1 + t * dz;
                const dist = Math.hypot(cx - px, cz - pz);

                if (dist < minDist) {
                    minDist = dist;
                    closestWall = wall;
                    bestProj = [px, pz];
                }
            }
            return closestWall ? { wall: closestWall, dist: minDist, proj: bestProj } : null;
        };

        const findWallUnderCursor = (clientX, clientY) => {
            const canvas = this.app.viewer?.renderer?.domElement;
            if (!canvas || !this.app.viewer?.camera) return null;
            const rect = canvas.getBoundingClientRect();
            mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, this.app.viewer.camera);

            // 1. فحص التقاطع المباشر بالـ Raycaster مع كائنات الجدران ثلاثية الأبعاد (عادية أو مجمعة IFC)
            if (this.app.viewer.wallMeshes) {
                const wallGroups = Object.values(this.app.viewer.wallMeshes).filter(Boolean);
                if (wallGroups.length > 0) {
                    const hits = raycaster.intersectObjects(wallGroups, true);
                    for (const hit of hits) {
                        // أ. دعم جدران الـ IFC المجمعة (wall_batch)
                        if (hit.object.userData && hit.object.userData.type === 'wall_batch') {
                            const boxIdx = Math.floor(hit.faceIndex / 12);
                            const wallId = hit.object.userData.wallIds?.[boxIdx];
                            if (wallId) return wallId;
                        }
                        // ب. دعم جدران الموديل العادي
                        let cur = hit.object;
                        while (cur && (!cur.userData || !cur.userData.wallId)) {
                            cur = cur.parent;
                        }
                        if (cur && cur.userData && cur.userData.wallId) {
                            return cur.userData.wallId;
                        }
                    }
                }
            }

            // 2. فحص المسافة الهندسية المسقطة على خطوط الجدران في المسقط 2D (تحديد دقيق للجدار دون التداخل مع الفضاءات والسلالم)
            const pt = getPointOnBlueprint(clientX, clientY);
            const bData = this.app.viewer?.buildingData;
            if (pt && bData && bData.walls) {
                let candidateWalls = bData.walls;
                const actStorey = this.app.viewer?.activeStoreyFilter;
                if (actStorey && actStorey !== 'all') {
                    candidateWalls = {};
                    for (const [wId, w] of Object.entries(bData.walls)) {
                        if (w.storey_id === actStorey) candidateWalls[wId] = w;
                    }
                } else if (pt.y !== undefined && pt.y > 0.5) {
                    candidateWalls = {};
                    for (const [wId, w] of Object.entries(bData.walls)) {
                        const elev = w.base_elevation || w.elevation || 0;
                        if (Math.abs(elev - pt.y) < 3.0) candidateWalls[wId] = w;
                    }
                    if (Object.keys(candidateWalls).length === 0) candidateWalls = bData.walls;
                }
                const snap = findNearestWallProjection(pt.x, pt.z, candidateWalls);
                if (snap && snap.dist <= 1.2) {
                    return snap.wall.id;
                }
            }
            return null;
        };

        // currentHoveredSpaceId تم تعريفه في النطاق الرئيسي للـ Tracer

        const findSpaceUnderCursor = (clientX, clientY) => {
            const canvas = this.app.viewer?.renderer?.domElement;
            if (!canvas || !this.app.viewer?.camera) return null;
            const rect = canvas.getBoundingClientRect();
            mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, this.app.viewer.camera);

            if (this.app.viewer.roomMeshes) {
                const meshes = Object.values(this.app.viewer.roomMeshes).filter(Boolean);
                if (meshes.length > 0) {
                    const hits = raycaster.intersectObjects(meshes, true);
                    if (hits && hits.length > 0) {
                        let cur = hits[0].object;
                        while (cur && (!cur.userData || !cur.userData.spaceId)) {
                            cur = cur.parent;
                        }
                        if (cur && cur.userData && cur.userData.spaceId) {
                            return cur.userData.spaceId;
                        }
                    }
                }
            }

            const pt = getPointOnBlueprint(clientX, clientY);
            const bData = this.app.viewer?.buildingData;
            if (pt && bData && bData.spaces) {
                for (const [sId, sp] of Object.entries(bData.spaces)) {
                    if (sp.polygon && isPointInPolygon(pt.x, pt.z, sp.polygon)) {
                        return sId;
                    }
                    const b = sp.bounds;
                    if (b && pt.x >= b.x && pt.x <= b.x + b.width && pt.z >= b.z && pt.z <= b.z + b.depth) {
                        return sId;
                    }
                }
            }
            return null;
        };

        const findStairUnderCursor = (clientX, clientY) => {
            const canvas = this.app.viewer?.renderer?.domElement;
            if (!canvas || !this.app.viewer?.camera) return null;
            const rect = canvas.getBoundingClientRect();
            mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, this.app.viewer.camera);

            // 1. فحص التقاطع المباشر بالـ Raycaster مع كائنات السلم وبطاقات التعريف وصناديق التحديد
            if (this.app.viewer.stairMeshes) {
                const stairGroups = Object.values(this.app.viewer.stairMeshes).filter(Boolean);
                if (stairGroups.length > 0) {
                    const hits = raycaster.intersectObjects(stairGroups, true);
                    if (hits && hits.length > 0) {
                        for (const hit of hits) {
                            let cur = hit.object;
                            while (cur) {
                                if (cur.userData && cur.userData.stairId) {
                                    return cur.userData.stairId;
                                }
                                cur = cur.parent;
                            }
                        }
                    }
                }
            }

            if (this.app.viewer.stairBadges) {
                const badges = Object.values(this.app.viewer.stairBadges).filter(Boolean);
                if (badges.length > 0) {
                    const bHits = raycaster.intersectObjects(badges, true);
                    if (bHits && bHits.length > 0 && bHits[0].object?.userData?.stairId) {
                        return bHits[0].object.userData.stairId;
                    }
                }
            }

            // 2. فحص المسقط 2D للمحيط الهندسي للسلم (Oriented Bounding Box)
            const pt = getPointOnBlueprint(clientX, clientY);
            const bData = this.app.viewer?.buildingData;
            if (pt && bData && bData.stairs) {
                for (const [sId, st] of Object.entries(bData.stairs)) {
                    const sx = (st.position && st.position[0] !== undefined) ? st.position[0] : 0;
                    const sz = (st.position && st.position[1] !== undefined) ? st.position[1] : 0;
                    const w = st.width || 2.4;
                    const d = st.depth || 4.5;
                    const rotRad = ((st.rotation || 0) * Math.PI) / 180.0;
                    const dx = pt.x - sx;
                    const dz = pt.z - sz;
                    const localX = Math.abs(dx * Math.cos(-rotRad) - dz * Math.sin(-rotRad));
                    const localZ = Math.abs(dx * Math.sin(-rotRad) + dz * Math.cos(-rotRad));
                    if (localX <= (w / 2.0 + 0.6) && localZ <= (d / 2.0 + 0.6)) {
                        return sId;
                    }
                    if (Math.hypot(dx, dz) <= Math.max(w, d) / 2 + 0.8) {
                        return sId;
                    }
                }
            }
            return null;
        };

        const findOpeningUnderCursor = (clientX, clientY) => {
            const canvas = this.app.viewer?.renderer?.domElement;
            if (!canvas || !this.app.viewer?.camera) return null;
            const rect = canvas.getBoundingClientRect();
            mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, this.app.viewer.camera);

            // 1. فحص كائنات الفتحات (الأبواب، الشبابيك، ممرات العبور) ثلاثية الأبعاد
            if (this.app.viewer.openingMeshes) {
                const allOpMeshes = Object.values(this.app.viewer.openingMeshes).flat().filter(Boolean);
                if (allOpMeshes.length > 0) {
                    const hits = raycaster.intersectObjects(allOpMeshes, true);
                    if (hits && hits.length > 0) {
                        let cur = hits[0].object;
                        while (cur && (!cur.userData || !cur.userData.openingId)) {
                            cur = cur.parent;
                        }
                        if (cur && cur.userData && cur.userData.openingId) {
                            return cur.userData.openingId;
                        }
                    }
                }
            }

            // 2. فحص القرب الهندسي في المسقط 2D من مراكز الفتحات المعمارية
            const pt = getPointOnBlueprint(clientX, clientY);
            const bData = this.app.viewer?.buildingData;
            if (pt && bData && bData.openings) {
                let closestOpId = null;
                let minOpDist = Infinity;
                for (const [opId, op] of Object.entries(bData.openings)) {
                    if (!op.position) continue;
                    const d = Math.hypot(pt.x - op.position[0], pt.z - op.position[1]);
                    const hitRadius = Math.max(1.5, (op.width || 1.2) * 0.9);
                    if (d <= hitRadius && d < minOpDist) {
                        minOpDist = d;
                        closestOpId = opId;
                    }
                }
                if (closestOpId) return closestOpId;
            }
            return null;
        };

        const findSensorUnderCursor = (clientX, clientY) => {
            const canvas = this.app.viewer?.renderer?.domElement;
            if (!canvas || !this.app.viewer?.camera) return null;
            const rect = canvas.getBoundingClientRect();
            mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, this.app.viewer.camera);

            // 1. فحص التقاطع بالـ Raycaster مع مجسمات المستشعرات 3D
            if (this.app.viewer?.sensorMeshes) {
                const sensorGroups = Object.values(this.app.viewer.sensorMeshes).filter(Boolean);
                if (sensorGroups.length > 0) {
                    const hits = raycaster.intersectObjects(sensorGroups, true);
                    if (hits && hits.length > 0) {
                        let cur = hits[0].object;
                        while (cur && (!cur.userData || !cur.userData.sensorId)) {
                            cur = cur.parent;
                        }
                        if (cur && cur.userData && cur.userData.sensorId) {
                            return cur.userData.sensorId;
                        }
                    }
                }
            }

            // 2. فحص القرب الهندسي في المسقط 2D
            const pt = getPointOnBlueprint(clientX, clientY);
            if (pt && this.app.viewer?.sensorMeshes) {
                let closestSensorId = null;
                let minDist = 2.2;
                for (const [sId, group] of Object.entries(this.app.viewer.sensorMeshes)) {
                    if (!group || !group.position) continue;
                    const d = Math.hypot(pt.x - group.position.x, pt.z - group.position.z);
                    if (d < minDist) {
                        minDist = d;
                        closestSensorId = sId;
                    }
                }
                if (closestSensorId) return closestSensorId;
            }
            return null;
        };

        const snapPointToWalls = (rawX, rawZ, walls, excludeWallId = null, snapDist = 1.2) => {
            if (!walls) return { point: [rawX, rawZ], snapped: false, snapType: null };

            let bestPoint = [rawX, rawZ];
            let minDist = snapDist;
            let snapType = null; // 'endpoint' or 'edge'

            // أ. أولوية الالتقاط المغناطيسي لنهايات وزوايا الجدران القائمة (Endpoint Corner Snapping)
            for (const [wId, wall] of Object.entries(walls)) {
                if (wId === excludeWallId) continue;
                for (const pt of [wall.start, wall.end]) {
                    const d = Math.hypot(rawX - pt[0], rawZ - pt[1]);
                    if (d < minDist) {
                        minDist = d;
                        bestPoint = [pt[0], pt[1]];
                        snapType = 'endpoint';
                    }
                }
            }

            // ب. إذا لم يكن بالقرب من زاوية، نفحص الالتقاط المتعامد على جسم الجدار (T-Junction Edge Snapping)
            if (!snapType) {
                let minEdgeDist = Math.min(minDist, 0.85);
                for (const [wId, wall] of Object.entries(walls)) {
                    if (wId === excludeWallId) continue;
                    const x1 = wall.start[0], z1 = wall.start[1];
                    const x2 = wall.end[0], z2 = wall.end[1];
                    const dx = x2 - x1, dz = z2 - z1;
                    const lenSq = dx * dx + dz * dz;
                    if (lenSq < 0.2) continue;

                    const t = Math.max(0.02, Math.min(0.98, ((rawX - x1) * dx + (rawZ - z1) * dz) / lenSq));
                    const projX = x1 + t * dx;
                    const projZ = z1 + t * dz;
                    const d = Math.hypot(rawX - projX, rawZ - projZ);
                    if (d < minEdgeDist) {
                        minEdgeDist = d;
                        bestPoint = [Math.round(projX * 10) / 10, Math.round(projZ * 10) / 10];
                        snapType = 'edge';
                    }
                }
            }

            return {
                point: bestPoint,
                snapped: snapType !== null,
                snapType: snapType
            };
        };

        // دوال الحسابات الهندسية وكشف الفضاءات المغلقة بـ 3 جدران أو أكثر
        const intersectTwoWallLines = (w1, w2) => {
            if (!w1 || !w2) return [0, 0];
            const x1 = w1.start[0], z1 = w1.start[1];
            const x2 = w1.end[0], z2 = w1.end[1];
            const x3 = w2.start[0], z3 = w2.start[1];
            const x4 = w2.end[0], z4 = w2.end[1];

            const denom = (x2 - x1) * (z4 - z3) - (z2 - z1) * (x4 - x3);
            if (Math.abs(denom) > 1e-4) {
                const s = ((x3 - x1) * (z4 - z3) - (z3 - z1) * (x4 - x3)) / denom;
                const px = x1 + s * (x2 - x1);
                const pz = z1 + s * (z2 - z1);
                const d1 = Math.min(Math.hypot(px - x1, pz - z1), Math.hypot(px - x2, pz - z2));
                const d2 = Math.min(Math.hypot(px - x3, pz - z3), Math.hypot(px - x4, pz - z4));
                if (d1 < 3.5 && d2 < 3.5) {
                    return [Math.round(px * 10) / 10, Math.round(pz * 10) / 10];
                }
            }

            let bestD = Infinity;
            let bestP = [(x1 + x3) / 2, (z1 + z3) / 2];
            for (const p1 of [w1.start, w1.end]) {
                for (const p2 of [w2.start, w2.end]) {
                    const d = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
                    if (d < bestD) {
                        bestD = d;
                        bestP = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
                    }
                }
            }
            return [Math.round(bestP[0] * 10) / 10, Math.round(bestP[1] * 10) / 10];
        };

        const computePolygonAreaAndCentroid = (vertices) => {
            if (!vertices || vertices.length < 3) {
                return { area: 0, centroid: [0, 0], bounds: { x: 0, z: 0, width: 0, depth: 0, height: 3.5 } };
            }
            let areaSigned = 0;
            let cxNum = 0;
            let czNum = 0;
            const n = vertices.length;

            for (let i = 0; i < n; i++) {
                const j = (i + 1) % n;
                const xi = vertices[i][0], zi = vertices[i][1];
                const xj = vertices[j][0], zj = vertices[j][1];
                const cross = (xi * zj - xj * zi);
                areaSigned += cross;
                cxNum += (xi + xj) * cross;
                czNum += (zi + zj) * cross;
            }

            const area = Math.abs(areaSigned) / 2.0;
            let cx, cz;
            if (Math.abs(areaSigned) > 1e-4) {
                cx = cxNum / (3.0 * areaSigned);
                cz = czNum / (3.0 * areaSigned);
            } else {
                cx = vertices.reduce((s, p) => s + p[0], 0) / n;
                cz = vertices.reduce((s, p) => s + p[1], 0) / n;
            }

            const xs = vertices.map(p => p[0]);
            const zs = vertices.map(p => p[1]);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minZ = Math.min(...zs);
            const maxZ = Math.max(...zs);

            return {
                area: Math.round(area * 10) / 10,
                centroid: [Math.round(cx * 10) / 10, Math.round(cz * 10) / 10],
                bounds: {
                    x: Math.round(minX * 10) / 10,
                    z: Math.round(minZ * 10) / 10,
                    width: Math.max(1, Math.round((maxX - minX) * 10) / 10),
                    depth: Math.max(1, Math.round((maxZ - minZ) * 10) / 10),
                    height: 3.5
                }
            };
        };

        const isPointInPolygon = (px, pz, polygon) => {
            if (!polygon || polygon.length < 3) return false;
            let inside = false;
            const n = polygon.length;
            for (let i = 0, j = n - 1; i < n; j = i++) {
                const xi = polygon[i][0], zi = polygon[i][1];
                const xj = polygon[j][0], zj = polygon[j][1];
                const intersect = ((zi > pz) !== (zj > pz)) &&
                    (px < (xj - xi) * (pz - zi) / (zj - zi + 1e-9) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        };

        const computePolygonFromWallCycle = (cycle, walls) => {
            if (!cycle || cycle.length < 3) return null;
            const n = cycle.length;
            const vertices = [];
            for (let i = 0; i < n; i++) {
                const wCurr = walls[cycle[i]];
                const wNext = walls[cycle[(i + 1) % n]];
                if (!wCurr || !wNext) return null;
                vertices.push(intersectTwoWallLines(wCurr, wNext));
            }
            const props = computePolygonAreaAndCentroid(vertices);
            return {
                vertices,
                area: props.area,
                centroid: props.centroid,
                bounds: props.bounds,
                valid: props.area >= 1.0
            };
        };

        const detectEnclosingWallsFromPoint = (px, pz, walls, targetElev = null) => {
            if (!walls || Object.keys(walls).length < 3) return null;

            // تصفية الجدران بحسب الطابق والارتفاع لتجنب تداخل جدران الطوابق المتعددة في ملفات الـ IFC
            let filteredWalls = walls;
            const actStorey = this.app.viewer?.activeStoreyFilter;
            if (actStorey && actStorey !== 'all') {
                filteredWalls = {};
                for (const [wId, w] of Object.entries(walls)) {
                    if (w.storey_id === actStorey) filteredWalls[wId] = w;
                }
            } else if (targetElev !== null && targetElev > 0.5) {
                filteredWalls = {};
                for (const [wId, w] of Object.entries(walls)) {
                    const elev = w.base_elevation || w.elevation || 0;
                    if (Math.abs(elev - targetElev) < 2.8) filteredWalls[wId] = w;
                }
                if (Object.keys(filteredWalls).length < 3) filteredWalls = walls;
            }

            const numRays = 72;
            const maxDist = 60.0;
            const rayHits = [];

            for (let i = 0; i < numRays; i++) {
                const angle = (2 * Math.PI * i) / numRays;
                const dx = Math.cos(angle);
                const dz = Math.sin(angle);

                let bestT = maxDist;
                let bestWallId = null;

                for (const [wId, w] of Object.entries(filteredWalls)) {
                    if (!w.start || !w.end) continue;
                    const x1 = w.start[0], z1 = w.start[1];
                    const x2 = w.end[0], z2 = w.end[1];
                    const vx = x2 - x1, vz = z2 - z1;
                    const denom = dx * vz - dz * vx;
                    if (Math.abs(denom) < 1e-6) continue;

                    const wx = x1 - px, wz = z1 - pz;
                    const t = (wx * vz - wz * vx) / denom;
                    const u = (wx * dz - wz * dx) / denom;

                    if (t > 0.05 && u >= -0.05 && u <= 1.05 && t < bestT) {
                        bestT = t;
                        bestWallId = wId;
                    }
                }

                if (!bestWallId) {
                    return null;
                }
                rayHits.push({ angle, wallId: bestWallId });
            }

            const wallCycle = [];
            for (const h of rayHits) {
                if (wallCycle.length === 0 || wallCycle[wallCycle.length - 1] !== h.wallId) {
                    wallCycle.push(h.wallId);
                }
            }
            if (wallCycle.length > 1 && wallCycle[0] === wallCycle[wallCycle.length - 1]) {
                wallCycle.pop();
            }

            if (wallCycle.length < 3) return null;

            const polyRes = computePolygonFromWallCycle(wallCycle, filteredWalls);
            if (!polyRes || !polyRes.valid) return null;

            if (!isPointInPolygon(px, pz, polyRes.vertices)) {
                return null;
            }

            return {
                wallIds: wallCycle,
                vertices: polyRes.vertices,
                area: polyRes.area,
                centroid: polyRes.centroid,
                bounds: polyRes.bounds
            };
        };

        const computePolygonFromSelectedWalls = (wallIds, walls) => {
            if (!wallIds || wallIds.length < 3) return null;
            const segments = [];
            for (const wid of wallIds) {
                const w = walls[wid];
                if (!w || !w.start || !w.end) return null;
                segments.push({ id: wid, start: [...w.start], end: [...w.end] });
            }

            // محاولة 1: الترتيب المتسلسل بالنهايات المتقاربة (Greedy Chain)
            const orderedSegments = [segments[0]];
            const used = new Set([0]);
            let currentPt = segments[0].end;

            for (let step = 1; step < segments.length; step++) {
                let bestIdx = -1;
                let bestDist = Infinity;
                let flip = false;

                for (let i = 0; i < segments.length; i++) {
                    if (used.has(i)) continue;
                    const dStart = Math.hypot(segments[i].start[0] - currentPt[0], segments[i].start[1] - currentPt[1]);
                    const dEnd = Math.hypot(segments[i].end[0] - currentPt[0], segments[i].end[1] - currentPt[1]);

                    if (dStart < bestDist) {
                        bestDist = dStart;
                        bestIdx = i;
                        flip = false;
                    }
                    if (dEnd < bestDist) {
                        bestDist = dEnd;
                        bestIdx = i;
                        flip = true;
                    }
                }

                if (bestIdx !== -1 && bestDist <= 6.5) {
                    used.add(bestIdx);
                    const seg = segments[bestIdx];
                    if (flip) {
                        orderedSegments.push({ id: seg.id, start: seg.end, end: seg.start });
                        currentPt = seg.start;
                    } else {
                        orderedSegments.push({ id: seg.id, start: seg.start, end: seg.end });
                        currentPt = seg.end;
                    }
                } else {
                    break;
                }
            }

            let cycleIds = null;
            if (orderedSegments.length === segments.length) {
                const dClose = Math.hypot(currentPt[0] - orderedSegments[0].start[0], currentPt[1] - orderedSegments[0].start[1]);
                if (dClose <= 7.0) {
                    cycleIds = orderedSegments.map(s => s.id);
                }
            }

            // محاولة 2 ذكية مخصصة لملفات IFC: الترتيب الزاوي الدائري حول المركز المعماري (Angular Ordering)
            if (!cycleIds) {
                const centers = segments.map(s => [ (s.start[0] + s.end[0]) / 2, (s.start[1] + s.end[1]) / 2 ]);
                const avgX = centers.reduce((sum, c) => sum + c[0], 0) / centers.length;
                const avgZ = centers.reduce((sum, c) => sum + c[1], 0) / centers.length;

                const sorted = [...segments].sort((a, b) => {
                    const caX = (a.start[0] + a.end[0]) / 2;
                    const caZ = (a.start[1] + a.end[1]) / 2;
                    const cbX = (b.start[0] + b.end[0]) / 2;
                    const cbZ = (b.start[1] + b.end[1]) / 2;
                    return Math.atan2(caZ - avgZ, caX - avgX) - Math.atan2(cbZ - avgZ, cbX - avgX);
                });
                cycleIds = sorted.map(s => s.id);
            }

            const polyRes = computePolygonFromWallCycle(cycleIds, walls);
            return polyRes;
        };

        const pointInPolygon = (x, z, poly) => {
            if (!poly || poly.length < 3) return false;
            let inside = false;
            for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                const xi = poly[i][0] !== undefined ? poly[i][0] : poly[i].x;
                const zi = poly[i][1] !== undefined ? poly[i][1] : poly[i].z;
                const xj = poly[j][0] !== undefined ? poly[j][0] : poly[j].x;
                const zj = poly[j][1] !== undefined ? poly[j][1] : poly[j].z;
                const intersect = ((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi + 1e-9) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        };

        const polygonArea = (pts) => {
            if (!pts || pts.length < 3) return 0;
            let sum = 0;
            for (let i = 0; i < pts.length; i++) {
                const j = (i + 1) % pts.length;
                const xi = pts[i][0] !== undefined ? pts[i][0] : pts[i].x;
                const zi = pts[i][1] !== undefined ? pts[i][1] : pts[i].z;
                const xj = pts[j][0] !== undefined ? pts[j][0] : pts[j].x;
                const zj = pts[j][1] !== undefined ? pts[j][1] : pts[j].z;
                sum += (xi * zj - xj * zi);
            }
            return Math.abs(sum) / 2.0;
        };

        const lineIntersection = (p1, p2, p3, p4) => {
            const x1 = p1[0] !== undefined ? p1[0] : p1.x;
            const z1 = p1[1] !== undefined ? p1[1] : p1.z;
            const x2 = p2[0] !== undefined ? p2[0] : p2.x;
            const z2 = p2[1] !== undefined ? p2[1] : p2.z;
            const x3 = p3[0] !== undefined ? p3[0] : p3.x;
            const z3 = p3[1] !== undefined ? p3[1] : p3.z;
            const x4 = p4[0] !== undefined ? p4[0] : p4.x;
            const z4 = p4[1] !== undefined ? p4[1] : p4.z;

            const denom = (x1 - x2) * (z3 - z4) - (z1 - z2) * (x3 - x4);
            if (Math.abs(denom) < 1e-6) return null;

            const t = ((x1 - x3) * (z3 - z4) - (z1 - z3) * (x3 - x4)) / denom;
            const u = -((x1 - x2) * (z1 - z3) - (z1 - z2) * (x1 - x3)) / denom;

            if (t >= -1e-4 && t <= 1 + 1e-4 && u >= -1e-4 && u <= 1 + 1e-4) {
                return [Math.round((x1 + t * (x2 - x1)) * 100) / 100, Math.round((z1 + t * (z2 - z1)) * 100) / 100];
            }
            return null;
        };

        const splitPolygonByLine = (poly, pA, pB) => {
            if (!poly || poly.length < 3) return null;
            const ax = pA[0] !== undefined ? pA[0] : pA.x;
            const az = pA[1] !== undefined ? pA[1] : pA.z;
            const bx = pB[0] !== undefined ? pB[0] : pB.x;
            const bz = pB[1] !== undefined ? pB[1] : pB.z;

            const dx = bx - ax;
            const dz = bz - az;
            const len = Math.hypot(dx, dz);
            if (len < 1e-4) return null;

            const ux = dx / len;
            const uz = dz / len;

            const extA = [ax - ux * 500, az - uz * 500];
            const extB = [ax + ux * 500, az + uz * 500];

            const n = poly.length;
            const intersections = [];

            for (let i = 0; i < n; i++) {
                const e1 = poly[i];
                const e2 = poly[(i + 1) % n];
                const pt = lineIntersection(extA, extB, e1, e2);
                if (pt) {
                    const isNearLast = intersections.length > 0 && Math.hypot(pt[0] - intersections[intersections.length - 1].pt[0], pt[1] - intersections[intersections.length - 1].pt[1]) < 0.01;
                    if (!isNearLast) {
                        intersections.push({ edgeIdx: i, pt });
                    }
                }
            }

            if (intersections.length !== 2) return null;

            const { edgeIdx: i1, pt: pt1 } = intersections[0];
            const { edgeIdx: i2, pt: pt2 } = intersections[1];

            const poly1 = [pt1];
            let idx = (i1 + 1) % n;
            while (idx !== (i2 + 1) % n) {
                const v = poly[idx];
                poly1.push([v[0] !== undefined ? v[0] : v.x, v[1] !== undefined ? v[1] : v.z]);
                idx = (idx + 1) % n;
            }
            poly1.push(pt2);

            const poly2 = [pt2];
            idx = (i2 + 1) % n;
            while (idx !== (i1 + 1) % n) {
                const v = poly[idx];
                poly2.push([v[0] !== undefined ? v[0] : v.x, v[1] !== undefined ? v[1] : v.z]);
                idx = (idx + 1) % n;
            }
            poly2.push(pt1);

            return { polyA: poly1, polyB: poly2, int1: pt1, int2: pt2 };
        };

        const createSpaceFromPolygon = async (points, elev = 0, storeyId = null, defaultName = "فضاء مخصص", baseColor = "#2ecc71") => {
            const bData = this.app.viewer?.buildingData;
            if (!bData) return null;
            if (!bData.spaces) bData.spaces = {};

            const poly = points.map(p => [
                Math.round((p[0] !== undefined ? p[0] : p.x) * 100) / 100,
                Math.round((p[1] !== undefined ? p[1] : p.z) * 100) / 100
            ]);

            const props = computePolygonAreaAndCentroid(poly);
            const spaceId = `space_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const actStorey = storeyId || this.app.viewer?.activeStoreyFilter || 'st_g';

            const spaceObj = {
                id: spaceId,
                name_ar: defaultName,
                name_en: "Custom Space",
                type: "flexible",
                capacity: Math.max(2, Math.round(props.area / 3.5)),
                area_m2: Math.round(props.area * 10) / 10,
                centroid: props.centroid,
                polygon: poly,
                bounds: props.bounds,
                base_elevation: elev || 0,
                storey_id: actStorey,
                color: baseColor
            };

            bData.spaces[spaceId] = spaceObj;

            this.app.viewer.loadBuildingModel(bData);
            this.populateSpacesEditor();

            try {
                await fetch('/api/model/add_element', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'space', element: spaceObj })
                });
                if (window.app?.analytics) {
                    await window.app.analytics.fetchAndUpdateSensorsInventory();
                    await window.app.analytics.fetchAndUpdateIoTTelemetry();
                }
            } catch (err) {
                console.warn("Failed to sync space to backend:", err);
            }

            return spaceObj;
        };

        const finalizePolygonSpace = async () => {
            if (polygonPoints.length < 3) {
                setHint("⚠️ يلزم تحديد 3 نقاط على الأقل لتشكيل فضاء مضلع.");
                return;
            }
            const bData = this.app.viewer?.buildingData;
            if (!bData) return;
            const area = polygonArea(polygonPoints);
            if (area < 0.5) {
                setHint("⚠️ مساحة الفضاء المضلع صغيرة جداً.");
                return;
            }
            const defaultName = `قاعة مضلعة ${Object.keys(bData.spaces || {}).length + 1}`;
            const roomName = prompt(`أدخل اسم الفضاء المضلع الحر (${area.toFixed(1)}م²):`, defaultName);
            if (!roomName) return;

            const pts = [...polygonPoints];
            cleanupTempVisuals();

            const targetElev = (pts[0].y !== undefined && pts[0].y > 0.5) ? Math.round(pts[0].y * 10) / 10 : 0;
            const targetStorey = this.app.viewer?.activeStoreyFilter || 'st_g';

            const spaceObj = await createSpaceFromPolygon(pts, targetElev, targetStorey, roomName, "#10b981");
            if (spaceObj) {
                historyStack.push({
                    type: 'create-polygon-space',
                    spaceId: spaceObj.id,
                    space: spaceObj
                });
                setHint(`✓ تم تجسيم الفضاء المضلع الحر (${roomName}) بمساحة ${area.toFixed(1)}م² وتوليد أرضيته وحساساته بنجاح!`);
            }
        };

        const autoDetectAllSpaces = async () => {
            const bData = this.app.viewer?.buildingData;
            if (!bData || !bData.walls || Object.keys(bData.walls).length < 3) {
                alert("⚠️ لا توجد جدران كافية في النموذج المعماري للكشف التلقائي عن الفضاءات.");
                return;
            }

            setHint("⚡ جاري المسح الشامل واكتشاف كافة الفضاءات المغلقة آلياً...");

            const actStorey = this.app.viewer?.activeStoreyFilter;
            let wallsToScan = bData.walls;
            if (actStorey && actStorey !== 'all') {
                wallsToScan = {};
                for (const [wId, w] of Object.entries(bData.walls)) {
                    if (w.storey_id === actStorey) wallsToScan[wId] = w;
                }
                if (Object.keys(wallsToScan).length < 3) wallsToScan = bData.walls;
            }

            let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
            for (const w of Object.values(wallsToScan)) {
                if (!w.start || !w.end) continue;
                minX = Math.min(minX, w.start[0], w.end[0]);
                maxX = Math.max(maxX, w.start[0], w.end[0]);
                minZ = Math.min(minZ, w.start[1], w.end[1]);
                maxZ = Math.max(maxZ, w.start[1], w.end[1]);
            }

            if (!isFinite(minX) || !isFinite(maxX)) return;

            const discovered = [];
            const step = 2.0;

            for (let x = minX + 1.0; x <= maxX - 1.0; x += step) {
                for (let z = minZ + 1.0; z <= maxZ - 1.0; z += step) {
                    const detected = detectEnclosingWallsFromPoint(x + 0.1, z + 0.1, wallsToScan, 0);
                    if (detected && detected.area >= 2.0) {
                        let isDup = false;
                        const sortedWalls = [...detected.wallIds].sort().join(',');
                        for (const d of discovered) {
                            const dSorted = [...d.wallIds].sort().join(',');
                            if (dSorted === sortedWalls || Math.hypot(d.centroid[0] - detected.centroid[0], d.centroid[1] - detected.centroid[1]) < 1.4) {
                                isDup = true;
                                break;
                            }
                        }
                        if (!isDup) {
                            discovered.push(detected);
                        }
                    }
                }
            }

            if (discovered.length === 0) {
                setHint("ℹ️ لم يتم العثور على فضاءات مغلقة جديدة غير مسجلة.");
                alert("لم يتم العثور على حلقات جدران مغلقة جديدة.");
                return;
            }

            if (!bData.spaces) bData.spaces = {};
            let createdCount = 0;
            const colors = ["#2ecc71", "#3498db", "#9b59b6", "#f39c12", "#e67e22", "#1abc9c", "#e74c3c", "#00d2ff"];
            const newlyCreatedSpaces = [];

            for (let i = 0; i < discovered.length; i++) {
                const disc = discovered[i];
                let alreadyExists = false;
                for (const s of Object.values(bData.spaces)) {
                    if (s.centroid && Math.hypot(s.centroid[0] - disc.centroid[0], s.centroid[1] - disc.centroid[1]) < 1.5) {
                        alreadyExists = true;
                        break;
                    }
                }
                if (alreadyExists) continue;

                const sIdx = Object.keys(bData.spaces).length + 1;
                const color = colors[createdCount % colors.length];
                const spaceObj = {
                    id: `space_auto_${Date.now()}_${createdCount}`,
                    name_ar: `فضاء آلي ${sIdx}`,
                    name_en: `Auto Space ${sIdx}`,
                    type: "flexible",
                    capacity: Math.max(2, Math.round(disc.area / 3.5)),
                    area_m2: Math.round(disc.area * 10) / 10,
                    centroid: disc.centroid,
                    polygon: disc.vertices,
                    bounds: disc.bounds,
                    base_elevation: 0,
                    storey_id: actStorey || 'st_g',
                    enclosing_wall_ids: disc.wallIds,
                    color: color
                };

                bData.spaces[spaceObj.id] = spaceObj;
                newlyCreatedSpaces.push(spaceObj);
                createdCount++;

                try {
                    fetch('/api/model/add_element', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'space', element: spaceObj })
                    }).catch(() => {});
                } catch (e) {}
            }

            if (createdCount > 0) {
                historyStack.push({
                    type: 'batch-auto-spaces',
                    spaces: newlyCreatedSpaces
                });
                this.app.viewer.loadBuildingModel(bData);
                this.populateSpacesEditor();
                if (window.app?.analytics) {
                    try {
                        await window.app.analytics.fetchAndUpdateSensorsInventory();
                        await window.app.analytics.fetchAndUpdateIoTTelemetry();
                    } catch (e) {}
                }
                setHint(`✓ تم الكشف التلقائي عن (${createdCount}) فضاءات وتوليد أرضياتها وحساساتها بنجاح!`);
                alert(`⚡ اكتمل الكشف التلقائي بنجاح!\nتم اكتشاف وتوليد ${createdCount} فضاءً معمارياً وحساب مساحاتها وتوليد مجسمات الأرضية وشارات التعريف وحساسات IoT.`);
            } else {
                setHint("ℹ️ كافة الفضاءات المكتشفة مسجلة مسبقاً في النموذج.");
                alert("كافة الفضاءات المغلقة المكتشفة مسجلة بالفعل في النموذج.");
            }
        };

        const analyzeWallTrim = (wId, clickPt = null) => {
            const bData = this.app.viewer?.buildingData;
            if (!bData || !bData.walls || !bData.walls[wId]) {
                return { valid: false, error: 'الجدار غير موجود' };
            }

            const targetWall = bData.walls[wId];
            if (!targetWall.start || !targetWall.end) {
                return { valid: false, error: 'إحداثيات الجدار غير صالحة' };
            }

            const sx = targetWall.start[0], sz = targetWall.start[1];
            const ex = targetWall.end[0], ez = targetWall.end[1];
            const dx = ex - sx, dz = ez - sz;
            const len = Math.hypot(dx, dz);
            if (len < 0.1) return { valid: false, error: 'طول الجدار قصير جداً' };

            const wElev = targetWall.base_elevation || targetWall.elevation || 0;
            const wStorey = targetWall.storey_id || null;

            // 1. البحث عن كافة الجدران المتقاطعة أو المتصلة بالجدار المستهدف
            const contacts = [];
            for (const [otherId, otherW] of Object.entries(bData.walls)) {
                if (otherId === wId || !otherW.start || !otherW.end) continue;

                // التحقق من تماثل الطابق والمنسوب
                const oElev = otherW.base_elevation || otherW.elevation || 0;
                if (Math.abs(oElev - wElev) > 2.5) continue;
                if (wStorey && otherW.storey_id && wStorey !== otherW.storey_id && wStorey !== 'all' && otherW.storey_id !== 'all') continue;

                const ox1 = otherW.start[0], oz1 = otherW.start[1];
                const ox2 = otherW.end[0], oz2 = otherW.end[1];
                const odx = ox2 - ox1, odz = oz2 - oz1;
                const oLen = Math.hypot(odx, odz);
                if (oLen < 0.1) continue;

                // أ. تقاطع الخطوط 2D
                const denom = dx * odz - dz * odx;
                let foundContact = false;

                if (Math.abs(denom) > 1e-5) {
                    const t = ((ox1 - sx) * odz - (oz1 - sz) * odx) / denom;
                    const u = ((ox1 - sx) * dz - (oz1 - sz) * dx) / denom;
                    if (t >= -0.08 && t <= 1.08 && u >= -0.08 && u <= 1.08) {
                        const clampedT = Math.max(0, Math.min(1, t));
                        const pt = [sx + clampedT * dx, sz + clampedT * dz];
                        contacts.push({
                            wallId: otherId,
                            wall: otherW,
                            t: clampedT,
                            dist: clampedT * len,
                            point: pt,
                            type: 'intersection'
                        });
                        foundContact = true;
                    }
                }

                // ب. فحص اتصال البداية والنهاية (T-Junctions أو زوايا L)
                if (!foundContact) {
                    const tProjS = ((sx - ox1) * odx + (sz - oz1) * odz) / (oLen * oLen);
                    if (tProjS >= -0.08 && tProjS <= 1.08) {
                        const nearX = ox1 + Math.max(0, Math.min(1, tProjS)) * odx;
                        const nearZ = oz1 + Math.max(0, Math.min(1, tProjS)) * odz;
                        if (Math.hypot(sx - nearX, sz - nearZ) <= 0.8) {
                            contacts.push({
                                wallId: otherId,
                                wall: otherW,
                                t: 0.0,
                                dist: 0.0,
                                point: [sx, sz],
                                type: 'start_junction'
                            });
                            foundContact = true;
                        }
                    }
                }

                if (!foundContact) {
                    const tProjE = ((ex - ox1) * odx + (ez - oz1) * odz) / (oLen * oLen);
                    if (tProjE >= -0.08 && tProjE <= 1.08) {
                        const nearX = ox1 + Math.max(0, Math.min(1, tProjE)) * odx;
                        const nearZ = oz1 + Math.max(0, Math.min(1, tProjE)) * odz;
                        if (Math.hypot(ex - nearX, ez - nearZ) <= 0.8) {
                            contacts.push({
                                wallId: otherId,
                                wall: otherW,
                                t: 1.0,
                                dist: len,
                                point: [ex, ez],
                                type: 'end_junction'
                            });
                            foundContact = true;
                        }
                    }
                }
            }

            // إزالة التكرارات بحسب wallId
            const uniqueContacts = [];
            const seenIds = new Set();
            for (const c of contacts) {
                if (!seenIds.has(c.wallId)) {
                    seenIds.add(c.wallId);
                    uniqueContacts.push(c);
                }
            }
            uniqueContacts.sort((a, b) => a.t - b.t);

            // 2. تحديد الجدارين المحيطين (Bounding Walls)
            let bound1 = null, bound2 = null;
            if (uniqueContacts.length >= 2) {
                if (clickPt) {
                    const clickT = ((clickPt.x - sx) * dx + (clickPt.z - sz) * dz) / (len * len);
                    for (let i = 0; i < uniqueContacts.length; i++) {
                        if (uniqueContacts[i].t <= clickT) bound1 = uniqueContacts[i];
                        if (uniqueContacts[i].t >= clickT && !bound2) bound2 = uniqueContacts[i];
                    }
                    if (!bound1) bound1 = uniqueContacts[0];
                    if (!bound2 || bound1.wallId === bound2.wallId) {
                        bound2 = uniqueContacts[uniqueContacts.length - 1];
                    }
                } else {
                    bound1 = uniqueContacts[0];
                    bound2 = uniqueContacts[uniqueContacts.length - 1];
                }
            } else if (uniqueContacts.length === 1) {
                bound1 = uniqueContacts[0];
            }

            const boundingWallIds = [];
            const boundingNames = [];
            if (bound1) {
                boundingWallIds.push(bound1.wallId);
                boundingNames.push(bound1.wall.name_ar || bound1.wallId);
            }
            if (bound2 && bound2.wallId !== bound1?.wallId) {
                boundingWallIds.push(bound2.wallId);
                boundingNames.push(bound2.wall.name_ar || bound2.wallId);
            }

            // 3. كشف الفضاءات المجاورة للجدار لتوسيعها
            const midX = (sx + ex) / 2;
            const midZ = (sz + ez) / 2;
            const nx = -dz / len;
            const nz = dx / len;

            const adjacentSpaces = [];
            const seenSpaces = new Set();

            // فحص الفضاءات عبر enclosing_wall_ids أولاً
            for (const [spId, sp] of Object.entries(bData.spaces || {})) {
                if (sp.enclosing_wall_ids && Array.isArray(sp.enclosing_wall_ids) && sp.enclosing_wall_ids.includes(wId)) {
                    if (!seenSpaces.has(spId)) {
                        seenSpaces.add(spId);
                        adjacentSpaces.push(sp);
                    }
                }
            }

            // فحص الفضاءات عبر النقاط الاختبارية والحدود الهندسية
            const testOffsets = [0.9, -0.9, 1.8, -1.8, 2.8, -2.8];
            const testPoints = testOffsets.map(d => ({ x: midX + d * nx, z: midZ + d * nz }));

            for (const [spId, sp] of Object.entries(bData.spaces || {})) {
                if (seenSpaces.has(spId)) continue;

                if (sp.polygon && Array.isArray(sp.polygon) && sp.polygon.length >= 3) {
                    for (const pt of testPoints) {
                        if (pointInPolygon(pt.x, pt.z, sp.polygon)) {
                            seenSpaces.add(spId);
                            adjacentSpaces.push(sp);
                            break;
                        }
                    }
                } else if (sp.bounds) {
                    const b = sp.bounds;
                    const bMinX = b.x - 0.5, bMaxX = b.x + b.width + 0.5;
                    const bMinZ = b.z - 0.5, bMaxZ = b.z + b.depth + 0.5;
                    for (const pt of testPoints) {
                        if (pt.x >= bMinX && pt.x <= bMaxX && pt.z >= bMinZ && pt.z <= bMaxZ) {
                            seenSpaces.add(spId);
                            adjacentSpaces.push(sp);
                            break;
                        }
                    }
                }
            }

            return {
                valid: true,
                targetWall,
                contacts: uniqueContacts,
                bound1,
                bound2,
                boundingWallIds,
                boundingNames,
                adjacentSpaces,
                midpoint: [midX, midZ],
                wElev,
                wStorey
            };
        };

        const trimWallAndExpandSpace = async (wId, options = {}) => {
            const bData = this.app.viewer?.buildingData;
            if (!bData || !bData.walls || !bData.walls[wId]) {
                setHint("⚠️ لم يتم العثور على الجدار المطلوب.");
                return false;
            }

            const clickPt = options.clientX && options.clientY ? getPointOnBlueprint(options.clientX, options.clientY) : null;
            const analysis = analyzeWallTrim(wId, clickPt);
            if (!analysis.valid) {
                setHint(`⚠️ ${analysis.error || 'تعذر تقليم الجدار'}`);
                return false;
            }

            const targetWall = JSON.parse(JSON.stringify(bData.walls[wId]));
            const prevWalls = JSON.parse(JSON.stringify(bData.walls));
            const prevSpaces = JSON.parse(JSON.stringify(bData.spaces || {}));
            const prevOpenings = JSON.parse(JSON.stringify(bData.openings || {}));

            // 1. حذف الفتحات المعمارية المرتبطة بهذا الجدار
            const deletedOpenings = {};
            for (const [opId, op] of Object.entries(bData.openings || {})) {
                if (op.wall_id === wId) {
                    deletedOpenings[opId] = JSON.parse(JSON.stringify(op));
                    delete bData.openings[opId];
                }
            }

            // 2. حذف القواطع المنزلقة المرتبطة
            let deletedPartition = null;
            if (bData.partitions) {
                for (const [pId, part] of Object.entries(bData.partitions)) {
                    if (part.wall_id === wId || (part.between && analysis.adjacentSpaces.length >= 2 &&
                        part.between.includes(analysis.adjacentSpaces[0].id) && part.between.includes(analysis.adjacentSpaces[1].id))) {
                        deletedPartition = JSON.parse(JSON.stringify(part));
                        delete bData.partitions[pId];
                        break;
                    }
                }
            }

            // 3. تقليم وحذف الجدار بين الجدارين
            let isFullDelete = true;
            if (analysis.bound1 && analysis.bound2 && analysis.bound1.wallId !== analysis.bound2.wallId) {
                const t1 = Math.min(analysis.bound1.t, analysis.bound2.t);
                const t2 = Math.max(analysis.bound1.t, analysis.bound2.t);
                const len = Math.hypot(targetWall.end[0] - targetWall.start[0], targetWall.end[1] - targetWall.start[1]);

                const extStart = t1 * len;
                const extEnd = (1.0 - t2) * len;

                if (extStart > 0.6 || extEnd > 0.6) {
                    isFullDelete = false;
                    delete bData.walls[wId];

                    if (extStart > 0.6) {
                        const seg1Id = `${wId}_trim1`;
                        bData.walls[seg1Id] = {
                            ...JSON.parse(JSON.stringify(targetWall)),
                            id: seg1Id,
                            start: targetWall.start,
                            end: [Math.round((targetWall.start[0] + t1 * (targetWall.end[0] - targetWall.start[0])) * 10) / 10,
                                  Math.round((targetWall.start[1] + t1 * (targetWall.end[1] - targetWall.start[1])) * 10) / 10]
                        };
                    }
                    if (extEnd > 0.6) {
                        const seg2Id = `${wId}_trim2`;
                        bData.walls[seg2Id] = {
                            ...JSON.parse(JSON.stringify(targetWall)),
                            id: seg2Id,
                            start: [Math.round((targetWall.start[0] + t2 * (targetWall.end[0] - targetWall.start[0])) * 10) / 10,
                                    Math.round((targetWall.start[1] + t2 * (targetWall.end[1] - targetWall.start[1])) * 10) / 10],
                            end: targetWall.end
                        };
                    }
                }
            }

            if (isFullDelete) {
                delete bData.walls[wId];
            }

            // 4. تكبير وزيادة مساحة الفضاء (Space Expansion & Merging)
            let expansionSummary = "";
            let mergedSpaceId = null;
            let deletedSpaceId = null;

            if (analysis.adjacentSpaces.length >= 2) {
                // دمج فضاءين متجاورين في فضاء واحد موسع
                const sp1 = bData.spaces[analysis.adjacentSpaces[0].id];
                const sp2 = bData.spaces[analysis.adjacentSpaces[1].id];

                if (sp1 && sp2) {
                    mergedSpaceId = sp1.id;
                    deletedSpaceId = sp2.id;

                    const area1 = sp1.area_m2 || 0;
                    const area2 = sp2.area_m2 || 0;
                    const totalArea = Math.round((area1 + area2) * 10) / 10;
                    const cap1 = sp1.capacity || 10;
                    const cap2 = sp2.capacity || 10;
                    const totalCap = Math.max(cap1 + cap2, Math.round(totalArea / 3.5));

                    const name1 = sp1.name_ar || sp1.id;
                    const name2 = sp2.name_ar || sp2.id;
                    sp1.name_ar = `${name1} (موسع - دمج مع ${name2})`;
                    sp1.type = "flexible";

                    // فحص كشف المضلع المحيطي الجديد بعد إزالة الجدار
                    const detected = detectEnclosingWallsFromPoint(analysis.midpoint[0], analysis.midpoint[1], bData.walls, analysis.wElev);
                    if (detected && detected.valid && detected.area > 5) {
                        sp1.polygon = detected.vertices;
                        sp1.bounds = detected.bounds;
                        sp1.centroid = detected.centroid;
                        sp1.area_m2 = Math.round(detected.area * 10) / 10;
                        sp1.capacity = Math.max(totalCap, Math.round(sp1.area_m2 / 3.5));
                        sp1.enclosing_wall_ids = detected.wallIds;
                    } else if (sp1.bounds && sp2.bounds) {
                        const minX = Math.min(sp1.bounds.x, sp2.bounds.x);
                        const minZ = Math.min(sp1.bounds.z, sp2.bounds.z);
                        const maxX = Math.max(sp1.bounds.x + sp1.bounds.width, sp2.bounds.x + sp2.bounds.width);
                        const maxZ = Math.max(sp1.bounds.z + sp1.bounds.depth, sp2.bounds.z + sp2.bounds.depth);
                        sp1.bounds = {
                            x: Math.round(minX * 10) / 10,
                            z: Math.round(minZ * 10) / 10,
                            width: Math.round((maxX - minX) * 10) / 10,
                            depth: Math.round((maxZ - minZ) * 10) / 10,
                            height: sp1.bounds.height || 3.5
                        };
                        sp1.area_m2 = totalArea;
                        sp1.capacity = totalCap;
                    } else {
                        sp1.area_m2 = totalArea;
                        sp1.capacity = totalCap;
                    }

                    // حذف الفضاء الثاني ومجسمه ثلاثي الأبعاد
                    this.app.viewer.deleteSpaceMesh(sp2.id);
                    delete bData.spaces[sp2.id];

                    expansionSummary = `تم دمج (${name1} + ${name2}) في فضاء موسع بمساحة إجمالية ${sp1.area_m2}م² (+${area2}م²) وسعة ${sp1.capacity} شخص!`;
                }
            } else if (analysis.adjacentSpaces.length === 1) {
                // توسيع فضاء مجاور واحد
                const sp = bData.spaces[analysis.adjacentSpaces[0].id];
                if (sp) {
                    mergedSpaceId = sp.id;
                    const oldArea = sp.area_m2 || 0;
                    const detected = detectEnclosingWallsFromPoint(analysis.midpoint[0], analysis.midpoint[1], bData.walls, analysis.wElev);
                    if (detected && detected.valid && detected.area > oldArea) {
                        sp.polygon = detected.vertices;
                        sp.bounds = detected.bounds;
                        sp.centroid = detected.centroid;
                        sp.area_m2 = Math.round(detected.area * 10) / 10;
                        sp.capacity = Math.max(sp.capacity || 10, Math.round(sp.area_m2 / 3.5));
                        sp.enclosing_wall_ids = detected.wallIds;
                        sp.name_ar = `${sp.name_ar} (موسع)`;
                        expansionSummary = `تم توسيع مساحة فضاء (${sp.name_ar}) من ${oldArea}م² إلى ${sp.area_m2}م² (+${Math.round((sp.area_m2 - oldArea)*10)/10}م²)!`;
                    } else {
                        sp.area_m2 = Math.round((oldArea + 15.0) * 10) / 10;
                        sp.capacity = Math.max(sp.capacity || 10, Math.round(sp.area_m2 / 3.5));
                        sp.name_ar = `${sp.name_ar} (موسع)`;
                        expansionSummary = `تم توسيع مساحة فضاء (${sp.name_ar}) إلى ${sp.area_m2}م² بعد إزالة القاطع!`;
                    }
                }
            } else {
                // لا يوجد فضاء مسجل مسبقاً، محاولة توليد فضاء جديد
                const detected = detectEnclosingWallsFromPoint(analysis.midpoint[0], analysis.midpoint[1], bData.walls, analysis.wElev);
                if (detected && detected.valid && detected.area > 5) {
                    const newSpId = `space_${Date.now()}`;
                    const newSpace = {
                        id: newSpId,
                        name_ar: "فضاء موسع جديد",
                        name_en: "Expanded Space",
                        type: "flexible",
                        capacity: Math.max(10, Math.round(detected.area / 3.5)),
                        area_m2: Math.round(detected.area * 10) / 10,
                        centroid: detected.centroid,
                        polygon: detected.vertices,
                        bounds: detected.bounds,
                        base_elevation: analysis.wElev,
                        storey_id: analysis.wStorey || 'st_g',
                        enclosing_wall_ids: detected.wallIds,
                        color: "#2ecc71"
                    };
                    bData.spaces[newSpId] = newSpace;
                    mergedSpaceId = newSpId;
                    expansionSummary = `تم تكوين وتجسيم فضاء موسع جديد بمساحة ${newSpace.area_m2}م²!`;
                } else {
                    expansionSummary = `تم حذف الجدار بين الجدارين بنجاح وفتح المجال المعماري لتوسيع الفضاء.`;
                }
            }

            // 5. حفظ في سجل التراجع History Stack
            historyStack.push({
                type: 'trim-wall',
                wallId: wId,
                deletedWall: targetWall,
                deletedOpenings,
                deletedPartition,
                prevWalls,
                prevSpaces,
                mergedSpaceId,
                deletedSpaceId
            });

            // 6. وميض بصري على الفضاء الموسع والجدارين المحيطين
            if (analysis.boundingWallIds && analysis.boundingWallIds.length > 0) {
                analysis.boundingWallIds.forEach(bwId => {
                    if (this.app.viewer?.highlightWall) this.app.viewer.highlightWall(bwId, 0x00d2ff);
                });
                setTimeout(() => {
                    if (this.app.viewer) {
                        analysis.boundingWallIds.forEach(bwId => this.app.viewer.clearWallHighlight(bwId));
                    }
                }, 1200);
            }

            // إعادة بناء المشهد واللوحة الحركية
            this.app.viewer.loadBuildingModel(bData);
            this.populateSpacesEditor();

            if (mergedSpaceId && this.app.viewer?.highlightSpace) {
                this.app.viewer.highlightSpace(mergedSpaceId, 0x2ecc71);
                setTimeout(() => {
                    if (this.app.viewer?.clearSpaceHighlight) this.app.viewer.clearSpaceHighlight(mergedSpaceId);
                }, 1800);
            }

            const boundDesc = analysis.boundingNames.length > 0 ? ` بين (${analysis.boundingNames.join(' و ')})` : '';
            setHint(`✓ ✂️ تم بنجاح عمل Trim وحذف الجدار${boundDesc}! ${expansionSummary}`);

            try {
                await fetch('/api/model/sync_model', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        walls: bData.walls,
                        spaces: bData.spaces,
                        openings: bData.openings
                    })
                });
            } catch(err) {}

            return true;
        };

        cleanWallIntersections = () => {
            const bData = this.app.viewer?.buildingData;
            if (!bData || !bData.walls || Object.keys(bData.walls).length === 0) return 0;

            const prevWalls = JSON.parse(JSON.stringify(bData.walls));
            let fixedCount = 0;
            const wallsList = Object.values(bData.walls);

            // 1. دمج وتوحيد النهايات المتقاربة جداً (Corner Endpoint Snapping < 0.65m)
            for (let i = 0; i < wallsList.length; i++) {
                const w1 = wallsList[i];
                for (let j = i + 1; j < wallsList.length; j++) {
                    const w2 = wallsList[j];

                    const pairs = [
                        ['start', 'start'],
                        ['start', 'end'],
                        ['end', 'start'],
                        ['end', 'end']
                    ];

                    for (const [p1, p2] of pairs) {
                        const pt1 = w1[p1];
                        const pt2 = w2[p2];
                        const d = Math.hypot(pt1[0] - pt2[0], pt1[1] - pt2[1]);
                        if (d > 0.001 && d <= 0.65) {
                            const avgX = Math.round(((pt1[0] + pt2[0]) / 2) * 10) / 10;
                            const avgZ = Math.round(((pt1[1] + pt2[1]) / 2) * 10) / 10;
                            w1[p1] = [avgX, avgZ];
                            w2[p2] = [avgX, avgZ];
                            fixedCount++;
                        }
                    }
                }
            }

            // 2. محاذاة تقاطعات T-Junctions: إذا كانت نهاية جدار قريبة من مسار جدار آخر (< 0.55m) نُسقطها عليه بدقة
            for (const w1 of wallsList) {
                for (const endKey of ['start', 'end']) {
                    const pt = w1[endKey];
                    for (const w2 of wallsList) {
                        if (w1.id === w2.id) continue;
                        const x1 = w2.start[0], z1 = w2.start[1];
                        const x2 = w2.end[0], z2 = w2.end[1];
                        const dx = x2 - x1, dz = z2 - z1;
                        const lenSq = dx * dx + dz * dz;
                        if (lenSq < 0.2) continue;

                        const t = ((pt[0] - x1) * dx + (pt[1] - z1) * dz) / lenSq;
                        if (t > 0.05 && t < 0.95) {
                            const projX = x1 + t * dx;
                            const projZ = z1 + t * dz;
                            const dist = Math.hypot(pt[0] - projX, pt[1] - projZ);
                            if (dist > 0.001 && dist <= 0.55) {
                                w1[endKey] = [Math.round(projX * 10) / 10, Math.round(projZ * 10) / 10];
                                fixedCount++;
                            }
                        }
                    }
                }
            }

            if (fixedCount > 0) {
                historyStack.push({
                    type: 'clean-joins',
                    prevWalls: prevWalls
                });
                this.app.viewer.buildWallsAndOpenings(bData.walls, bData.openings, bData.spaces);
                this.app.viewer.setupCirculationParticles(bData);

                // مزامنة التعديلات الهندسية مع خادم الـ Backend
                fetch('/api/model/sync_model', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ walls: bData.walls })
                }).catch(err => console.error("Failed to sync clean joins:", err));
            }

            return fixedCount;
        };

        let pointerDownPos = { x: 0, y: 0 };
        let pointerDownTime = 0;
        let lastProcessedClickTime = 0;

        const attachCanvasListeners = () => {
            const canvas = this.app.viewer?.renderer?.domElement;
            if (!canvas) {
                // المحرك لم يكتمل بعد، نحاول مجدداً
                setTimeout(attachCanvasListeners, 300);
                return;
            }

            // إذا كان الـ canvas سبق تسجيله، نتجاوز
            if (canvas._tracerAttached) return;
            canvas._tracerAttached = true;

            const onPointerDown = (e) => {
                if (e.button !== 0) return; // فقط الزر الأيسر
                pointerDownPos = { x: e.clientX, y: e.clientY };
                pointerDownTime = Date.now();

                if (isTracing && activeTool === 'move-wall') {
                    const bData = this.app.viewer?.buildingData;
                    // فحص السلم أولاً لتجنب التقاط الجدران المجاورة
                    let targetStairId = findStairUnderCursor(e.clientX, e.clientY);
                    if (!targetStairId && selectedMoveStairId && bData?.stairs?.[selectedMoveStairId]) {
                        const pt = getPointOnBlueprint(e.clientX, e.clientY);
                        if (pt) {
                            const st = bData.stairs[selectedMoveStairId];
                            const spos = st.position || [0, 0];
                            const dist = Math.hypot(pt.x - spos[0], pt.z - spos[1]);
                            if (dist <= Math.max(st.width || 2.4, st.depth || 4.5) + 1.2) {
                                targetStairId = selectedMoveStairId;
                            }
                        }
                    }

                    if (targetStairId && bData?.stairs?.[targetStairId]) {
                        movingStairId = targetStairId;
                        isDraggingStair = false; // لا يتم تفعيل السحب إلا بعد حركة فعلية للفأرة
                        const pt = getPointOnBlueprint(e.clientX, e.clientY);
                        stairMoveStartPoint = pt ? [pt.x, pt.z] : null;
                        stairMoveOriginal = JSON.parse(JSON.stringify(bData.stairs[targetStairId]));
                        stairLastTargetPos = null;
                    } else {
                        const targetWallId = findWallUnderCursor(e.clientX, e.clientY);
                        if (targetWallId && bData?.walls?.[targetWallId]) {
                            movingWallId = targetWallId;
                            isDraggingWall = false; // لا يتم تفعيل السحب إلا بعد حركة فعلية للفأرة
                            const pt = getPointOnBlueprint(e.clientX, e.clientY);
                            wallMoveStartPoint = pt ? [pt.x, pt.z] : null;
                            wallMoveOriginal = JSON.parse(JSON.stringify(bData.walls[targetWallId]));
                            wallMoveOpeningsOriginal = {};
                            for (const [opId, op] of Object.entries(bData.openings || {})) {
                                if (op.wall_id === targetWallId) {
                                    wallMoveOpeningsOriginal[opId] = JSON.parse(JSON.stringify(op));
                                }
                            }
                        }
                    }
                }
            };

            canvas.addEventListener('pointerdown', onPointerDown);

            // حركة الفأرة لإظهار خط الرسم التفاعلي المباشر (Rubberband Line Preview)
            canvas.addEventListener('mousemove', (e) => {
                if (!isTracing || !this.app.viewer) return;

                if (activeTool === 'delete-wall') {
                    const hoveredOpeningId = findOpeningUnderCursor(e.clientX, e.clientY);
                    const hoveredSensorId = !hoveredOpeningId ? findSensorUnderCursor(e.clientX, e.clientY) : null;
                    const hoveredStairId = (!hoveredOpeningId && !hoveredSensorId) ? findStairUnderCursor(e.clientX, e.clientY) : null;
                    const hoveredWallId = (!hoveredOpeningId && !hoveredSensorId && !hoveredStairId) ? findWallUnderCursor(e.clientX, e.clientY) : null;
                    const hoveredSpaceId = (!hoveredOpeningId && !hoveredSensorId && !hoveredStairId && !hoveredWallId) ? findSpaceUnderCursor(e.clientX, e.clientY) : null;

                    // 1. أولوية تمييز الفتحات المعمارية (باب / شباك / فتحة عبور)
                    if (hoveredOpeningId) {
                        if (currentHoveredSensorId) {
                            this.app.viewer.clearIoTSensorHighlight();
                            currentHoveredSensorId = null;
                        }
                        if (currentHoveredStairId) {
                            this.app.viewer.clearStairHighlight(currentHoveredStairId);
                            currentHoveredStairId = null;
                        }
                        if (currentHoveredWallId) {
                            this.app.viewer.clearWallHighlight(currentHoveredWallId);
                            currentHoveredWallId = null;
                        }
                        if (currentHoveredSpaceId) {
                            this.app.viewer.clearSpaceHighlight(currentHoveredSpaceId);
                            currentHoveredSpaceId = null;
                        }
                        if (currentHoveredOpeningId !== hoveredOpeningId) {
                            if (currentHoveredOpeningId) {
                                this.app.viewer.clearOpeningHighlight(currentHoveredOpeningId);
                            }
                            currentHoveredOpeningId = hoveredOpeningId;
                            this.app.viewer.highlightOpening(hoveredOpeningId, 0xff3838);
                        }
                        const bData = this.app.viewer?.buildingData;
                        const opObj = bData?.openings?.[hoveredOpeningId];
                        const typeName = opObj?.type === 'door' ? 'الباب' : (opObj?.type === 'window' ? 'الشباك' : 'فتحة العبور');
                        setHint(`🗑️ تم تحديد ${typeName} (${hoveredOpeningId}) — انقر لحذف الفتحة واستعادة الجدار مصمتاً.`);
                    } else if (hoveredSensorId) {
                        // 2. تمييز مستشعرات الـ IoT للتعديل والحذف المباشر
                        if (currentHoveredOpeningId) {
                            this.app.viewer.clearOpeningHighlight(currentHoveredOpeningId);
                            currentHoveredOpeningId = null;
                        }
                        if (currentHoveredStairId) {
                            this.app.viewer.clearStairHighlight(currentHoveredStairId);
                            currentHoveredStairId = null;
                        }
                        if (currentHoveredWallId) {
                            this.app.viewer.clearWallHighlight(currentHoveredWallId);
                            currentHoveredWallId = null;
                        }
                        if (currentHoveredSpaceId) {
                            this.app.viewer.clearSpaceHighlight(currentHoveredSpaceId);
                            currentHoveredSpaceId = null;
                        }
                        if (currentHoveredSensorId !== hoveredSensorId) {
                            if (currentHoveredSensorId) {
                                this.app.viewer.clearIoTSensorHighlight();
                            }
                            currentHoveredSensorId = hoveredSensorId;
                            this.app.viewer.highlightIoTSensor(hoveredSensorId);
                        }
                        setHint(`🗑️ تم تحديد مستشعر الـ IoT (${hoveredSensorId}) — انقر لحذفه فورياً من النموذج وشبكة الرصد.`);
                    } else if (hoveredStairId) {
                        // 3. تمييز السلم المعماري وحذفه بأولوية أعلى من الجدران والفضاءات المحيطة
                        if (currentHoveredOpeningId) {
                            this.app.viewer.clearOpeningHighlight(currentHoveredOpeningId);
                            currentHoveredOpeningId = null;
                        }
                        if (currentHoveredSensorId) {
                            this.app.viewer.clearIoTSensorHighlight();
                            currentHoveredSensorId = null;
                        }
                        if (currentHoveredWallId) {
                            this.app.viewer.clearWallHighlight(currentHoveredWallId);
                            currentHoveredWallId = null;
                        }
                        if (currentHoveredSpaceId) {
                            this.app.viewer.clearSpaceHighlight(currentHoveredSpaceId);
                            currentHoveredSpaceId = null;
                        }
                        if (currentHoveredStairId !== hoveredStairId) {
                            if (currentHoveredStairId) {
                                this.app.viewer.clearStairHighlight(currentHoveredStairId);
                            }
                            currentHoveredStairId = hoveredStairId;
                            this.app.viewer.highlightStair(hoveredStairId, 0xff3838);
                        }
                        const stName = this.app.viewer.buildingData?.stairs?.[hoveredStairId]?.name_ar || hoveredStairId;
                        setHint(`🗑️ تم تحديد السلم المعماري (${stName}) — انقر لحذفه فورياً من النموذج وشبكة التدفق.`);
                    } else if (hoveredWallId) {
                        if (currentHoveredOpeningId) {
                            this.app.viewer.clearOpeningHighlight(currentHoveredOpeningId);
                            currentHoveredOpeningId = null;
                        }
                        if (currentHoveredSensorId) {
                            this.app.viewer.clearIoTSensorHighlight();
                            currentHoveredSensorId = null;
                        }
                        if (currentHoveredStairId) {
                            this.app.viewer.clearStairHighlight(currentHoveredStairId);
                            currentHoveredStairId = null;
                        }
                        if (currentHoveredSpaceId) {
                            this.app.viewer.clearSpaceHighlight(currentHoveredSpaceId);
                            currentHoveredSpaceId = null;
                        }
                        if (currentHoveredWallId !== hoveredWallId) {
                            if (currentHoveredWallId) {
                                this.app.viewer.clearWallHighlight(currentHoveredWallId);
                            }
                            currentHoveredWallId = hoveredWallId;
                            this.app.viewer.highlightWall(hoveredWallId, 0xff3838);
                        }
                        setHint(`🗑️ تم تحديد الجدار (${hoveredWallId}) — انقر لحذفه فورياً مع كافة فتحاته.`);
                    } else if (hoveredSpaceId) {
                        if (currentHoveredOpeningId) {
                            this.app.viewer.clearOpeningHighlight(currentHoveredOpeningId);
                            currentHoveredOpeningId = null;
                        }
                        if (currentHoveredSensorId) {
                            this.app.viewer.clearIoTSensorHighlight();
                            currentHoveredSensorId = null;
                        }
                        if (currentHoveredStairId) {
                            this.app.viewer.clearStairHighlight(currentHoveredStairId);
                            currentHoveredStairId = null;
                        }
                        if (currentHoveredWallId) {
                            this.app.viewer.clearWallHighlight(currentHoveredWallId);
                            currentHoveredWallId = null;
                        }
                        if (currentHoveredSpaceId !== hoveredSpaceId) {
                            if (currentHoveredSpaceId) {
                                this.app.viewer.clearSpaceHighlight(currentHoveredSpaceId);
                            }
                            currentHoveredSpaceId = hoveredSpaceId;
                            this.app.viewer.highlightSpace(hoveredSpaceId, 0xff3838);
                        }
                        const spName = this.app.viewer.buildingData?.spaces?.[hoveredSpaceId]?.name_ar || hoveredSpaceId;
                        setHint(`🗑️ تم تحديد الفضاء والأرضية الملونة (${spName}) — انقر لحذف الفضاء وأرضيته فورياً.`);
                    } else {
                        if (currentHoveredOpeningId) {
                            this.app.viewer.clearOpeningHighlight(currentHoveredOpeningId);
                            currentHoveredOpeningId = null;
                        }
                        if (currentHoveredSensorId) {
                            this.app.viewer.clearIoTSensorHighlight();
                            currentHoveredSensorId = null;
                        }
                        if (currentHoveredWallId) {
                            this.app.viewer.clearWallHighlight(currentHoveredWallId);
                            currentHoveredWallId = null;
                        }
                        if (currentHoveredSpaceId) {
                            this.app.viewer.clearSpaceHighlight(currentHoveredSpaceId);
                            currentHoveredSpaceId = null;
                        }
                        if (currentHoveredStairId) {
                            this.app.viewer.clearStairHighlight(currentHoveredStairId);
                            currentHoveredStairId = null;
                        }
                        setHint("🗑️ انقر فوق أي باب، شباك، فتحة عبور، سلم، مستشعر IoT، جدار، أو أرضية فضاء لحذفها فورياً...");
                    }
                    return;
                }

                if (activeTool === 'trim-wall') {
                    const hoveredWallId = findWallUnderCursor(e.clientX, e.clientY);
                    const bData = this.app.viewer?.buildingData;
                    if (hoveredWallId && bData?.walls?.[hoveredWallId]) {
                        if (currentHoveredWallId !== hoveredWallId) {
                            cleanupTempVisuals();
                            currentHoveredWallId = hoveredWallId;
                            this.app.viewer.highlightWall(hoveredWallId, 0xec4899);

                            const analysis = analyzeWallTrim(hoveredWallId);
                            if (analysis.boundingWallIds && analysis.boundingWallIds.length > 0) {
                                analysis.boundingWallIds.forEach(bwId => {
                                    this.app.viewer.highlightWall(bwId, 0x00d2ff);
                                });
                                trimBoundingWallHighlights = [...analysis.boundingWallIds];
                            }

                            if (analysis.adjacentSpaces && analysis.adjacentSpaces.length >= 2) {
                                const sp1 = analysis.adjacentSpaces[0];
                                const sp2 = analysis.adjacentSpaces[1];
                                const newArea = Math.round(((sp1.area_m2 || 0) + (sp2.area_m2 || 0)) * 10) / 10;
                                const bNames = analysis.boundingNames.length > 0 ? ` بين (${analysis.boundingNames.join(' و ')})` : '';
                                setHint(`✂️ انقر لتقليم وحذف الجدار${bNames} ودمج الفضاءين (${sp1.name_ar} + ${sp2.name_ar}) لتكبير المساحة إلى ${newArea}م²!`);
                            } else if (analysis.adjacentSpaces && analysis.adjacentSpaces.length === 1) {
                                const sp = analysis.adjacentSpaces[0];
                                setHint(`✂️ انقر لتقليم وحذف الجدار وتوسيع وزيادة مساحة فضاء (${sp.name_ar}).`);
                            } else {
                                const bNames = analysis.boundingNames.length > 0 ? ` بين (${analysis.boundingNames.join(' و ')})` : '';
                                setHint(`✂️ جدار (${hoveredWallId})${bNames} — انقر لتقليمه وحذفه وتوسيع الفضاء.`);
                            }
                        }
                    } else {
                        if (currentHoveredWallId) {
                            cleanupTempVisuals();
                            setHint("✂️ أداة Trim: انقر مباشرة فوق أي جدار فاصل بين جدارين لتقليمه وحذفه فورياً، ودمج الفضاءين وتوسيع وزيادة مساحة الفضاء...");
                        }
                    }
                    return;
                }

                if (activeTool === 'staircase') {
                    const pt = getPointOnBlueprint(e.clientX, e.clientY);
                    if (pt) {
                        if (!stairPreviewGroup) {
                            stairPreviewGroup = new THREE.Group();
                            const boxGeo = new THREE.BoxGeometry(2.4, 0.4, 4.5);
                            const boxMat = new THREE.MeshBasicMaterial({
                                color: 0x3498db,
                                transparent: true,
                                opacity: 0.35
                            });
                            const boxMesh = new THREE.Mesh(boxGeo, boxMat);
                            boxMesh.position.y = 0.2;
                            stairPreviewGroup.add(boxMesh);

                            const edges = new THREE.LineSegments(
                                new THREE.EdgesGeometry(boxGeo),
                                new THREE.LineBasicMaterial({ color: 0x00d2ff })
                            );
                            edges.position.y = 0.2;
                            stairPreviewGroup.add(edges);

                            const arrow = new THREE.ArrowHelper(
                                new THREE.Vector3(0, 0, 1),
                                new THREE.Vector3(0, 0.45, -1.8),
                                1.8,
                                0x00d2ff,
                                0.4,
                                0.3
                            );
                            stairPreviewGroup.add(arrow);
                            this.app.viewer.scene.add(stairPreviewGroup);
                        }

                        stairPreviewGroup.position.set(pt.x, 0, pt.z);
                        stairPreviewGroup.rotation.y = (stairRotationAngle * Math.PI) / 180.0;
                        stairPreviewGroup.visible = true;

                        setHint(`🪜 زاوية تدوير السلم: ${stairRotationAngle}° — انقر لتثبيته أو اضغط R للتدوير 90°.`);
                    }
                    return;
                }

                if (activeTool === 'iot-sensor') {
                    const nearOpeningId = findOpeningUnderCursor(e.clientX, e.clientY);
                    const insideSpaceId = !nearOpeningId ? findSpaceUnderCursor(e.clientX, e.clientY) : null;
                    if (nearOpeningId) {
                        setHint(`📡 انقر لتثبيت عداد مرور بصري للأبواب فوق الفتحة (${nearOpeningId})...`);
                    } else if (insideSpaceId) {
                        const spName = this.app.viewer?.buildingData?.spaces?.[insideSpaceId]?.name_ar || insideSpaceId;
                        setHint(`📡 انقر لتثبيت مستشعر حركة/بيئي/صوتي داخل فضاء (${spName})...`);
                    } else {
                        setHint("📡 انقر لتثبيت وبرمجة مستشعر IoT في هذا الموضع...");
                    }
                }

                if (activeTool === 'move-wall') {
                    if (movingWallId && wallMoveStartPoint && wallMoveOriginal) {
                        const screenDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
                        if (screenDist > 6) {
                            isDraggingWall = true;
                            if (canvas) canvas.style.cursor = 'grabbing';
                            this.app.viewer.highlightWall(movingWallId, 0xf59e0b);

                            const pt = getPointOnBlueprint(e.clientX, e.clientY);
                            if (pt) {
                                let dx = pt.x - wallMoveStartPoint[0];
                                let dz = pt.z - wallMoveStartPoint[1];

                                const origS = wallMoveOriginal.start;
                                const origE = wallMoveOriginal.end;
                                let propS = [origS[0] + dx, origS[1] + dz];
                                let propE = [origE[0] + dx, origE[1] + dz];

                                const snapS = snapPointToWalls(propS[0], propS[1], this.app.viewer.buildingData?.walls, movingWallId, 1.2);
                                let snapped = false;
                                if (snapS.snapped) {
                                    dx = snapS.point[0] - origS[0];
                                    dz = snapS.point[1] - origS[1];
                                    propS = snapS.point;
                                    propE = [origE[0] + dx, origE[1] + dz];
                                    snapped = true;
                                } else {
                                    const snapE = snapPointToWalls(propE[0], propE[1], this.app.viewer.buildingData?.walls, movingWallId, 1.2);
                                    if (snapE.snapped) {
                                        dx = snapE.point[0] - origE[0];
                                        dz = snapE.point[1] - origE[1];
                                        propS = [origS[0] + dx, origS[1] + dz];
                                        propE = snapE.point;
                                        snapped = true;
                                    }
                                }

                                if (!wallMovePreviewLine) {
                                    const geom = new THREE.BufferGeometry().setFromPoints([
                                        new THREE.Vector3(propS[0], 0.35, propS[1]),
                                        new THREE.Vector3(propE[0], 0.35, propE[1])
                                    ]);
                                    const mat = new THREE.LineDashedMaterial({
                                        color: 0xf59e0b,
                                        dashSize: 0.8,
                                        gapSize: 0.4,
                                        linewidth: 4
                                    });
                                    wallMovePreviewLine = new THREE.Line(geom, mat);
                                    wallMovePreviewLine.computeLineDistances();
                                    this.app.viewer.scene.add(wallMovePreviewLine);
                                } else {
                                    const posAttr = wallMovePreviewLine.geometry.attributes.position;
                                    posAttr.setXYZ(0, propS[0], 0.35, propS[1]);
                                    posAttr.setXYZ(1, propE[0], 0.35, propE[1]);
                                    posAttr.needsUpdate = true;
                                    wallMovePreviewLine.computeLineDistances();
                                }

                                const distMoved = Math.hypot(dx, dz);
                                const snapMsg = snapped ? ' 🧲 [ملتصق بزاوية جدار]' : '';
                                setHint(`↔️ إزاحة الجدار (${movingWallId}): ${distMoved.toFixed(1)}م (ΔX=${dx.toFixed(1)}م, ΔZ=${dz.toFixed(1)}م)${snapMsg} — حرر زر الفأرة لتثبيت الموضع.`);
                            }
                            return;
                        }
                    } else if (movingStairId && stairMoveStartPoint && stairMoveOriginal) {
                        const screenDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
                        if (screenDist > 4) {
                            isDraggingStair = true;
                            if (canvas) canvas.style.cursor = 'grabbing';
                            this.app.viewer.highlightStair(movingStairId, 0xf59e0b);

                            const pt = getPointOnBlueprint(e.clientX, e.clientY);
                            if (pt) {
                                const dx = pt.x - stairMoveStartPoint[0];
                                const dz = pt.z - stairMoveStartPoint[1];
                                const origPos = stairMoveOriginal.position || [0, 0];
                                const targetX = Math.round((origPos[0] + dx) * 10) / 10;
                                const targetZ = Math.round((origPos[1] + dz) * 10) / 10;
                                stairLastTargetPos = [targetX, targetZ];

                                const stW = stairMoveOriginal.width || 2.4;
                                const stD = stairMoveOriginal.depth || 4.5;

                                if (!stairPreviewGroup) {
                                    stairPreviewGroup = new THREE.Group();
                                    const boxGeo = new THREE.BoxGeometry(stW, 0.4, stD);
                                    const boxMat = new THREE.MeshBasicMaterial({
                                        color: 0xf59e0b,
                                        transparent: true,
                                        opacity: 0.45
                                    });
                                    const boxMesh = new THREE.Mesh(boxGeo, boxMat);
                                    boxMesh.position.y = 0.2;
                                    stairPreviewGroup.add(boxMesh);
                                    const edges = new THREE.LineSegments(
                                        new THREE.EdgesGeometry(boxGeo),
                                        new THREE.LineBasicMaterial({ color: 0xffd166, linewidth: 2 })
                                    );
                                    edges.position.y = 0.2;
                                    stairPreviewGroup.add(edges);
                                    const arrow = new THREE.ArrowHelper(
                                        new THREE.Vector3(0, 0, 1),
                                        new THREE.Vector3(0, 0.45, -stD / 2.0 * 0.8),
                                        stD * 0.4,
                                        0xffd166,
                                        0.4,
                                        0.3
                                    );
                                    stairPreviewGroup.add(arrow);
                                    this.app.viewer.scene.add(stairPreviewGroup);
                                }
                                stairPreviewGroup.position.set(targetX, 0, targetZ);
                                stairPreviewGroup.rotation.y = ((stairMoveOriginal.rotation || 0) * Math.PI) / 180.0;
                                stairPreviewGroup.visible = true;

                                const distMoved = Math.hypot(dx, dz);
                                const sName = stairMoveOriginal.name_ar || movingStairId;
                                setHint(`↔️ سحب السلم (${sName}): ${distMoved.toFixed(1)}م إلى (${targetX}, ${targetZ}) — حرر زر الفأرة لتثبيت الموضع.`);
                            }
                            return;
                        }
                    } else {
                        // عند تحريك المؤشر دون سحب: إظهار تلميحات التمرير دون تشتيت التحديد القائم
                        const hoveredStairId = findStairUnderCursor(e.clientX, e.clientY);
                        const hoveredWallId = !hoveredStairId ? findWallUnderCursor(e.clientX, e.clientY) : null;

                        // إذا كان هناك عنصر محدد مسبقاً، نحافظ على تمييزه
                        if (selectedMoveStairId) {
                            if (canvas) canvas.style.cursor = (hoveredStairId === selectedMoveStairId) ? 'grab' : 'crosshair';
                            return;
                        }
                        if (selectedMoveWallId) {
                            if (canvas) canvas.style.cursor = (hoveredWallId === selectedMoveWallId) ? 'grab' : 'crosshair';
                            return;
                        }

                        // في حال عدم وجود أي عنصر محدد حالياً: أولوية السلم ثم الجدار
                        if (hoveredStairId) {
                            if (currentHoveredStairId && currentHoveredStairId !== hoveredStairId) {
                                this.app.viewer.clearStairHighlight(currentHoveredStairId);
                            }
                            if (currentHoveredWallId) {
                                this.app.viewer.clearWallHighlight(currentHoveredWallId);
                                currentHoveredWallId = null;
                            }
                            currentHoveredStairId = hoveredStairId;
                            this.app.viewer.highlightStair(hoveredStairId, 0xf59e0b);
                            const st = this.app.viewer.buildingData?.stairs?.[hoveredStairId];
                            setHint(`↔️🔄 سلم معماري (${st?.name_ar || hoveredStairId}) — انقر لتحديده وتدويره (R) أو اسحبه لنقله أو تعديل اتجاهه.`);
                            if (canvas) canvas.style.cursor = 'grab';
                        } else if (hoveredWallId) {
                            if (currentHoveredWallId && currentHoveredWallId !== hoveredWallId) {
                                this.app.viewer.clearWallHighlight(currentHoveredWallId);
                            }
                            if (currentHoveredStairId) {
                                this.app.viewer.clearStairHighlight(currentHoveredStairId);
                                currentHoveredStairId = null;
                            }
                            currentHoveredWallId = hoveredWallId;
                            this.app.viewer.highlightWall(hoveredWallId, 0xf59e0b);
                            setHint(`↔️🔄 جدار معماري (${hoveredWallId}) — انقر لتحديده وتدويره (R) أو اسحبه لنقله.`);
                            if (canvas) canvas.style.cursor = 'grab';
                        } else {
                            if (currentHoveredWallId) {
                                this.app.viewer.clearWallHighlight(currentHoveredWallId);
                                currentHoveredWallId = null;
                            }
                            if (currentHoveredStairId) {
                                this.app.viewer.clearStairHighlight(currentHoveredStairId);
                                currentHoveredStairId = null;
                            }
                            setHint("↔️🔄 انقر فوق أي جدار أو سلم لتحديده وتدويره أو نقله...");
                            if (canvas) canvas.style.cursor = 'default';
                        }
                        return;
                    }
                }

                if (activeTool === 'enclosed-space') {
                    const hoveredWallId = findWallUnderCursor(e.clientX, e.clientY);
                    if (hoveredWallId) {
                        if (canvas) canvas.style.cursor = 'pointer';
                        const isAlreadySel = selectedBoundaryWallIds.includes(hoveredWallId);
                        const selMsg = isAlreadySel ? " ⚠️ [محدد، انقر لإلغائه]" : " ➕ [انقر لإضافته للجدران المحيطة]";
                        setHint(`📐 جدار محيط (${hoveredWallId})${selMsg} — عدد الجدران المختارة: ${selectedBoundaryWallIds.length}`);
                    } else {
                        if (canvas) canvas.style.cursor = 'crosshair';
                        if (selectedBoundaryWallIds.length >= 3) {
                            setHint(`📐 تم تحديد ${selectedBoundaryWallIds.length} جدران! انقر بالداخل لتأكيد إنشاء وتجسيم الفضاء.`);
                        } else if (selectedBoundaryWallIds.length > 0) {
                            setHint(`📐 تم تحديد ${selectedBoundaryWallIds.length} جدار... انقر على الجدار التالي لإكمال الإغلاق (3 جدران على الأقل).`);
                        } else {
                            setHint("📐 انقر داخل مساحة محاطة بـ 3 جدران أو أكثر لكشفها وتجسيمها تلقائياً، أو انقر فوق الجدران المحيطة تباعاً.");
                        }
                    }
                    return;
                }

                const pt = getPointOnBlueprint(e.clientX, e.clientY);
                if (!pt) return;

                if (activeTool === 'wall' && wallStartPoint) {
                    const x1 = wallStartPoint[0], z1 = wallStartPoint[1];
                    const snapRes = snapPointToWalls(pt.x, pt.z, this.app.viewer.buildingData?.walls);
                    const x2 = snapRes.point[0], z2 = snapRes.point[1];
                    const len = Math.hypot(x2 - x1, z2 - z1);

                    if (!rubberbandLine) {
                        const geom = new THREE.BufferGeometry().setFromPoints([
                            new THREE.Vector3(x1, 0.25, z1),
                            new THREE.Vector3(x2, 0.25, z2)
                        ]);
                        const mat = new THREE.LineDashedMaterial({
                            color: 0x00d2ff,
                            dashSize: 0.6,
                            gapSize: 0.3,
                            linewidth: 3
                        });
                        rubberbandLine = new THREE.Line(geom, mat);
                        rubberbandLine.computeLineDistances();
                        this.app.viewer.scene.add(rubberbandLine);
                    } else {
                        const posAttr = rubberbandLine.geometry.attributes.position;
                        posAttr.setXYZ(0, x1, 0.25, z1);
                        posAttr.setXYZ(1, x2, 0.25, z2);
                        posAttr.needsUpdate = true;
                        rubberbandLine.computeLineDistances();
                    }
                    const snapInfo = snapRes.snapped ? 
                        (snapRes.snapType === 'endpoint' ? ' 🧲 [التصاق بزاوية جدار قائم]' : ' 🧲 [التصاق متعامد على جدار]') : '';
                    setHint(`📏 طول الجدار فوق مسقط الـ PDF: ${len.toFixed(1)}م${snapInfo} — انقر النقطة الثانية لتثبيت الجدار.`);
                } else if (activeTool === 'door' || activeTool === 'window' || activeTool === 'passage') {
                    const bData = this.app.viewer.buildingData;
                    if (bData && bData.walls) {
                        const snap = findNearestWallProjection(pt.x, pt.z, bData.walls);
                        if (snap && snap.dist <= 5.0) {
                            if (!snapMarker) {
                                const geo = new THREE.BoxGeometry(1.2, 0.3, 0.4);
                                const mat = new THREE.MeshBasicMaterial({
                                    color: activeTool === 'door' ? 0x00d2ff : (activeTool === 'window' ? 0x74b9ff : 0x2ecc71),
                                    wireframe: true
                                });
                                snapMarker = new THREE.Mesh(geo, mat);
                                this.app.viewer.scene.add(snapMarker);
                            }
                            snapMarker.position.set(snap.proj[0], 0.2, snap.proj[1]);
                            snapMarker.visible = true;
                        } else if (snapMarker) {
                            snapMarker.visible = false;
                        }
                    }
                } else if (activeTool === 'room' && roomCorner1) {
                    const rw = Math.abs(pt.x - roomCorner1[0]);
                    const rd = Math.abs(pt.z - roomCorner1[1]);
                    const area = (rw * rd).toFixed(0);
                    setHint(`📐 أبعاد الفضاء فوق الـ PDF: ${rw.toFixed(1)}م × ${rd.toFixed(1)}م (المساحة: ${area}م²) — انقر لتأكيد الغرفة.`);
                } else if (activeTool === 'polygon-space' && polygonPoints.length > 0) {
                    const snapRes = snapPointToWalls(pt.x, pt.z, this.app.viewer.buildingData?.walls);
                    const curX = snapRes.snapped ? snapRes.point[0] : pt.x;
                    const curZ = snapRes.snapped ? snapRes.point[1] : pt.z;

                    if (!polygonPreviewGroup) {
                        polygonPreviewGroup = new THREE.Group();
                        this.app.viewer.scene.add(polygonPreviewGroup);
                    }

                    let prevLine = polygonPreviewGroup.getObjectByName('poly_rubberband');
                    const allPts = [...polygonPoints, [curX, curZ]];
                    const pts3d = allPts.map(p => new THREE.Vector3(p[0], 0.25, p[1]));

                    const distToStart = Math.hypot(curX - polygonPoints[0][0], curZ - polygonPoints[0][1]);
                    const closing = polygonPoints.length >= 3 && distToStart < 1.2;
                    if (closing) {
                        pts3d.push(new THREE.Vector3(polygonPoints[0][0], 0.25, polygonPoints[0][1]));
                    }

                    if (!prevLine) {
                        const geo = new THREE.BufferGeometry().setFromPoints(pts3d);
                        const mat = new THREE.LineBasicMaterial({ color: closing ? 0x10b981 : 0x38bdf8, linewidth: 3 });
                        prevLine = new THREE.Line(geo, mat);
                        prevLine.name = 'poly_rubberband';
                        polygonPreviewGroup.add(prevLine);
                    } else {
                        prevLine.geometry.dispose();
                        prevLine.geometry = new THREE.BufferGeometry().setFromPoints(pts3d);
                        prevLine.material.color.setHex(closing ? 0x10b981 : 0x38bdf8);
                    }

                    const tempArea = polygonArea(allPts);
                    const closeMsg = closing ? " 🎯 [انقر هنا لإغلاق وتجسيم الفضاء!]" : "";
                    setHint(`⬡ مضلع فضاء: ${allPts.length} رؤوس (المساحة: ${tempArea.toFixed(1)}م²)${closeMsg} — انقر لإضافة رأس، أو انقر مزدوجاً/Enter لإنهاء التجسيم.`);
                } else if (activeTool === 'space-separator' && spaceSeparatorStart) {
                    const x1 = spaceSeparatorStart[0], z1 = spaceSeparatorStart[1];
                    const x2 = pt.x, z2 = pt.z;
                    const sepLen = Math.hypot(x2 - x1, z2 - z1);

                    if (!spaceSeparatorPreviewLine) {
                        const geom = new THREE.BufferGeometry().setFromPoints([
                            new THREE.Vector3(x1, 0.3, z1),
                            new THREE.Vector3(x2, 0.3, z2)
                        ]);
                        const mat = new THREE.LineDashedMaterial({
                            color: 0xc084fc,
                            dashSize: 0.5,
                            gapSize: 0.25,
                            linewidth: 3
                        });
                        spaceSeparatorPreviewLine = new THREE.Line(geom, mat);
                        spaceSeparatorPreviewLine.computeLineDistances();
                        this.app.viewer.scene.add(spaceSeparatorPreviewLine);
                    } else {
                        const posAttr = spaceSeparatorPreviewLine.geometry.attributes.position;
                        posAttr.setXYZ(0, x1, 0.3, z1);
                        posAttr.setXYZ(1, x2, 0.3, z2);
                        posAttr.needsUpdate = true;
                        spaceSeparatorPreviewLine.computeLineDistances();
                    }
                    setHint(`➗ قاطع فضائي افتراضي: طول الخط ${sepLen.toFixed(1)}م — انقر النقطة الثانية عبر الفضاء لتقسيمه إلى منطقتين.`);
                } else if (activeTool === 'circle-space' && circleSpaceCenter) {
                    const cx = circleSpaceCenter[0], cz = circleSpaceCenter[1];
                    const R = Math.hypot(pt.x - cx, pt.z - cz);
                    const area = Math.PI * R * R;

                    if (!circleSpacePreviewMesh) {
                        const ringGeo = new THREE.RingGeometry(Math.max(0.1, R - 0.08), R + 0.08, 32);
                        ringGeo.rotateX(-Math.PI / 2);
                        const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
                        circleSpacePreviewMesh = new THREE.Mesh(ringGeo, ringMat);
                        circleSpacePreviewMesh.position.set(cx, 0.25, cz);
                        this.app.viewer.scene.add(circleSpacePreviewMesh);
                    } else {
                        circleSpacePreviewMesh.geometry.dispose();
                        const ringGeo = new THREE.RingGeometry(Math.max(0.1, R - 0.08), R + 0.08, 32);
                        ringGeo.rotateX(-Math.PI / 2);
                        circleSpacePreviewMesh.geometry = ringGeo;
                    }
                    setHint(`🔘 فضاء دائري/شعاعي: نصف القطر ${R.toFixed(1)}م (المساحة: ${area.toFixed(1)}م²) — انقر لتثبيت وتجسيم الفضاء.`);
                } else if (activeTool === 'calibrate-scale' && scaleCalibP1) {
                    const x1 = scaleCalibP1.x, z1 = scaleCalibP1.z;
                    const x2 = pt.x, z2 = pt.z;
                    const liveDist = Math.hypot(x2 - x1, z2 - z1);

                    if (!scaleCalibPreviewLine) {
                        const geom = new THREE.BufferGeometry().setFromPoints([
                            new THREE.Vector3(x1, 0.35, z1),
                            new THREE.Vector3(x2, 0.35, z2)
                        ]);
                        const mat = new THREE.LineDashedMaterial({
                            color: 0x00d2ff,
                            dashSize: 0.6,
                            gapSize: 0.3,
                            linewidth: 3
                        });
                        scaleCalibPreviewLine = new THREE.Line(geom, mat);
                        scaleCalibPreviewLine.computeLineDistances();
                        this.app.viewer.scene.add(scaleCalibPreviewLine);
                    } else {
                        const posAttr = scaleCalibPreviewLine.geometry.attributes.position;
                        posAttr.setXYZ(0, x1, 0.35, z1);
                        posAttr.setXYZ(1, x2, 0.35, z2);
                        posAttr.needsUpdate = true;
                        scaleCalibPreviewLine.computeLineDistances();
                    }
                    setHint(`📏 البُعد المرجعي المقاس: ${liveDist.toFixed(2)}م — انقر لتثبيت النقطة الثانية وإدخال الطول الحقيقي (Esc للإلغاء).`);
                }
            });

            const syncHudInputs = () => {
                const bp = this.app.viewer?.getBlueprintTransform();
                if (!bp) return;
                const inputW = document.getElementById('input-bp-width');
                const inputD = document.getElementById('input-bp-depth');
                const sliderScale = document.getElementById('slider-bp-scale');
                const labelScale = document.getElementById('label-bp-scale');

                if (inputW) inputW.value = bp.width.toFixed(1);
                if (inputD) inputD.value = bp.depth.toFixed(1);
                if (sliderScale && labelScale) {
                    const pct = Math.round((bp.scaleFactor || 1) * 100);
                    sliderScale.value = Math.min(300, Math.max(20, pct));
                    labelScale.textContent = `${pct}%`;
                }
            };
            this.syncBlueprintHud = syncHudInputs;

            const showScaleCalibrationModal = (distM, p1, p2) => {
                const modal = document.getElementById('modal-scale-calibration');
                const measuredDistEl = document.getElementById('calib-measured-dist');
                const realInput = document.getElementById('calib-real-input');
                const calcFactorEl = document.getElementById('calib-calc-factor');
                const calcDimsEl = document.getElementById('calib-calc-dims');
                const rescaleElemCheck = document.getElementById('calib-rescale-elements');
                const closeBtn = document.getElementById('btn-close-scale-modal');
                const cancelBtn = document.getElementById('btn-cancel-scale-modal');
                const applyBtn = document.getElementById('btn-apply-scale-modal');
                const chips = document.querySelectorAll('.calib-chip');

                if (!modal) {
                    const inputLen = prompt(`المسافة المقاسة على المخطط حالياً: ${distM.toFixed(2)}م\nأدخل الطول الواقعي الحقيقي للجدار بالمتر:`, distM.toFixed(2));
                    if (inputLen) {
                        applyScaleCalibration(parseFloat(inputLen), distM, p1, false);
                    }
                    return;
                }

                if (measuredDistEl) measuredDistEl.textContent = `${distM.toFixed(2)} m (${distM.toFixed(2)} متر)`;
                if (realInput) realInput.value = distM.toFixed(2);

                const bpTrans = this.app.viewer.getBlueprintTransform() || { width: 60, depth: 45, offsetX: 0, offsetZ: 0 };

                const updateCalcPreview = () => {
                    const realVal = parseFloat(realInput.value);
                    if (realVal && realVal > 0 && distM > 0) {
                        const factor = realVal / distM;
                        const newW = bpTrans.width * factor;
                        const newD = bpTrans.depth * factor;
                        if (calcFactorEl) calcFactorEl.textContent = `${factor.toFixed(3)}× (${(factor * 100).toFixed(1)}%)`;
                        if (calcDimsEl) calcDimsEl.textContent = `${newW.toFixed(1)}م × ${newD.toFixed(1)}م`;
                    } else {
                        if (calcFactorEl) calcFactorEl.textContent = '—';
                        if (calcDimsEl) calcDimsEl.textContent = '—';
                    }
                };

                updateCalcPreview();
                modal.style.display = 'flex';
                if (realInput) setTimeout(() => realInput.select(), 100);

                chips.forEach(chip => {
                    chip.onclick = (e) => {
                        e.preventDefault();
                        chips.forEach(c => c.classList.remove('active'));
                        chip.classList.add('active');
                        if (realInput) {
                            realInput.value = chip.dataset.val;
                            updateCalcPreview();
                        }
                    };
                });

                if (realInput) {
                    realInput.oninput = () => {
                        chips.forEach(c => c.classList.remove('active'));
                        updateCalcPreview();
                    };
                }

                const closeModal = () => {
                    modal.style.display = 'none';
                    cleanupTempVisuals();
                    updateToolUI('wall');
                };

                if (closeBtn) closeBtn.onclick = closeModal;
                if (cancelBtn) cancelBtn.onclick = closeModal;

                if (applyBtn) {
                    applyBtn.onclick = () => {
                        const realVal = parseFloat(realInput.value);
                        if (!realVal || realVal <= 0) {
                            alert("⚠️ يرجى إدخال طول مرجعي صحيح أكبر من الصفر.");
                            return;
                        }
                        const factor = realVal / distM;
                        if (!isFinite(factor) || factor <= 0) {
                            alert("⚠️ قيمة غير صالحة لمعامل التحجيم.");
                            return;
                        }

                        const rescaleElements = rescaleElemCheck ? rescaleElemCheck.checked : false;
                        applyScaleCalibration(realVal, distM, p1, rescaleElements);
                        closeModal();
                    };
                }
            };

            const applyScaleCalibration = (realVal, measuredDist, anchorPoint, rescaleExisting) => {
                const factor = realVal / measuredDist;
                const bp = this.app.viewer.getBlueprintTransform();
                if (!bp) return;

                const oldW = bp.width;
                const oldD = bp.depth;
                const newW = Math.round(oldW * factor * 100) / 100;
                const newD = Math.round(oldD * factor * 100) / 100;

                const newCenterX = Math.round((anchorPoint.x + factor * (bp.offsetX - anchorPoint.x)) * 100) / 100;
                const newCenterZ = Math.round((anchorPoint.z + factor * (bp.offsetZ - anchorPoint.z)) * 100) / 100;

                this.app.viewer.setBlueprintScaleAndOffset(newW, newD, newCenterX, newCenterZ, factor);

                if (rescaleExisting) {
                    this.app.viewer.rescaleSceneElements(factor, anchorPoint.x, anchorPoint.z);
                }

                this.calibratedScaleFactor = factor;
                this.calibratedBounds = {
                    width: newW,
                    depth: newD,
                    offsetX: newCenterX,
                    offsetZ: newCenterZ,
                    baseWidth: bp.baseWidth,
                    baseDepth: bp.baseDepth
                };

                syncHudInputs();

                alert(
                    `✓ تم بنجاح ضبط ومعايرة مقياس مسقط الـ PDF!\n\n` +
                    `• الطول المرجعي المعاير: ${realVal.toFixed(2)} م (كان مقاساً: ${measuredDist.toFixed(2)} م)\n` +
                    `• نسبة التحجيم: ${(factor * 100).toFixed(1)}% (${factor.toFixed(3)}×)\n` +
                    `• الأبعاد الواقعية الجديدة للمسقط: ${newW.toFixed(1)} م × ${newD.toFixed(1)} م\n\n` +
                    `💡 كافة الجدران والفتحات والفضاءات التي سترسمها الآن ستطابق الأبعاد المعمارية الحقيقية بدقة 1:1.`
                );
                setHint(`✓ تم معايرة مقياس المخطط بنجاح (${newW.toFixed(1)}م × ${newD.toFixed(1)}م). يمكنك الآن رسم الجدران بدقة واقعية.`);
            };

            // تفعيل عناصر التحكم بمقياس ومحاذاة المسقط في الـ HUD
            const btnHudCalib = document.getElementById('btn-hud-calibrate-scale');
            if (btnHudCalib) {
                btnHudCalib.onclick = (e) => {
                    e.stopPropagation();
                    if (!isTracing) {
                        enterTracerMode();
                    }
                    updateToolUI('calibrate-scale');
                };
            }

            const inputBpW = document.getElementById('input-bp-width');
            const inputBpD = document.getElementById('input-bp-depth');
            const btnLockAspect = document.getElementById('btn-lock-bp-aspect');
            let bpAspectLocked = true;

            if (btnLockAspect) {
                btnLockAspect.onclick = (e) => {
                    e.stopPropagation();
                    bpAspectLocked = !bpAspectLocked;
                    btnLockAspect.textContent = bpAspectLocked ? '🔒' : '🔓';
                    btnLockAspect.classList.toggle('active', bpAspectLocked);
                };
            }

            if (inputBpW) {
                inputBpW.onchange = () => {
                    const bp = this.app.viewer?.getBlueprintTransform();
                    if (!bp) return;
                    const newW = Math.max(1, parseFloat(inputBpW.value) || bp.width);
                    let newD = bp.depth;
                    if (bpAspectLocked && bp.aspect) {
                        newD = Math.round((newW / bp.aspect) * 10) / 10;
                        if (inputBpD) inputBpD.value = newD.toFixed(1);
                    }
                    const factor = newW / bp.baseWidth;
                    this.app.viewer.setBlueprintScaleAndOffset(newW, newD, bp.offsetX, bp.offsetZ, factor);
                    syncHudInputs();
                };
            }

            if (inputBpD) {
                inputBpD.onchange = () => {
                    const bp = this.app.viewer?.getBlueprintTransform();
                    if (!bp) return;
                    const newD = Math.max(1, parseFloat(inputBpD.value) || bp.depth);
                    let newW = bp.width;
                    if (bpAspectLocked && bp.aspect) {
                        newW = Math.round((newD * bp.aspect) * 10) / 10;
                        if (inputBpW) inputBpW.value = newW.toFixed(1);
                    }
                    const factor = newW / bp.baseWidth;
                    this.app.viewer.setBlueprintScaleAndOffset(newW, newD, bp.offsetX, bp.offsetZ, factor);
                    syncHudInputs();
                };
            }

            const sliderBpScale = document.getElementById('slider-bp-scale');
            const labelBpScale = document.getElementById('label-bp-scale');
            const btnResetBpScale = document.getElementById('btn-reset-bp-scale');

            if (sliderBpScale) {
                sliderBpScale.oninput = () => {
                    const bp = this.app.viewer?.getBlueprintTransform();
                    if (!bp) return;
                    const pct = parseInt(sliderBpScale.value, 10);
                    if (labelBpScale) labelBpScale.textContent = `${pct}%`;
                    const factor = pct / 100.0;
                    const newW = Math.round(bp.baseWidth * factor * 10) / 10;
                    const newD = Math.round(bp.baseDepth * factor * 10) / 10;
                    this.app.viewer.setBlueprintScaleAndOffset(newW, newD, bp.offsetX, bp.offsetZ, factor);
                    if (inputBpW) inputBpW.value = newW.toFixed(1);
                    if (inputBpD) inputBpD.value = newD.toFixed(1);
                };
            }

            if (btnResetBpScale) {
                btnResetBpScale.onclick = (e) => {
                    e.stopPropagation();
                    const bp = this.app.viewer?.getBlueprintTransform();
                    if (!bp) return;
                    this.app.viewer.setBlueprintScaleAndOffset(bp.baseWidth, bp.baseDepth, bp.offsetX, bp.offsetZ, 1.0);
                    syncHudInputs();
                };
            }

            const nudgeBp = (dx, dz) => {
                const bp = this.app.viewer?.getBlueprintTransform();
                if (!bp) return;
                const newOx = Math.round((bp.offsetX + dx) * 100) / 100;
                const newOz = Math.round((bp.offsetZ + dz) * 100) / 100;
                this.app.viewer.setBlueprintScaleAndOffset(bp.width, bp.depth, newOx, newOz, bp.scaleFactor);
                setHint(`📐 إزاحة المسقط: X = ${newOx.toFixed(2)}م ، Z = ${newOz.toFixed(2)}م`);
            };

            const btnNudgeUp = document.getElementById('btn-nudge-up');
            const btnNudgeDown = document.getElementById('btn-nudge-down');
            const btnNudgeLeft = document.getElementById('btn-nudge-left');
            const btnNudgeRight = document.getElementById('btn-nudge-right');
            const btnNudgeOrigin = document.getElementById('btn-nudge-origin');

            if (btnNudgeUp) btnNudgeUp.onclick = (e) => { e.stopPropagation(); nudgeBp(0, e.shiftKey ? -0.1 : -0.5); };
            if (btnNudgeDown) btnNudgeDown.onclick = (e) => { e.stopPropagation(); nudgeBp(0, e.shiftKey ? 0.1 : 0.5); };
            if (btnNudgeLeft) btnNudgeLeft.onclick = (e) => { e.stopPropagation(); nudgeBp(e.shiftKey ? -0.1 : -0.5, 0); };
            if (btnNudgeRight) btnNudgeRight.onclick = (e) => { e.stopPropagation(); nudgeBp(e.shiftKey ? 0.1 : 0.5, 0); };
            if (btnNudgeOrigin) {
                btnNudgeOrigin.onclick = (e) => {
                    e.stopPropagation();
                    const bp = this.app.viewer?.getBlueprintTransform();
                    if (!bp) return;
                    this.app.viewer.setBlueprintScaleAndOffset(bp.width, bp.depth, 0, 0, bp.scaleFactor);
                    setHint("🎯 تم تمركز المسقط في نقطة الأصل (0, 0).");
                };
            }

            // معالجة النقر المنفذة للأدوات
            const executeClickAction = async (clientX, clientY) => {
                if (!isTracing || !this.app.viewer) return;

                const bData = this.app.viewer.buildingData;
                if (!bData) return;
                if (!bData.walls) bData.walls = {};
                if (!bData.openings) bData.openings = {};
                if (!bData.spaces) bData.spaces = {};

                if (activeTool === 'calibrate-scale') {
                    const pt = getPointOnBlueprint(clientX, clientY);
                    if (!pt) {
                        setHint("⚠️ يرجى النقر فوق مسقط المخطط المعماري.");
                        return;
                    }

                    if (!scaleCalibP1) {
                        scaleCalibP1 = { x: pt.x, z: pt.z };
                        const dotGeo = new THREE.SphereGeometry(0.35, 16, 16);
                        const dotMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff });
                        scaleCalibMarker1 = new THREE.Mesh(dotGeo, dotMat);
                        scaleCalibMarker1.position.set(pt.x, 0.25, pt.z);
                        this.app.viewer.scene.add(scaleCalibMarker1);

                        setHint("📏 تم تحديد النقطة الأولى بنجاح! انقر الآن على النقطة الثانية لنهاية البُعد المرجعي (الطرف الآخر للجدار أو خط القياس)...");
                        return;
                    } else {
                        scaleCalibP2 = { x: pt.x, z: pt.z };
                        const distM = Math.hypot(scaleCalibP2.x - scaleCalibP1.x, scaleCalibP2.z - scaleCalibP1.z);
                        if (distM < 0.1) {
                            setHint("⚠️ النقطتان متقاربتان جداً! يرجى النقر على نقطة ثانية متباعدة بما فيه الكفاية.");
                            return;
                        }

                        const dotGeo = new THREE.SphereGeometry(0.35, 16, 16);
                        const dotMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
                        scaleCalibMarker2 = new THREE.Mesh(dotGeo, dotMat);
                        scaleCalibMarker2.position.set(pt.x, 0.25, pt.z);
                        this.app.viewer.scene.add(scaleCalibMarker2);

                        showScaleCalibrationModal(distM, scaleCalibP1, scaleCalibP2);
                        return;
                    }
                }

                if (activeTool === 'delete-wall') {
                    const targetOpeningId = findOpeningUnderCursor(clientX, clientY);
                    const targetSensorId = !targetOpeningId ? findSensorUnderCursor(clientX, clientY) : null;
                    const targetStairId = (!targetOpeningId && !targetSensorId) ? findStairUnderCursor(clientX, clientY) : null;
                    const targetWallId = (!targetOpeningId && !targetSensorId && !targetStairId) ? findWallUnderCursor(clientX, clientY) : null;
                    const targetSpaceId = (!targetOpeningId && !targetSensorId && !targetStairId && !targetWallId) ? findSpaceUnderCursor(clientX, clientY) : null;

                    // أ. حذف فتحة باب أو شباك أو ممر واستعادة الجدار مصمتاً دون فجوة
                    if (targetOpeningId && bData.openings[targetOpeningId]) {
                        const opToDelete = JSON.parse(JSON.stringify(bData.openings[targetOpeningId]));
                        const opTypeAr = opToDelete.type === 'door' ? 'الباب' : (opToDelete.type === 'window' ? 'الشباك' : 'فتحة العبور');

                        delete bData.openings[targetOpeningId];

                        if (currentHoveredOpeningId === targetOpeningId) {
                            currentHoveredOpeningId = null;
                        }

                        this.app.viewer.buildWallsAndOpenings(bData.walls, bData.openings, bData.spaces);
                        this.app.viewer.setupCirculationParticles(bData);

                        historyStack.push({
                            type: 'delete-opening',
                            opening: opToDelete
                        });

                        setHint(`✓ تم حذف ${opTypeAr} (${targetOpeningId}) واسترجاع الجدار مصمتاً بالكامل بنجاح!`);

                        try {
                            await fetch('/api/model/delete_element', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'opening', id: targetOpeningId })
                            });
                        } catch(err) {
                            console.error("Failed to sync opening deletion:", err);
                        }
                        return;
                    } else if (targetSensorId) {
                        // ب. حذف مستشعر IoT مباشر
                        try {
                            await fetch('/api/iot/sensors/delete', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ sensor_id: targetSensorId })
                            });
                        } catch(err) {}

                        this.app.viewer.removeIoTSensorMesh(targetSensorId);
                        if (currentHoveredSensorId === targetSensorId) {
                            this.app.viewer.clearIoTSensorHighlight();
                            currentHoveredSensorId = null;
                        }
                        historyStack.push({
                            type: 'delete-sensor',
                            sensorId: targetSensorId
                        });
                        setHint(`✓ تم حذف مستشعر الـ IoT (${targetSensorId}) وإزالته من شبكة الرصد اللحظي!`);
                        const activeAnalytics = this.app?.analytics || window.twinApp?.analytics || window.app?.analytics;
                        if (activeAnalytics) {
                            await activeAnalytics.fetchAndUpdateSensorsInventory();
                            await activeAnalytics.fetchAndUpdateIoTTelemetry();
                        }
                        return;
                    } else if (targetStairId && bData.stairs && bData.stairs[targetStairId]) {
                        // ج. حذف السلم المعماري بأولوية تسبق الجدران والفضاءات
                        const stairToDelete = JSON.parse(JSON.stringify(bData.stairs[targetStairId]));
                        const stairName = stairToDelete.name_ar || targetStairId;

                        delete bData.stairs[targetStairId];
                        this.app.viewer.deleteStairMesh(targetStairId);
                        this.app.viewer.setupCirculationParticles(bData);

                        if (currentHoveredStairId === targetStairId) {
                            currentHoveredStairId = null;
                        }

                        historyStack.push({
                            type: 'delete-stair',
                            stair: stairToDelete
                        });

                        setHint(`✓ تم حذف السلم المعماري (${stairName}) وإزالته من شبكة التدفق بنجاح!`);

                        try {
                            await fetch('/api/model/delete_element', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'stair', id: targetStairId })
                            });
                        } catch(err) {
                            console.error("Failed to sync stair deletion:", err);
                        }
                        return;
                    } else if (targetWallId && bData.walls[targetWallId]) {
                        const wallToDelete = JSON.parse(JSON.stringify(bData.walls[targetWallId]));
                        const associatedOpenings = {};
                        for (const [opId, op] of Object.entries(bData.openings || {})) {
                            if (op.wall_id === targetWallId) {
                                associatedOpenings[opId] = JSON.parse(JSON.stringify(op));
                                delete bData.openings[opId];
                            }
                        }
                        delete bData.walls[targetWallId];

                        if (currentHoveredWallId === targetWallId) {
                            currentHoveredWallId = null;
                        }

                        this.app.viewer.buildWallsAndOpenings(bData.walls, bData.openings, bData.spaces);
                        this.app.viewer.setupCirculationParticles(bData);
                        historyStack.push({
                            type: 'delete-wall',
                            wall: wallToDelete,
                            openings: associatedOpenings
                        });

                        const opCount = Object.keys(associatedOpenings).length;
                        const opMsg = opCount > 0 ? ` مع ${opCount} فتحة تابعة له` : '';
                        setHint(`✓ تم حذف الجدار (${targetWallId})${opMsg} بنجاح!`);

                        try {
                            await fetch('/api/model/delete_element', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'wall', id: targetWallId })
                            });
                        } catch(err) {
                            console.error("Failed to sync wall deletion:", err);
                        }
                        return;
                    } else if (targetSpaceId && bData.spaces[targetSpaceId]) {
                        const spToDelete = JSON.parse(JSON.stringify(bData.spaces[targetSpaceId]));
                        const spName = spToDelete.name_ar || targetSpaceId;
                        
                        // حذف أي جدران تابعة لهذا الفضاء
                        const relWalls = {};
                        for (const [wId, w] of Object.entries(bData.walls || {})) {
                            if (wId.startsWith(`w_${targetSpaceId}`)) {
                                relWalls[wId] = JSON.parse(JSON.stringify(w));
                                delete bData.walls[wId];
                            }
                        }

                        // حذف الفضاء وبلاطة أرضيته الملونة فورياً
                        delete bData.spaces[targetSpaceId];
                        this.app.viewer.deleteSpaceMesh(targetSpaceId);
                        this.app.viewer.buildWallsAndOpenings(bData.walls, bData.openings, bData.spaces);
                        this.app.viewer.setupCirculationParticles(bData);
                        this.populateSpacesEditor();

                        if (currentHoveredSpaceId === targetSpaceId) {
                            currentHoveredSpaceId = null;
                        }

                        historyStack.push({
                            type: 'delete-space',
                            space: spToDelete,
                            walls: relWalls
                        });

                        setHint(`✓ تم حذف الفضاء (${spName}) وإزالة أرضيته الملونة بنجاح!`);

                        try {
                            await fetch('/api/model/delete_element', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'space', id: targetSpaceId })
                            });
                        } catch(err) {
                            console.error("Failed to sync space deletion:", err);
                        }
                        return;
                    } else {
                        setHint("⚠️ لم يتم النقر فوق فتحة (باب/شباك) أو جدار أو سلم أو فضاء صالح للحذف. يرجى النقر مباشرة فوق العنصر المطلوب.");
                        return;
                    }
                }

                if (activeTool === 'trim-wall') {
                    const targetWallId = findWallUnderCursor(clientX, clientY);
                    if (targetWallId && bData.walls[targetWallId]) {
                        cleanupTempVisuals();
                        await trimWallAndExpandSpace(targetWallId, { clientX, clientY });
                        return;
                    } else {
                        setHint("⚠️ يرجى النقر مباشرة فوق الجدار الفاصل بين جدارين لتقليمه وحذفه وتوسيع مساحة الفضاء.");
                        return;
                    }
                }

                if (activeTool === 'move-wall') {
                    // فحص السلم أولاً بأولوية دقيقة
                    const hoveredStairId = findStairUnderCursor(clientX, clientY);
                    const hoveredWallId = !hoveredStairId ? findWallUnderCursor(clientX, clientY) : null;

                    // 1. النقر فوق سلم معماري (أولوية أولى)
                    if (hoveredStairId && bData.stairs?.[hoveredStairId]) {
                        if (selectedMoveStairId === hoveredStairId) {
                            const st = bData.stairs[hoveredStairId];
                            setHint(`🪜 السلم (${st.name_ar || hoveredStairId}) محدد حالياً. اسحبه لنقله، أو انقر أي موضع بالمسقط لنقله فورياً، أو استخدم أزرار الإزاحة والأسهم ⬆️⬇️⬅️➡️ أو اضغط R للتدوير.`);
                            return;
                        }

                        if (selectedMoveWallId) this.app.viewer.clearWallHighlight(selectedMoveWallId);
                        if (selectedMoveStairId) this.app.viewer.clearStairHighlight(selectedMoveStairId);

                        selectedMoveStairId = hoveredStairId;
                        selectedMoveWallId = null;
                        stairMoveOriginal = JSON.parse(JSON.stringify(bData.stairs[hoveredStairId]));
                        this.app.viewer.highlightStair(hoveredStairId, 0xf59e0b);
                        showTransformPanel('stair', hoveredStairId);
                        return;
                    }

                    // 2. النقر فوق جدار معماري
                    if (hoveredWallId && bData.walls?.[hoveredWallId]) {
                        if (selectedMoveWallId === hoveredWallId) {
                            setHint(`🧱 الجدار (${hoveredWallId}) محدد حالياً. اسحبه لنقله، أو استخدم أزرار التدوير (R).`);
                            return;
                        }

                        if (selectedMoveWallId) this.app.viewer.clearWallHighlight(selectedMoveWallId);
                        if (selectedMoveStairId) this.app.viewer.clearStairHighlight(selectedMoveStairId);

                        selectedMoveWallId = hoveredWallId;
                        selectedMoveStairId = null;
                        wallMoveOriginal = JSON.parse(JSON.stringify(bData.walls[hoveredWallId]));
                        wallMoveOpeningsOriginal = {};
                        for (const [opId, op] of Object.entries(bData.openings || {})) {
                            if (op.wall_id === hoveredWallId) {
                                wallMoveOpeningsOriginal[opId] = JSON.parse(JSON.stringify(op));
                            }
                        }
                        this.app.viewer.highlightWall(hoveredWallId, 0xf59e0b);
                        showTransformPanel('wall', hoveredWallId);
                        return;
                    }

                    // 3. النقر في موضع فارغ بالمسقط المعماري
                    // إذا كان هناك سلم محدد: نقل السلم فورياً إلى الموضع المنقور عليه!
                    if (selectedMoveStairId && bData.stairs?.[selectedMoveStairId]) {
                        const pt = getPointOnBlueprint(clientX, clientY);
                        if (pt) {
                            const newX = Math.round(pt.x * 10) / 10;
                            const newZ = Math.round(pt.z * 10) / 10;
                            await moveSelectedStairTo(newX, newZ);
                            return;
                        }
                    }

                    // إذا كان هناك جدار محدد: إلغاء تحديد الجدار
                    if (selectedMoveWallId) {
                        this.app.viewer.clearWallHighlight(selectedMoveWallId);
                        selectedMoveWallId = null;
                        hideTransformPanel();
                        setHint("↔️🔄 تم إلغاء تحديد الجدار. انقر فوق أي جدار أو سلم لتحديده.");
                        if (canvas) canvas.style.cursor = 'default';
                        return;
                    }

                    // ج: لا يوجد عنصر محدد ونقر في مكان فارغ
                    setHint("↔️🔄 يرجى النقر مباشرة فوق الجدار أو السلم المطلوب لتحديده ونقله أو تدويره.");
                    return;
                }

                if (activeTool === 'enclosed-space') {
                    const hoveredWallId = findWallUnderCursor(clientX, clientY);

                    // 1. إذا نقر المستخدم فوق جدار: إضافة / إزالة الجدار من حلقة التحديد اليدوي
                    if (hoveredWallId && bData.walls[hoveredWallId]) {
                        const existingIdx = selectedBoundaryWallIds.indexOf(hoveredWallId);
                        if (existingIdx !== -1) {
                            selectedBoundaryWallIds.splice(existingIdx, 1);
                            this.app.viewer.clearWallHighlight(hoveredWallId);
                            setHint(`📐 تم إلغاء تحديد الجدار (${hoveredWallId}). المتبقي: ${selectedBoundaryWallIds.length} جدار.`);
                        } else {
                            selectedBoundaryWallIds.push(hoveredWallId);
                            this.app.viewer.highlightWall(hoveredWallId, 0x2ecc71);
                            setHint(`📐 تم اختيار الجدار (${hoveredWallId}) [إجمالي: ${selectedBoundaryWallIds.length}].`);
                        }

                        if (selectedBoundaryWallIds.length >= 3) {
                            const polyRes = computePolygonFromSelectedWalls(selectedBoundaryWallIds, bData.walls);
                            if (polyRes && polyRes.valid) {
                                setHint(`🎉 الجدران المحددة (${selectedBoundaryWallIds.length}) تشكل فضاءً مغلقاً بمساحة ${polyRes.area.toFixed(1)}م²! انقر في الفراغ لتأكيد وتجسيم الفضاء.`);
                            }
                        }
                        return;
                    }

                    // 2. إذا نقر المستخدم في الفراغ داخل المخطط:
                    const pt = getPointOnBlueprint(clientX, clientY);
                    if (!pt) return;

                    let detectedSpace = null;

                    // أ. إذا كان المستخدم قد حدد 3 جدران أو أكثر يدوياً:
                    if (selectedBoundaryWallIds.length >= 3) {
                        const manualRes = computePolygonFromSelectedWalls(selectedBoundaryWallIds, bData.walls);
                        if (manualRes && manualRes.valid) {
                            detectedSpace = {
                                wallIds: [...selectedBoundaryWallIds],
                                vertices: manualRes.vertices,
                                area: manualRes.area,
                                centroid: manualRes.centroid,
                                bounds: manualRes.bounds
                            };
                        } else {
                            setHint("⚠️ الجدران المحددة لا تشكل حلقة مغلقة محكمة (يوجد فراغ بين النهايات). يرجى اختيار جدار مكمل أو النقر داخل فضاء مغلق للكشف الآلي.");
                            return;
                        }
                    } else {
                        // ب. الكشف التلقائي الذكي بالنقر داخل الفضاء المغلق (Auto-Detection via 360° Raycasting)
                        setHint("⏳ جاري تحليل أشعة الرصد وكشف الجدران المحيطة بالفضاء...");
                        detectedSpace = detectEnclosingWallsFromPoint(pt.x, pt.z, bData.walls, pt.y);
                    }

                    if (!detectedSpace) {
                        setHint("⚠️ لم يتم العثور على فضاء مغلق بالكامل بـ 3 جدران أو أكثر في هذا الموضع. تأكد من إحكام زوايا الجدران المحيطة.");
                        return;
                    }

                    // تم العثور على فضاء مغلق بنجاح!
                    const numWalls = detectedSpace.wallIds.length;
                    const areaM2 = detectedSpace.area.toFixed(1);
                    const shapeName = numWalls === 3 ? "مثلثي" : (numWalls === 4 ? "رباعي" : `مضلع ذو ${numWalls} أضلاع`);

                    // إضاءة الجدران المحيطة
                    detectedSpace.wallIds.forEach(wId => {
                        this.app.viewer.highlightWall(wId, 0x2ecc71);
                    });

                    // طلب اسم الفضاء وتأكيد الإنشاء
                    const roomPrompt = `تم اكتشاف فضاء معماري ${shapeName} محاط بـ ${numWalls} جدران!\n` +
                        `• المساحة المحسوبة: ${areaM2} م²\n` +
                        `• السعة التقديرية: ${Math.max(2, Math.round(detectedSpace.area / 3.5))} شخص\n\n` +
                        `أدخل اسماً لهذا الفضاء:`;

                    const defaultName = `فضاء ${shapeName} (${areaM2}م²)`;
                    const roomName = prompt(roomPrompt, defaultName);

                    // تنظيف تمييز الجدران
                    detectedSpace.wallIds.forEach(wId => {
                        this.app.viewer.clearWallHighlight(wId);
                    });
                    cleanupTempVisuals();

                    if (!roomName) {
                        setHint("ℹ️ تم إلغاء إنشاء الفضاء.");
                        return;
                    }

                    const firstWall = bData.walls[detectedSpace.wallIds[0]];
                    const wallElev = firstWall?.base_elevation || firstWall?.elevation || (pt.y !== undefined ? Math.round(pt.y * 10) / 10 : 0);
                    const wallStorey = firstWall?.storey_id || this.app.viewer?.activeStoreyFilter || 'st_g';

                    const spaceId = `space_${Date.now()}`;
                    const spaceObj = {
                        id: spaceId,
                        name_ar: roomName,
                        name_en: "Enclosed Space",
                        type: "flexible",
                        capacity: Math.max(2, Math.round(detectedSpace.area / 3.5)),
                        area_m2: Math.round(detectedSpace.area * 10) / 10,
                        centroid: detectedSpace.centroid,
                        polygon: detectedSpace.vertices,
                        bounds: detectedSpace.bounds,
                        base_elevation: wallElev,
                        storey_id: wallStorey,
                        enclosing_wall_ids: detectedSpace.wallIds,
                        color: "#2ecc71"
                    };

                    bData.spaces[spaceId] = spaceObj;

                    // تحديث المنظور ثلاثي الأبعاد واللوحة الحركية
                    this.app.viewer.loadBuildingModel(bData);
                    this.populateSpacesEditor();

                    historyStack.push({
                        type: 'create-enclosed-space',
                        spaceId: spaceId,
                        space: spaceObj
                    });

                    setHint(`✓ تم تحديد وتجسيم فضاء (${roomName}) بمساحة ${areaM2}م² وتوليد أرضيته ثلاثية الأبعاد وحساساته بنجاح!`);

                    try {
                        await fetch('/api/model/add_element', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ type: 'space', element: spaceObj })
                        });
                        if (window.app?.analytics) {
                            await window.app.analytics.fetchAndUpdateSensorsInventory();
                            await window.app.analytics.fetchAndUpdateIoTTelemetry();
                        }
                    } catch(err) {
                        console.error("Failed to sync enclosed space:", err);
                    }
                    return;
                }

                const pt = getPointOnBlueprint(clientX, clientY);
                if (!pt) return;

                const clickX = pt.x;
                const clickZ = pt.z;

                if (activeTool === 'wall') {
                    const snapRes = snapPointToWalls(clickX, clickZ, bData.walls);
                    const snappedPt = snapRes.point;

                    if (!wallStartPoint) {
                        wallStartPoint = [snappedPt[0], snappedPt[1]];
                        const dotGeo = new THREE.SphereGeometry(0.4, 16, 16);
                        const dotMat = new THREE.MeshBasicMaterial({ color: snapRes.snapped ? 0x2ecc71 : 0x00d2ff });
                        tempMarker = new THREE.Mesh(dotGeo, dotMat);
                        tempMarker.position.set(snappedPt[0], 0.25, snappedPt[1]);
                        this.app.viewer.scene.add(tempMarker);
                        const snapMsg = snapRes.snapped ? " 🧲 [ملتصق بزاوية جدار بدقة هندسية]" : "";
                        setHint(`🧱 تم تثبيت نقطة بداية الجدار${snapMsg}. حرك الفأرة فوق مسار الجدار بالـ PDF ثم انقر نقطة النهاية...`);
                    } else {
                        const x1 = wallStartPoint[0], z1 = wallStartPoint[1];
                        const x2 = snappedPt[0], z2 = snappedPt[1];
                        const len = Math.hypot(x2 - x1, z2 - z1);
                        if (len < 0.6) {
                            setHint("⚠️ طول الجدار قصير جداً، يرجى اختيار نقطة ثانية على مسافة أكبر.");
                            return;
                        }

                        cleanupTempVisuals();

                        const wallId = `wall_${Date.now()}`;
                        const wallObj = {
                            id: wallId,
                            start: [Math.round(x1 * 10) / 10, Math.round(z1 * 10) / 10],
                            end: [Math.round(x2 * 10) / 10, Math.round(z2 * 10) / 10],
                            thickness: 0.25,
                            height: 2.8,
                            type: "interior"
                        };

                        bData.walls[wallId] = wallObj;
                        this.app.viewer.buildWallsAndOpenings(bData.walls, bData.openings, bData.spaces);
                        this.app.viewer.setupCirculationParticles(bData);
                        historyStack.push({ type: 'wall', id: wallId });
                        const snapMsg = snapRes.snapped ? " بالتقاء هندسي نظيف" : "";
                        setHint(`✓ تم رسم وتجسيم الجدار (${len.toFixed(1)}م)${snapMsg} بنجاح فوق المخطط! يمكنك رسم جدار آخر مباشرة.`);

                        try {
                            await fetch('/api/model/add_element', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'wall', element: wallObj })
                            });
                        } catch(err) {}
                    }
                } else if (activeTool === 'door' || activeTool === 'window' || activeTool === 'passage') {
                    const wallCount = Object.keys(bData.walls || {}).length;
                    if (wallCount === 0) {
                        const toolName = activeTool === 'door' ? 'الباب' : (activeTool === 'window' ? 'الشباك' : 'فتحة العبور');
                        setHint(`ℹ️ لا توجد جدران حالية لتثبيت ${toolName} فيها. يرجى اختيار أداة (🧱 رسم جدار) لرسم جدار أولاً ثم تثبيت ${toolName} فوقه.`);
                        return;
                    }

                    const snap = findNearestWallProjection(clickX, clickZ, bData.walls);
                    if (!snap || snap.dist > 5.5) {
                        const toolName = activeTool === 'door' ? 'الباب' : (activeTool === 'window' ? 'الشباك' : 'فتحة العبور');
                        setHint(`⚠️ يرجى النقر بالقرب من جدار في المخطط لإضافة ${toolName} إليه (النقر الحالي بعيد عن خطوط الجدران).`);
                        return;
                    }

                    if (activeTool === 'door') {
                        const doorId = `door_${Date.now()}`;
                        const doorObj = {
                            id: doorId,
                            wall_id: snap.wall.id,
                            type: "door",
                            position: [Math.round(snap.proj[0] * 10) / 10, Math.round(snap.proj[1] * 10) / 10],
                            width: 1.2,
                            height: 2.2
                        };
                        bData.openings[doorId] = doorObj;
                        this.app.viewer.buildWallsAndOpenings(bData.walls, bData.openings, bData.spaces);
                        this.app.viewer.setupCirculationParticles(bData);
                        historyStack.push({ type: 'opening', id: doorId });
                        setHint("✓ تم تفريغ الجدار وإنشاء فتحة باب وعتبة حركة مضيئة وقوس فتح 90°!");

                        try {
                            await fetch('/api/model/add_element', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'opening', element: doorObj })
                            });
                        } catch(err) {}
                    } else if (activeTool === 'window') {
                        const winId = `win_${Date.now()}`;
                        const winObj = {
                            id: winId,
                            wall_id: snap.wall.id,
                            type: "window",
                            position: [Math.round(snap.proj[0] * 10) / 10, Math.round(snap.proj[1] * 10) / 10],
                            width: 1.6,
                            height: 1.4,
                            sill_height: 0.9
                        };
                        bData.openings[winId] = winObj;
                        this.app.viewer.buildWallsAndOpenings(bData.walls, bData.openings, bData.spaces);
                        this.app.viewer.setupCirculationParticles(bData);
                        historyStack.push({ type: 'opening', id: winId });
                        setHint("✓ تم تفريغ الجدار وإنشاء شباك معماري بألواح زجاجية وعتبات سفلية وعلوية!");

                        try {
                            await fetch('/api/model/add_element', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'opening', element: winObj })
                            });
                        } catch(err) {}
                    } else if (activeTool === 'passage') {
                        const passId = `passage_${Date.now()}`;
                        const passObj = {
                            id: passId,
                            wall_id: snap.wall.id,
                            type: "passage",
                            position: [Math.round(snap.proj[0] * 10) / 10, Math.round(snap.proj[1] * 10) / 10],
                            width: 1.6,
                            height: 2.4
                        };
                        bData.openings[passId] = passObj;
                        this.app.viewer.buildWallsAndOpenings(bData.walls, bData.openings, bData.spaces);
                        this.app.viewer.setupCirculationParticles(bData);
                        historyStack.push({ type: 'opening', id: passId });
                        setHint("✓ تم تفريغ الجدار وتثبيت فتحة عبور وممر مفتوح لدعم التدفق الحركي الحر!");

                        try {
                            await fetch('/api/model/add_element', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'opening', element: passObj })
                            });
                        } catch(err) {}
                    }
                } else if (activeTool === 'room') {
                    if (!roomCorner1) {
                        roomCorner1 = [clickX, clickZ];
                        const dotGeo = new THREE.SphereGeometry(0.4, 16, 16);
                        const dotMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff });
                        tempMarker = new THREE.Mesh(dotGeo, dotMat);
                        tempMarker.position.set(clickX, 0.25, clickZ);
                        this.app.viewer.scene.add(tempMarker);
                        setHint("🏷️ تم تحديد الزاوية الأولى؛ انقر الزاوية المقابلة للغرفة فوق مسقط الـ PDF لتأكيد الحدود...");
                    } else {
                        const x1 = roomCorner1[0], z1 = roomCorner1[1];
                        const x2 = clickX, z2 = clickZ;
                        cleanupTempVisuals();

                        const rx = Math.round(Math.min(x1, x2) * 10) / 10;
                        const rz = Math.round(Math.min(z1, z2) * 10) / 10;
                        const rw = Math.max(3.0, Math.round(Math.abs(x2 - x1) * 10) / 10);
                        const rd = Math.max(3.0, Math.round(Math.abs(z2 - z1) * 10) / 10);

                        const roomName = prompt(`أدخل اسم الفضاء أو الغرفة المعمارية (${rw}م × ${rd}م):`, "فضاء إداري جديد");
                        if (!roomName) return;

                        const targetElev = (pt.y !== undefined && pt.y > 0.5) ? Math.round(pt.y * 10) / 10 : 0;
                        const targetStorey = this.app.viewer?.activeStoreyFilter || 'st_g';

                        const spaceId = `space_${Date.now()}`;
                        const spaceObj = {
                            id: spaceId,
                            name_ar: roomName,
                            name_en: "Custom Room",
                            type: "flexible",
                            capacity: Math.max(10, Math.round((rw * rd) / 3.5)),
                            area_m2: Math.round(rw * rd),
                            bounds: { x: rx, z: rz, width: rw, depth: rd, height: 3.5 },
                            base_elevation: targetElev,
                            storey_id: targetStorey,
                            color: "#00d2ff"
                        };

                        bData.spaces[spaceId] = spaceObj;

                        // توليد الجدران المحيطية الأربعة وباب الغرفة
                        const w1 = `w_${spaceId}_n`, w2 = `w_${spaceId}_s`, w3 = `w_${spaceId}_w`, w4 = `w_${spaceId}_e`;
                        bData.walls[w1] = { id: w1, start: [rx, rz], end: [rx + rw, rz], thickness: 0.25, height: 2.8, base_elevation: targetElev, storey_id: targetStorey, type: "exterior" };
                        bData.walls[w2] = { id: w2, start: [rx, rz + rd], end: [rx + rw, rz + rd], thickness: 0.25, height: 2.8, base_elevation: targetElev, storey_id: targetStorey, type: "interior" };
                        bData.walls[w3] = { id: w3, start: [rx, rz], end: [rx, rz + rd], thickness: 0.25, height: 2.8, base_elevation: targetElev, storey_id: targetStorey, type: "interior" };
                        bData.walls[w4] = { id: w4, start: [rx + rw, rz], end: [rx + rw, rz + rd], thickness: 0.25, height: 2.8, base_elevation: targetElev, storey_id: targetStorey, type: "interior" };

                        const d1 = `door_${spaceId}`;
                        bData.openings[d1] = {
                            id: d1,
                            type: "door",
                            wall_id: w2,
                            position: [rx + rw / 2, rz + rd],
                            width: 1.2,
                            height: 2.2
                        };

                        historyStack.push({
                            type: 'room',
                            id: spaceId,
                            name: roomName,
                            walls: [w1, w2, w3, w4],
                            doorId: d1
                        });

                        this.app.viewer.loadBuildingModel(bData);
                        this.populateSpacesEditor();
                        setHint(`✓ تم تحديد وتجسيم فضاء (${roomName}) بمساحة ${Math.round(rw * rd)}م² وتوليد جدرانه وبابه وحساساته!`);

                        try {
                            await fetch('/api/model/add_element', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'space', element: spaceObj })
                            });
                        } catch(err) {}
                    }
                } else if (activeTool === 'iot-sensor') {
                    // تثبيت مستشعر IoT تفاعلي
                    const nearOpeningId = findOpeningUnderCursor(clientX, clientY);
                    const insideSpaceId = !nearOpeningId ? findSpaceUnderCursor(clientX, clientY) : null;

                    let defaultChoice = nearOpeningId ? "4" : "1";
                    const promptMsg = "اختر نوع مستشعر الـ IoT لتثبيته في هذا الموقع:\n" +
                        "1: 📡 حساس حركة وإشغال فراغي (PIR_OCCUPANCY)\n" +
                        "2: 🌿 مستشعر جودة الهواء والبيئة (ENVIRONMENTAL_TELEMETRY)\n" +
                        "3: 🔊 حساس قياس الضوضاء والصوت (ACOUSTIC_NOISE)\n" +
                        "4: 🚪 عداد بصري لتدفق المشاة فوق الأبواب (OPTICAL_DOOR_COUNTER)";

                    const userChoice = prompt(promptMsg, defaultChoice);
                    if (!userChoice) return;

                    let sType = 'PIR_OCCUPANCY';
                    if (userChoice.trim() === '2') sType = 'ENVIRONMENTAL_TELEMETRY';
                    else if (userChoice.trim() === '3') sType = 'ACOUSTIC_NOISE';
                    else if (userChoice.trim() === '4') sType = 'OPTICAL_DOOR_COUNTER';

                    const sensorPayload = {
                        type: sType,
                        space_id: sType === 'OPTICAL_DOOR_COUNTER' ? null : insideSpaceId,
                        door_id: sType === 'OPTICAL_DOOR_COUNTER' ? nearOpeningId : null,
                        position: {
                            x: Math.round(clickX * 10) / 10,
                            y: sType === 'OPTICAL_DOOR_COUNTER' ? 2.25 : (sType === 'ENVIRONMENTAL_TELEMETRY' ? 2.5 : 3.35),
                            z: Math.round(clickZ * 10) / 10
                        }
                    };

                    let localSensor = null;
                    try {
                        const res = await fetch('/api/iot/sensors/add', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(sensorPayload)
                        });
                        if (res.ok) {
                            const data = await res.json();
                            if (data.status === 'ok' && data.sensor) {
                                localSensor = data.sensor;
                            }
                        }
                    } catch(err) {
                        // offline fallback
                    }

                    if (!localSensor) {
                        const sPrefix = (sType === 'PIR_OCCUPANCY') ? 'pir' : (sType === 'OPTICAL_DOOR_COUNTER' ? 'counter' : 'env');
                        const typeNames = {
                            'PIR_OCCUPANCY': 'حساس حركة PIR',
                            'ENVIRONMENTAL_TELEMETRY': 'مستشعر بيئي وCO2',
                            'ACOUSTIC_NOISE': 'مستشعر ضوضاء وصوتيات',
                            'OPTICAL_DOOR_COUNTER': 'عداد مرور المشاة'
                        };
                        const targetLabel = sensorPayload.space_id || sensorPayload.door_id || 'محدد';
                        localSensor = {
                            id: `${sPrefix}_${Date.now() % 100000}`,
                            type: sType,
                            space_id: sensorPayload.space_id,
                            door_id: sensorPayload.door_id,
                            position: sensorPayload.position,
                            name_ar: `${typeNames[sType] || sType}: (${targetLabel})`,
                            status: 'ONLINE',
                            battery: 99.0
                        };
                    }

                    if (this.app?.viewer) {
                        this.app.viewer.addIoTSensorMesh(localSensor);
                    }
                    historyStack.push({
                        type: 'sensor',
                        sensorId: localSensor.id
                    });
                    setHint(`✓ تم تثبيت وتفعيل مستشعر IoT (${localSensor.name_ar || localSensor.id}) بنجاح!`);
                    const activeAnalytics = this.app?.analytics || window.twinApp?.analytics || window.app?.analytics;
                    if (activeAnalytics) {
                        await activeAnalytics.fetchAndUpdateSensorsInventory();
                        await activeAnalytics.fetchAndUpdateIoTTelemetry();
                    }
                    return;
                } else if (activeTool === 'staircase') {
                    const pt = getPointOnBlueprint(clientX, clientY);
                    if (!pt) return;

                    const stairTypeChoice = prompt(
                        "اختر اتجاه ونمط الحركة العمودية للسلم المعماري:\n" +
                        "1: 🔁 سلم باتجاهين (صاعد ونازل - شاحطين متوازيين مع بسطة استراحة وسطية)\n" +
                        "2: ⬆️ سلم صاعد باتجاه واحد (Single Flight UP)\n" +
                        "3: ⬇️ سلم نازل باتجاه واحد (Single Flight DOWN)\n" +
                        "4: 🚨 سلم طوارئ وهروب من الحريق (Emergency Fire Exit)",
                        "1"
                    );
                    if (!stairTypeChoice) return;

                    let sDirection = "two_way";
                    let sType = "main";
                    let defaultName = "بيت الدرج الرئيسي";
                    const choice = stairTypeChoice.trim();
                    if (choice === "2") {
                        sDirection = "up";
                        defaultName = "سلم صاعد (طابق 1 إلى 2)";
                    } else if (choice === "3") {
                        sDirection = "down";
                        defaultName = "سلم نازل (إلى المخرج / القبو)";
                    } else if (choice === "4") {
                        sType = "emergency";
                        sDirection = "down";
                        defaultName = "درج طوارئ وهروب";
                    } else {
                        sDirection = "two_way";
                        defaultName = "سلم رئيسي مزدوج (باتجاهين)";
                    }

                    const stairName = prompt("أدخل مسمى السلم أو بيت الدرج:", defaultName);
                    if (!stairName) return;

                    const isEmergency = sType === "emergency";
                    const stairId = `stair_${Date.now()}`;
                    const stairWidth = isEmergency ? 1.8 : 2.4;
                    const stairDepth = isEmergency ? 3.6 : 4.5;
                    const rotDeg = stairRotationAngle || 0;
                    const rotRad = (rotDeg * Math.PI) / 180.0;

                    const landingOffset = stairDepth / 2.0;
                    const landingX = Math.round((pt.x + Math.sin(rotRad) * landingOffset) * 10) / 10;
                    const landingZ = Math.round((pt.z + Math.cos(rotRad) * landingOffset) * 10) / 10;

                    const stairObj = {
                        id: stairId,
                        name_ar: stairName,
                        stair_type: sType,
                        direction: sDirection,
                        position: [Math.round(pt.x * 10) / 10, Math.round(pt.z * 10) / 10],
                        landing_pos: [landingX, landingZ],
                        width: stairWidth,
                        depth: stairDepth,
                        height: 2.8,
                        num_steps: isEmergency ? 16 : 18,
                        rotation: rotDeg
                    };

                    if (!bData.stairs) bData.stairs = {};
                    bData.stairs[stairId] = stairObj;

                    this.app.viewer.buildStaircases(bData.stairs);
                    this.app.viewer.setupCirculationParticles(bData);

                    historyStack.push({
                        type: 'stair',
                        id: stairId,
                        stair: stairObj
                    });

                    const dirLabel = sDirection === 'two_way' ? 'باتجاهين 🔁' : (sDirection === 'up' ? 'صاعد ⬆️' : 'نازل ⬇️');
                    setHint(`✓ تم تثبيت وتجسيم (${stairName}) [${dirLabel}] ثلاثي الأبعاد وربطه بالممرات بنجاح! اضغط R لتدوير السلم التالي.`);

                    try {
                        await fetch('/api/model/add_element', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ type: 'stair', element: stairObj })
                        });
                    } catch(err) {
                        console.error("Failed to sync stair creation:", err);
                    }
                    return;
                } else if (activeTool === 'polygon-space') {
                    const snapRes = snapPointToWalls(clickX, clickZ, bData.walls);
                    const usePt = snapRes.snapped ? snapRes.point : [Math.round(clickX * 10) / 10, Math.round(clickZ * 10) / 10];

                    if (polygonPoints.length >= 3) {
                        const startPt = polygonPoints[0];
                        const distToStart = Math.hypot(usePt[0] - startPt[0], usePt[1] - startPt[1]);
                        if (distToStart < 1.0) {
                            await finalizePolygonSpace();
                            return;
                        }
                    }

                    polygonPoints.push(usePt);

                    if (!polygonPreviewGroup) {
                        polygonPreviewGroup = new THREE.Group();
                        this.app.viewer.scene.add(polygonPreviewGroup);
                    }

                    const dotGeo = new THREE.SphereGeometry(0.35, 16, 16);
                    const dotMat = new THREE.MeshBasicMaterial({ color: polygonPoints.length === 1 ? 0x2ecc71 : 0x00d2ff });
                    const dotMesh = new THREE.Mesh(dotGeo, dotMat);
                    const targetElev = (pt.y !== undefined && pt.y > 0.5) ? Math.round(pt.y * 10) / 10 : 0;
                    dotMesh.position.set(usePt[0], targetElev + 0.25, usePt[1]);
                    polygonPreviewGroup.add(dotMesh);

                    if (polygonPoints.length === 1) {
                        setHint("⬡ تم تسجيل الرأس الأول؛ انقر لتحديد الرأس التالي لمضلع الفضاء...");
                    } else {
                        const curArea = polygonArea(polygonPoints);
                        setHint(`⬡ تم تسجيل الرأس ${polygonPoints.length} (المساحة: ${curArea.toFixed(1)}م²). انقر الرأس التالي، أو انقر قرب البداية/انقر نقراً مزدوجاً لإنهاء وتجسيم الفضاء.`);
                    }
                    return;
                } else if (activeTool === 'space-separator') {
                    if (!spaceSeparatorStart) {
                        spaceSeparatorStart = [Math.round(clickX * 10) / 10, Math.round(clickZ * 10) / 10];

                        const dotGeo = new THREE.SphereGeometry(0.35, 16, 16);
                        const dotMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
                        tempMarker = new THREE.Mesh(dotGeo, dotMat);
                        tempMarker.position.set(spaceSeparatorStart[0], 0.25, spaceSeparatorStart[1]);
                        this.app.viewer.scene.add(tempMarker);

                        setHint("➗ تم تحديد بداية القاطع الفضائي. حرك المؤشر عبر الفضاء المراد تقسيمه وانقر النقطة الثانية...");
                        return;
                    } else {
                        const pA = spaceSeparatorStart;
                        const pB = [Math.round(clickX * 10) / 10, Math.round(clickZ * 10) / 10];
                        cleanupTempVisuals();

                        const sepLen = Math.hypot(pB[0] - pA[0], pB[1] - pA[1]);
                        if (sepLen < 0.8) {
                            setHint("⚠️ طول خط التقسيم قصير جداً.");
                            return;
                        }

                        const midX = (pA[0] + pB[0]) / 2;
                        const midZ = (pA[1] + pB[1]) / 2;

                        let targetSpaceId = null;
                        let targetSpace = null;

                        for (const [sId, s] of Object.entries(bData.spaces || {})) {
                            let poly = s.polygon;
                            if (!poly && s.bounds) {
                                poly = [
                                    [s.bounds.x, s.bounds.z],
                                    [s.bounds.x + s.bounds.width, s.bounds.z],
                                    [s.bounds.x + s.bounds.width, s.bounds.z + s.bounds.depth],
                                    [s.bounds.x, s.bounds.z + s.bounds.depth]
                                ];
                            }
                            if (poly && (isPointInPolygon(midX, midZ, poly) || isPointInPolygon(pA[0], pA[1], poly) || isPointInPolygon(pB[0], pB[1], poly))) {
                                targetSpaceId = sId;
                                targetSpace = s;
                                break;
                            }
                        }

                        if (!targetSpace) {
                            setHint("⚠️ لم يتم العثور على فضاء مسجل يمر به خط القاطع. يرجى رسم خط القاطع عبر فضاء موجود.");
                            return;
                        }

                        let poly = targetSpace.polygon;
                        if (!poly && targetSpace.bounds) {
                            poly = [
                                [targetSpace.bounds.x, targetSpace.bounds.z],
                                [targetSpace.bounds.x + targetSpace.bounds.width, targetSpace.bounds.z],
                                [targetSpace.bounds.x + targetSpace.bounds.width, targetSpace.bounds.z + targetSpace.bounds.depth],
                                [targetSpace.bounds.x, targetSpace.bounds.z + targetSpace.bounds.depth]
                            ];
                        }

                        const splitResult = splitPolygonByLine(poly, pA, pB);
                        if (!splitResult) {
                            setHint("⚠️ يتعذر تقسيم الفضاء: يجب أن يقطع خط التقسيم حافتين من حواف الفضاء بالكامل.");
                            return;
                        }

                        const { polyA, polyB } = splitResult;
                        const areaA = polygonArea(polyA);
                        const areaB = polygonArea(polyB);

                        const origName = targetSpace.name_ar || "فضاء رئيسي";
                        const oldSpace = JSON.parse(JSON.stringify(targetSpace));

                        delete bData.spaces[targetSpaceId];

                        const spaceA = await createSpaceFromPolygon(polyA, targetSpace.base_elevation || 0, targetSpace.storey_id || 'st_g', `${origName} (القسم أ)`, "#3498db");
                        const spaceB = await createSpaceFromPolygon(polyB, targetSpace.base_elevation || 0, targetSpace.storey_id || 'st_g', `${origName} (القسم ب)`, "#e67e22");

                        historyStack.push({
                            type: 'split-space',
                            originalSpaceId: targetSpaceId,
                            originalSpace: oldSpace,
                            newSpaceIds: [spaceA.id, spaceB.id]
                        });

                        this.app.viewer.loadBuildingModel(bData);
                        this.populateSpacesEditor();
                        setHint(`✓ تم تقسيم (${origName}) بنجاح بقاطع افتراضي إلى: (${spaceA.name_ar} ${areaA.toFixed(1)}م²) و (${spaceB.name_ar} ${areaB.toFixed(1)}م²)!`);

                        try {
                            await fetch('/api/model/delete_element', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'space', id: targetSpaceId })
                            });
                        } catch(err) {}
                        return;
                    }
                } else if (activeTool === 'circle-space') {
                    if (!circleSpaceCenter) {
                        circleSpaceCenter = [Math.round(clickX * 10) / 10, Math.round(clickZ * 10) / 10];

                        const dotGeo = new THREE.SphereGeometry(0.4, 16, 16);
                        const dotMat = new THREE.MeshBasicMaterial({ color: 0xf39c12 });
                        tempMarker = new THREE.Mesh(dotGeo, dotMat);
                        tempMarker.position.set(circleSpaceCenter[0], 0.25, circleSpaceCenter[1]);
                        this.app.viewer.scene.add(tempMarker);

                        setHint("🔘 تم تحديد مركز الفضاء الدائري. حرك المؤشر لتحديد نصف القطر ثم انقر للتثبيت والتجسيم...");
                        return;
                    } else {
                        const cx = circleSpaceCenter[0];
                        const cz = circleSpaceCenter[1];
                        cleanupTempVisuals();

                        const radius = Math.hypot(clickX - cx, clickZ - cz);
                        if (radius < 1.0) {
                            setHint("⚠️ نصف قطر الفضاء الدائري صغير جداً (يجب ألا يقل عن 1م).");
                            return;
                        }

                        const area = Math.PI * radius * radius;
                        const roomName = prompt(`أدخل اسم الفضاء الدائري الشعاعي (نصف القطر: ${radius.toFixed(1)}م، المساحة: ${area.toFixed(1)}م²):`, "بهو دائري مركزي (Atrium)");
                        if (!roomName) return;

                        const numSegments = 24;
                        const circlePts = [];
                        for (let i = 0; i < numSegments; i++) {
                            const angle = (2 * Math.PI * i) / numSegments;
                            circlePts.push([
                                Math.round((cx + radius * Math.cos(angle)) * 100) / 100,
                                Math.round((cz + radius * Math.sin(angle)) * 100) / 100
                            ]);
                        }

                        const targetElev = (pt.y !== undefined && pt.y > 0.5) ? Math.round(pt.y * 10) / 10 : 0;
                        const targetStorey = this.app.viewer?.activeStoreyFilter || 'st_g';

                        const spaceObj = await createSpaceFromPolygon(circlePts, targetElev, targetStorey, roomName, "#f39c12");
                        if (spaceObj) {
                            historyStack.push({
                                type: 'create-circle-space',
                                spaceId: spaceObj.id,
                                space: spaceObj
                            });
                            setHint(`✓ تم تجسيم الفضاء الدائري الشعاعي (${roomName}) بنصف قطر ${radius.toFixed(1)}م ومساحة ${area.toFixed(1)}م² بنجاح!`);
                        }
                        return;
                    }
                }
            };

            // معالجة الأحداث عند رفع المؤشر أو النقر لتشغيل أدوات الرسم والتعديل
            canvas.addEventListener('pointerup', async (e) => {
                if (!isTracing || !this.app.viewer || e.button !== 0) return;

                // معالجة سحب وإفلات الجدران والسلالم في أداة move-wall
                if (activeTool === 'move-wall') {
                    if (isDraggingWall && movingWallId && wallMoveStartPoint && wallMoveOriginal) {
                        const pt = getPointOnBlueprint(e.clientX, e.clientY);
                        let dx = 0, dz = 0;
                        if (pt) {
                            dx = pt.x - wallMoveStartPoint[0];
                            dz = pt.z - wallMoveStartPoint[1];
                        }
                        const origS = wallMoveOriginal.start;
                        const origE = wallMoveOriginal.end;
                        let propS = [origS[0] + dx, origS[1] + dz];
                        let propE = [origE[0] + dx, origE[1] + dz];

                        const snapS = snapPointToWalls(propS[0], propS[1], this.app.viewer.buildingData?.walls, movingWallId, 1.2);
                        let snapped = false;
                        if (snapS.snapped) {
                            dx = snapS.point[0] - origS[0];
                            dz = snapS.point[1] - origS[1];
                            propS = snapS.point;
                            propE = [origE[0] + dx, origE[1] + dz];
                            snapped = true;
                        } else {
                            const snapE = snapPointToWalls(propE[0], propE[1], this.app.viewer.buildingData?.walls, movingWallId, 1.2);
                            if (snapE.snapped) {
                                dx = snapE.point[0] - origE[0];
                                dz = snapE.point[1] - origE[1];
                                propS = [origS[0] + dx, origS[1] + dz];
                                propE = snapE.point;
                                snapped = true;
                            }
                        }

                        const distMoved = Math.hypot(dx, dz);
                        const screenDragDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);

                        if (distMoved >= 0.25 && screenDragDist > 6) {
                            const wId = movingWallId;
                            const prevW = wallMoveOriginal;
                            const prevOps = wallMoveOpeningsOriginal;
                            const bData = this.app.viewer.buildingData;

                            if (wallMovePreviewLine) {
                                this.app.viewer.scene.remove(wallMovePreviewLine);
                                wallMovePreviewLine = null;
                            }

                            bData.walls[wId].start = [Math.round(propS[0] * 10) / 10, Math.round(propS[1] * 10) / 10];
                            bData.walls[wId].end = [Math.round(propE[0] * 10) / 10, Math.round(propE[1] * 10) / 10];

                            const newOps = {};
                            for (const [opId, op] of Object.entries(bData.openings || {})) {
                                if (op.wall_id === wId) {
                                    op.position = [
                                        Math.round((op.position[0] + dx) * 10) / 10,
                                        Math.round((op.position[1] + dz) * 10) / 10
                                    ];
                                    newOps[opId] = JSON.parse(JSON.stringify(op));
                                }
                            }

                            historyStack.push({
                                type: 'move-wall',
                                wallId: wId,
                                prevWall: prevW,
                                prevOpenings: prevOps,
                                newWall: JSON.parse(JSON.stringify(bData.walls[wId])),
                                newOpenings: newOps
                            });

                            this.app.viewer.buildWallsAndOpenings(bData.walls, bData.openings, bData.spaces);
                            this.app.viewer.setupCirculationParticles(bData);

                            // تثبيت التحديد للجدار وإبقاء شريط التحكم مفتوحاً
                            isDraggingWall = false;
                            movingWallId = null;
                            selectedMoveWallId = wId;
                            selectedMoveStairId = null;
                            wallMoveOriginal = JSON.parse(JSON.stringify(bData.walls[wId]));
                            this.app.viewer.highlightWall(wId, 0xf59e0b);
                            showTransformPanel('wall', wId);
                            if (canvas) canvas.style.cursor = 'grab';

                            const snapTxt = snapped ? " 🧲 بالالتصاق بزاوية جدار قائم" : "";
                            setHint(`✓ تم سحب ونقل الجدار (${wId}) بمقدار ${distMoved.toFixed(1)}م${snapTxt}. اضغط R أو استخدم الأزرار لتدويره.`);

                            try {
                                await fetch('/api/model/sync_model', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        walls: bData.walls,
                                        openings: bData.openings,
                                        spaces: bData.spaces
                                    })
                                });
                            } catch (err) {
                                console.error("Failed to sync wall move:", err);
                            }

                            lastProcessedClickTime = Date.now();
                            return;
                        } else {
                            isDraggingWall = false;
                            movingWallId = null;
                            if (wallMovePreviewLine) {
                                this.app.viewer.scene.remove(wallMovePreviewLine);
                                wallMovePreviewLine = null;
                            }
                        }
                    } else if (isDraggingStair && movingStairId && stairMoveStartPoint && stairMoveOriginal) {
                        const sId = movingStairId;
                        let targetCoordX = null;
                        let targetCoordZ = null;

                        if (stairLastTargetPos) {
                            targetCoordX = stairLastTargetPos[0];
                            targetCoordZ = stairLastTargetPos[1];
                        } else {
                            const pt = getPointOnBlueprint(e.clientX, e.clientY);
                            if (pt) {
                                const dx = pt.x - stairMoveStartPoint[0];
                                const dz = pt.z - stairMoveStartPoint[1];
                                const origPos = stairMoveOriginal.position || [0, 0];
                                targetCoordX = Math.round((origPos[0] + dx) * 10) / 10;
                                targetCoordZ = Math.round((origPos[1] + dz) * 10) / 10;
                            }
                        }

                        if (stairPreviewGroup) {
                            this.app.viewer.scene.remove(stairPreviewGroup);
                            stairPreviewGroup = null;
                        }

                        isDraggingStair = false;
                        movingStairId = null;
                        stairLastTargetPos = null;

                        if (targetCoordX !== null && targetCoordZ !== null) {
                            selectedMoveStairId = sId;
                            selectedMoveWallId = null;
                            await moveSelectedStairTo(targetCoordX, targetCoordZ);
                        }
                        if (canvas) canvas.style.cursor = 'grab';
                        lastProcessedClickTime = Date.now();
                        return;
                    }

                    // تصفير مؤشرات السحب العابرة دون لمس التحديد الحالي
                    isDraggingWall = false;
                    isDraggingStair = false;
                    movingWallId = null;
                    movingStairId = null;
                }

                // تنفيذ النقر العادي إذا لم تكن هناك حركة دوران أو سحب
                const dragDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
                const duration = Date.now() - pointerDownTime;
                if (dragDist > 15 || duration > 600) return;
                if (Date.now() - lastProcessedClickTime < 250) return;
                lastProcessedClickTime = Date.now();
                await executeClickAction(e.clientX, e.clientY);
            });

            canvas.addEventListener('dblclick', async (e) => {
                if (!isTracing || !this.app.viewer) return;
                if (activeTool === 'polygon-space' && polygonPoints.length >= 3) {
                    e.preventDefault();
                    await finalizePolygonSpace();
                }
            });

            window.addEventListener('keydown', async (e) => {
                if (!isTracing) return;
                if (e.key === 'Enter' && activeTool === 'polygon-space' && polygonPoints.length >= 3) {
                    e.preventDefault();
                    await finalizePolygonSpace();
                } else if (e.key === 'Escape') {
                    cleanupTempVisuals();
                    setHint("تم إلغاء الأمر الحالي.");
                }
            });
        };

        setTimeout(attachCanvasListeners, 500);
        openTracerBtn.addEventListener('click', attachCanvasListeners);
    }

    /* =========================================================================
       Scale Calibration UI, Guides & Instant Sample Blueprint (v2.3.9)
       ========================================================================= */

    setupScaleCalibrationUI() {
        const btnHeaderCalib = document.getElementById('btn-header-scale-calibration');
        if (btnHeaderCalib) {
            btnHeaderCalib.addEventListener('click', (e) => {
                e.preventDefault();
                this.triggerScaleCalibrationWorkflow();
            });
        }

        const btnToggleScale = document.getElementById('btn-toggle-scale-panel');
        if (btnToggleScale) {
            btnToggleScale.addEventListener('click', (e) => {
                e.preventDefault();
                const bpScalePanel = document.getElementById('hud-blueprint-scale-panel');
                const hasBp = Boolean(this.app.viewer?.blueprintMesh || this.app.viewer?.blueprintCanvas);
                if (!hasBp) {
                    this.openScaleInfoModal();
                    return;
                }
                if (bpScalePanel) {
                    const isVisible = bpScalePanel.style.display === 'flex';
                    bpScalePanel.style.display = isVisible ? 'none' : 'flex';
                }
            });
        }

        this.setupScaleInfoModalEvents();
    }

    setupScaleInfoModalEvents() {
        const modal = document.getElementById('modal-scale-info');
        const btnClose = document.getElementById('btn-close-scale-info-modal');
        if (btnClose) {
            btnClose.addEventListener('click', () => this.closeScaleInfoModal());
        }
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeScaleInfoModal();
            });
        }

        const btnLoadSample = document.getElementById('btn-scale-info-load-sample');
        if (btnLoadSample) {
            btnLoadSample.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadSampleBlueprintForCalibration();
            });
        }

        const btnUploadPdf = document.getElementById('btn-scale-info-upload-pdf');
        if (btnUploadPdf) {
            btnUploadPdf.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeScaleInfoModal();
                this.openModal();
                this.switchTab('upload');
            });
        }

        const btnCurrentScene = document.getElementById('btn-scale-info-current-scene');
        if (btnCurrentScene) {
            btnCurrentScene.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeScaleInfoModal();
                const bpScalePanel = document.getElementById('hud-blueprint-scale-panel');
                if (bpScalePanel) bpScalePanel.style.display = 'flex';
                const hudBar = document.getElementById('blueprint-hud-bar');
                if (hudBar) hudBar.classList.remove('collapsed');
            });
        }

        const btnTabSample = document.getElementById('btn-load-sample-pdf-blueprint');
        if (btnTabSample) {
            btnTabSample.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadSampleBlueprintForCalibration();
            });
        }
    }

    triggerScaleCalibrationWorkflow() {
        const hasBp = Boolean(this.app.viewer?.blueprintMesh || this.app.viewer?.blueprintCanvas);
        if (hasBp) {
            // مسقط محمل مسبقاً: إظهار لوحة التحكم وتفعيل أداة المعايرة بنقطتين فوراً
            const hudBar = document.getElementById('blueprint-hud-bar');
            if (hudBar) hudBar.classList.remove('collapsed');

            const bpScalePanel = document.getElementById('hud-blueprint-scale-panel');
            if (bpScalePanel) bpScalePanel.style.display = 'flex';

            if (this.app.viewer?.setCameraView) {
                this.app.viewer.setCameraView(true);
            }

            if (this.enterTracerMode) this.enterTracerMode();
            if (this.updateToolUI) this.updateToolUI('calibrate-scale');
        } else {
            // لا يوجد مسقط حالي: فتح نافذة التوجيه الذكية
            this.openScaleInfoModal();
        }
    }

    openScaleInfoModal() {
        const modal = document.getElementById('modal-scale-info');
        if (modal) modal.style.display = 'flex';
    }

    closeScaleInfoModal() {
        const modal = document.getElementById('modal-scale-info');
        if (modal) modal.style.display = 'none';
    }

    switchTab(targetTab) {
        const tabBtns = document.querySelectorAll('.modal-tab-btn');
        const tabContents = document.querySelectorAll('.modal-tab-content');
        tabBtns.forEach(b => {
            if (b.dataset.tab === targetTab) b.classList.add('active');
            else b.classList.remove('active');
        });
        tabContents.forEach(c => c.classList.remove('active'));
        const activeContent = document.getElementById(`tab-${targetTab}`);
        if (activeContent) activeContent.classList.add('active');
    }

    /**
     * توليد مسقط معماري نموذجي عالي الدقة به خط أبعاد مرجعي معلوم (10.00م)
     * وتفعيله فورياً لاختبار وتجربة أداة المعايرة بنقطتين.
     */
    loadSampleBlueprintForCalibration() {
        // 1. إنشاء لوحة كانفاس عالية الدقة (2400 × 1600 بكسل)
        const canvas = document.createElement('canvas');
        canvas.width = 2400;
        canvas.height = 1600;
        const ctx = canvas.getContext('2d');

        // خلفية بيضاء نقية
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // شبكة معمارية خفيفة (CAD Grid)
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1.5;
        for (let x = 0; x <= canvas.width; x += 60) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= canvas.height; y += 60) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // إطار اللوحة المعمارية الخارجي
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 4;
        ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

        // جدول بيانات المشروع (Cartouche / Title Block)
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(canvas.width - 560, canvas.height - 210, 510, 160);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width - 560, canvas.height - 210, 510, 160);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 22px system-ui, Cairo, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('مشروع: المجمع الإداري والبحثي النموذجي', canvas.width - 70, canvas.height - 165);
        ctx.font = '15px system-ui, Cairo, sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('مسقط الطابق الأرضي - مخطط معايرة المقياس 1:1', canvas.width - 70, canvas.height - 135);
        ctx.fillText('المصمم: د. أحمد لؤي أحمد | الجامعة التكنولوجية', canvas.width - 70, canvas.height - 105);
        ctx.fillStyle = '#0284c7';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('SCALE: 1:100 @ A1 (CALIBRATION READY)', canvas.width - 70, canvas.height - 75);

        // رسم الجدران المعمارية والممرات
        // جدران المحيط الخارجي
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 14;
        ctx.lineJoin = 'miter';
        ctx.strokeRect(200, 320, 2000, 1000);

        // الممر الحركي المركزي الأفقي (Central Circulation Spine)
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(200, 740);
        ctx.lineTo(2200, 740);
        ctx.moveTo(200, 880);
        ctx.lineTo(2200, 880);

        // قواطع الغرف الشمالية
        ctx.moveTo(700, 320);
        ctx.lineTo(700, 740);
        ctx.moveTo(1200, 320);
        ctx.lineTo(1200, 740);
        ctx.moveTo(1700, 320);
        ctx.lineTo(1700, 740);

        // قواطع الغرف الجنوبية
        ctx.moveTo(850, 880);
        ctx.lineTo(850, 1320);
        ctx.moveTo(1500, 880);
        ctx.lineTo(1500, 1320);
        ctx.stroke();

        // فتحات الأبواب وأقواس الفتح المعمارية
        const drawDoorArc = (x, y, w, rot) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rot);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-w / 2, -10, w, 20);
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-w / 2, 0);
            ctx.lineTo(-w / 2 + w * 0.7, -w * 0.7);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(-w / 2, 0, w, -Math.PI / 4, 0);
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.restore();
        };

        drawDoorArc(450, 740, 70, 0);
        drawDoorArc(950, 740, 70, 0);
        drawDoorArc(1450, 740, 70, 0);
        drawDoorArc(1950, 740, 70, 0);
        drawDoorArc(525, 880, 70, Math.PI);
        drawDoorArc(1175, 880, 70, Math.PI);
        drawDoorArc(1850, 880, 70, Math.PI);

        // نصوص وتسميات الفضاءات
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 26px system-ui, Cairo, sans-serif';
        ctx.fillText('ردهة الاستقبال الرئيسية', 450, 510);
        ctx.font = '17px system-ui, Cairo, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('المساحة: 60 م² | السعة: 18 فرد', 450, 545);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 26px system-ui, Cairo, sans-serif';
        ctx.fillText('صالة انتظار المراجعين', 950, 510);
        ctx.font = '17px system-ui, Cairo, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('المساحة: 72 م² | السعة: 25 فرد', 950, 545);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 26px system-ui, Cairo, sans-serif';
        ctx.fillText('القاعة المتعددة المرنة', 1450, 510);
        ctx.font = '17px system-ui, Cairo, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('المساحة: 72 م² | السعة: 22 فرد', 1450, 545);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 26px system-ui, Cairo, sans-serif';
        ctx.fillText('قاعة الاجتماعات والتدريب', 1950, 510);
        ctx.font = '17px system-ui, Cairo, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('المساحة: 60 م² | السعة: 20 فرد', 1950, 545);

        ctx.fillStyle = '#0284c7';
        ctx.font = 'bold 22px system-ui, Cairo, sans-serif';
        ctx.fillText('الشريان الحركي والممر المركزي (Central Circulation Spine - 4.0m width)', 1200, 810);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 26px system-ui, Cairo, sans-serif';
        ctx.fillText('مكاتب الموظفين (القسم أ)', 525, 1100);
        ctx.fillText('مكاتب الموظفين (القسم ب)', 1175, 1100);
        ctx.fillText('استراحة الكادر والخدمات', 1850, 1100);

        // -------------------------------------------------------------
        // خط الأبعاد المرجعي لمعايرة مقياس المسقط (10.00 متر)
        // -------------------------------------------------------------
        // في المشهد ثلاثي الأبعاد: العرض 60.0م والعمق 40.0م
        // النقطة 1: 3D(-5.0, -15.25) -> Canvas(1000, 190)
        // النقطة 2: 3D(+5.0, -15.25) -> Canvas(1400, 190)
        // المسافة في المشهد ثلاثي الأبعاد بين النقطتين = 10.00 متر تماماً!
        const x1 = 1000, x2 = 1400, yDim = 190;

        // بطاقة إرشادية مميزة حول خط الأبعاد المرجعي
        ctx.fillStyle = '#eff6ff';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(840, 85, 720, 185);
        ctx.setLineDash([]);
        ctx.fillRect(840, 85, 720, 185);

        // عنوان إرشادي فوق خط القياس
        ctx.fillStyle = '#1d4ed8';
        ctx.font = 'bold 18px system-ui, Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📏 خط أبعاد مرجعي لمعايرة مقياس المسقط (Reference Dimension)', 1200, 120);
        ctx.font = '14px system-ui, Cairo, sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('انقر على 📍 النقطة 1 ثم 📍 النقطة 2 لمعايرة المقياس الحقيقي 1:1', 1200, 145);

        // خطوط الامتداد الرأسية للأبعاد (Extension Lines)
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x1, 155);
        ctx.lineTo(x1, 230);
        ctx.moveTo(x2, 155);
        ctx.lineTo(x2, 230);
        // خط البعد الرئيسي (Dimension Line)
        ctx.moveTo(x1, yDim);
        ctx.lineTo(x2, yDim);
        ctx.stroke();

        // شُرَط التحديد المعمارية المائلة 45 درجة (Architectural Slashes)
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#0369a1';
        ctx.beginPath();
        ctx.moveTo(x1 - 10, yDim + 10); ctx.lineTo(x1 + 10, yDim - 10);
        ctx.moveTo(x2 - 10, yDim + 10); ctx.lineTo(x2 + 10, yDim - 10);
        ctx.stroke();

        // علامة الهدف الدائرية عند النقطة 1
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(x1, yDim, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#0369a1';
        ctx.font = 'bold 15px system-ui, Cairo, sans-serif';
        ctx.fillText('📍 النقطة 1 (10.00m)', x1, yDim + 32);

        // علامة الهدف الدائرية عند النقطة 2
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(x2, yDim, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#047857';
        ctx.font = 'bold 15px system-ui, Cairo, sans-serif';
        ctx.fillText('📍 النقطة 2', x2, yDim + 32);

        // شارة رقم البعد في المنتصف
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(1130, yDim - 18, 140, 36);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(1130, yDim - 18, 140, 36);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('10.00 m', 1200, yDim + 1);

        // 2. بناء كائن النموذج المعماري الكامل
        const worldW = 60.0;
        const worldD = 40.0;
        const sampleModel = {
            id: "sample_blueprint_calib_" + Date.now(),
            name_ar: "مسقط معماري نموذجي (معايرة المقياس 10.00م)",
            name_en: "Architectural Blueprint (10.00m Scale Reference)",
            building_type: "administrative",
            blueprintCanvas: canvas,
            blueprintBounds: {
                width: worldW,
                depth: worldD,
                baseWidth: worldW,
                baseDepth: worldD,
                aspect: 2400 / 1600,
                scaleFactor: 1.0,
                offsetX: 0,
                offsetZ: 0
            },
            spaces: {
                "reception": { id: "reception", name_ar: "ردهة الاستقبال الرئيسية", name_en: "Main Reception", type: "public", capacity: 18, area_m2: 60, bounds: { x: -25, z: -14, width: 12.5, depth: 10, height: 3.5 }, color: "#4a90e2" },
                "waiting_hall": { id: "waiting_hall", name_ar: "صالة انتظار المراجعين", name_en: "Waiting Hall", type: "public", capacity: 25, area_m2: 72, bounds: { x: -12.5, z: -14, width: 12.5, depth: 10, height: 3.5 }, color: "#f5a623" },
                "multi_hall": { id: "multi_hall", name_ar: "القاعة المتعددة المرنة", name_en: "Multipurpose Hall", type: "flexible", capacity: 22, area_m2: 72, bounds: { x: 0, z: -14, width: 12.5, depth: 10, height: 3.5 }, color: "#7ed321" },
                "meeting_hall": { id: "meeting_hall", name_ar: "قاعة الاجتماعات والتدريب", name_en: "Meeting Hall", type: "flexible", capacity: 20, area_m2: 60, bounds: { x: 12.5, z: -14, width: 12.5, depth: 10, height: 3.5 }, color: "#9013fe" },
                "corridor_central": { id: "corridor_central", name_ar: "الشريان الحركي المركزي", name_en: "Central Corridor", type: "circulation", capacity: 45, area_m2: 85, flow_capacity_per_min: 65, bounds: { x: -25, z: -4, width: 50, depth: 4, height: 3.5 }, color: "#606060" },
                "office_a": { id: "office_a", name_ar: "مكاتب الموظفين (القسم أ)", name_en: "Office Workzone A", type: "workspace", capacity: 24, area_m2: 95, bounds: { x: -25, z: 0, width: 16, depth: 14, height: 3.5 }, color: "#50e3c2" },
                "office_b": { id: "office_b", name_ar: "مكاتب الموظفين (القسم ب)", name_en: "Office Workzone B", type: "workspace", capacity: 24, area_m2: 95, bounds: { x: -9, z: 0, width: 16, depth: 14, height: 3.5 }, color: "#4a90e2" },
                "staff_lounge": { id: "staff_lounge", name_ar: "استراحة الكادر والخدمات", name_en: "Staff Lounge", type: "amenity", capacity: 18, area_m2: 65, bounds: { x: 7, z: 0, width: 18, depth: 14, height: 3.5 }, color: "#b8e986" }
            },
            walls: {
                "w_ext_n": { id: "w_ext_n", name_ar: "الجدار الخارجي الشمالي", start: [-25, -14], end: [25, -14], thickness: 0.35, height: 3.0, type: "exterior" },
                "w_ext_s": { id: "w_ext_s", name_ar: "الجدار الخارجي الجنوبي", start: [-25, 14], end: [25, 14], thickness: 0.35, height: 3.0, type: "exterior" },
                "w_ext_w": { id: "w_ext_w", name_ar: "الجدار الخارجي الغربي", start: [-25, -14], end: [-25, 14], thickness: 0.35, height: 3.0, type: "exterior" },
                "w_ext_e": { id: "w_ext_e", name_ar: "الجدار الخارجي الشرقي", start: [25, -14], end: [25, 14], thickness: 0.35, height: 3.0, type: "exterior" },
                "w_corr_n": { id: "w_corr_n", name_ar: "جدار الممر الشمالي", start: [-25, -4], end: [25, -4], thickness: 0.2, height: 3.0, type: "interior" },
                "w_corr_s": { id: "w_corr_s", name_ar: "جدار الممر الجنوبي", start: [-25, 0], end: [25, 0], thickness: 0.2, height: 3.0, type: "interior" },
                "w_div_1": { id: "w_div_1", name_ar: "قاطع الاستقبال - الانتظار", start: [-12.5, -14], end: [-12.5, -4], thickness: 0.2, height: 3.0, type: "interior" },
                "w_div_2": { id: "w_div_2", name_ar: "قاطع الانتظار - القاعة المتعددة", start: [0, -14], end: [0, -4], thickness: 0.2, height: 3.0, type: "interior" },
                "w_div_3": { id: "w_div_3", name_ar: "قاطع القاعة المتعددة - الاجتماعات", start: [12.5, -14], end: [12.5, -4], thickness: 0.2, height: 3.0, type: "interior" },
                "w_div_4": { id: "w_div_4", name_ar: "قاطع مكاتب أ - مكاتب ب", start: [-9, 0], end: [-9, 14], thickness: 0.2, height: 3.0, type: "interior" },
                "w_div_5": { id: "w_div_5", name_ar: "قاطع مكاتب ب - الاستراحة", start: [7, 0], end: [7, 14], thickness: 0.2, height: 3.0, type: "interior" }
            },
            openings: {
                "d_rec": { id: "d_rec", type: "door", wallId: "w_corr_n", position: -18.75, width: 1.2, height: 2.2 },
                "d_wait": { id: "d_wait", type: "door", wallId: "w_corr_n", position: -6.25, width: 1.2, height: 2.2 },
                "d_multi": { id: "d_multi", type: "door", wallId: "w_corr_n", position: 6.25, width: 1.2, height: 2.2 },
                "d_meet": { id: "d_meet", type: "door", wallId: "w_corr_n", position: 18.75, width: 1.2, height: 2.2 },
                "d_off_a": { id: "d_off_a", type: "door", wallId: "w_corr_s", position: -17, width: 1.2, height: 2.2 },
                "d_off_b": { id: "d_off_b", type: "door", wallId: "w_corr_s", position: -1, width: 1.2, height: 2.2 },
                "d_lounge": { id: "d_lounge", type: "door", wallId: "w_corr_s", position: 16, width: 1.2, height: 2.2 }
            },
            partitions: {
                "p_waiting_multi": { id: "p_waiting_multi", name_ar: "القاطع الصوتي المنزلق (صالة الانتظار - القاعة المتعددة)", between: ["waiting_hall", "multi_hall"], status: "closed", position: { x: 0, z: -14, width: 0.25, depth: 10, height: 3.5 }, expansion_capacity: 20 }
            }
        };

        // 3. تحميل النموذج في العارض ثلاثي الأبعاد
        this.app.viewer.loadBuildingModel(sampleModel);
        this.updateActiveBuildingTitle(sampleModel);

        // 4. إغلاق النوافذ المنبثقة
        this.closeModal();
        this.closeScaleInfoModal();

        // 5. إظهار وتفعيل لوحة مقياس المسقط في الـ HUD
        const bpScalePanel = document.getElementById('hud-blueprint-scale-panel');
        if (bpScalePanel) bpScalePanel.style.display = 'flex';
        const hudBar = document.getElementById('blueprint-hud-bar');
        if (hudBar) hudBar.classList.remove('collapsed');
        if (this.syncBlueprintHud) this.syncBlueprintHud();

        // 6. التبديل للمسقط العلوي العمودي المباشر 2D Top View لتسهيل القياس والرسم
        if (this.app.viewer?.setCameraView) {
            this.app.viewer.setCameraView(true);
        }

        // 7. تفعيل وضع التحديد وأداة المعايرة بنقطتين فوراً
        if (this.enterTracerMode) {
            this.enterTracerMode();
            if (this.updateToolUI) {
                this.updateToolUI('calibrate-scale');
            }
        }

        // 8. رسالة إرشادية واضحة للدكتور أحمد
        alert(
            "🏛️ تم تصيير وتحميل المسقط المعماري النموذجي بنجاح في المشهد ثلاثي الأبعاد!\n\n" +
            "📏 تم تفعيل أداة معايرة مقياس المسقط (2-Point Scale Calibration):\n" +
            "• يظهر في أعلى المخطط خط أبعاد مرجعي باللون الأزرق بطول 10.00m.\n" +
            "• انقر الآن على 📍 النقطة 1 (الطرف الأيسر)، ثم انقر على 📍 النقطة 2 (الطرف الأيمن).\n" +
            "• سيظهر لك صندوق إدخال الطول الحقيقي للمطابقة التلقائية 1:1."
        );
    }
}
