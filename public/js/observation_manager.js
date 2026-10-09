/**
 * js/observation_manager.js
 * Adaptive Digital Twin Platform - Field Observation & Survey Data Manager
 * 
 * المطور: م.م.د. أحمد لؤي أحمد
 * الغرض: إدارة مدخلات الملاحظة والرصد الميداني للفضاءات الحقيقية (المحاكم، المستشفيات، المدارس، المباني الإدارية)
 * عبر أشرطة تمرير تفاعلية فورية (Manual Sliders) واستيراد ملفات مجدولة (CSV / Excel)
 * وربطها بنظام التكيف المكاني والقواطع المنزلقة ثلاثية الأبعاد 3D.
 */

class ObservationManager {
    constructor(app) {
        this.app = app;
        this.activeHour = '09:00';
        this.isPlayingTimelapse = false;
        this.timelapseTimer = null;
        this.observationReadings = {}; // { space_id: count }
        this.csvRecords = [];
        this.timelapseHours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
        this.activeTab = 'sliders'; // 'sliders' | 'csv' | 'timelapse'

        this.init();
    }

    init() {
        this.bindModalTriggers();
        this.setupTabs();
        this.setupCsvImporter();
        this.setupTimelapseControls();
    }

    bindModalTriggers() {
        const modal = document.getElementById('observation-modal');
        const btnHeader = document.getElementById('btn-open-observation-modal');
        const btnSidebar = document.getElementById('btn-sidebar-open-observation');
        const btnClose = document.getElementById('btn-close-observation-modal');

        const openModal = () => {
            if (!modal) return;
            modal.classList.add('active');
            this.refreshSpaceSliders();
            this.updateAdaptiveRecommendations();
        };

        const closeModal = () => {
            if (!modal) return;
            modal.classList.remove('active');
            this.stopTimelapse();
        };

        if (btnHeader) btnHeader.addEventListener('click', openModal);
        if (btnSidebar) btnSidebar.addEventListener('click', openModal);
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

        this.openModal = openModal;
        this.closeModal = closeModal;
    }

    setupTabs() {
        const tabBtns = document.querySelectorAll('.obs-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.obsTab;
                if (!targetTab) return;

                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                document.querySelectorAll('.obs-tab-content').forEach(c => {
                    c.style.display = 'none';
                });

                const content = document.getElementById(`obs-tab-${targetTab}`);
                if (content) content.style.display = 'block';

                this.activeTab = targetTab;
                if (targetTab === 'sliders') {
                    this.refreshSpaceSliders();
                }
            });
        });
    }

    /**
     * تُستدعى عند تحميل أو تبديل أي مبنى / دراسة حالة في المنصة
     */
    onModelLoaded(modelData) {
        this.observationReadings = {};
        this.refreshSpaceSliders();
        this.updateAdaptiveRecommendations();
    }

    /**
     * استخراج الفضاءات الحالية من النموذج المعماري
     */
    getActiveSpaces() {
        const bData = this.app?.viewer?.buildingData || this.app?.viewer?.currentModel || {};
        const spaces = bData.spaces || {};
        return Object.entries(spaces).map(([id, sp]) => ({
            id,
            name: sp.name_ar || sp.name || id,
            type: sp.type || 'space',
            capacity: sp.capacity || 15,
            area: sp.area || (sp.dimensions ? +(sp.dimensions.x * sp.dimensions.y).toFixed(1) : 25)
        }));
    }

    /**
     * إعادة بناء وتحديث أشرطة التمرير للفضاءات
     */
    refreshSpaceSliders() {
        const container = document.getElementById('obs-spaces-sliders-list');
        if (!container) return;

        const spaces = this.getActiveSpaces();
        if (spaces.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px;">
                    ⚠️ لم يتم العثور على فضاءات معمارية في النموذج النشط. يرجى اختيار دراسة حالة أو رفع مخطط BIM.
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        spaces.forEach(sp => {
            const currentCount = (this.observationReadings[sp.id] !== undefined)
                ? this.observationReadings[sp.id]
                : Math.round(sp.capacity * 0.5);

            this.observationReadings[sp.id] = currentCount;

            const maxSlider = Math.max(120, Math.round(sp.capacity * 2.5));
            const ratio = (currentCount / Math.max(1, sp.capacity)) * 100;

            let statusClass = 'normal';
            let statusText = '🟢 طبيعي';
            if (ratio > 100) {
                statusClass = 'danger';
                statusText = '🚨 تكدس حاد يتطلب تدخلاً';
            } else if (ratio >= 80) {
                statusClass = 'warning';
                statusText = '🟡 إشغال مرتفع';
            }

            const card = document.createElement('div');
            card.className = `obs-space-card ${statusClass}`;
            card.id = `obs-card-${sp.id}`;

            card.innerHTML = `
                <div class="obs-card-header">
                    <div class="obs-card-info">
                        <span class="obs-space-icon">🏛️</span>
                        <div>
                            <div class="obs-space-name">${sp.name}</div>
                            <div class="obs-space-meta">ID: <code class="inline-code">${sp.id}</code> &bull; المساحة: ${sp.area} م² &bull; السعة التصميمية: <strong>${sp.capacity} فرد</strong></div>
                        </div>
                    </div>
                    <div class="obs-status-tag ${statusClass}" id="obs-status-${sp.id}">
                        ${statusText} (<span id="obs-ratio-val-${sp.id}">${ratio.toFixed(0)}%</span>)
                    </div>
                </div>

                <div class="obs-slider-control-row">
                    <div class="obs-slider-track-wrap">
                        <input type="range" class="obs-range-input" id="slider-${sp.id}"
                               min="0" max="${maxSlider}" value="${currentCount}"
                               data-space-id="${sp.id}" data-capacity="${sp.capacity}">
                        <div class="obs-progress-bar">
                            <div class="obs-progress-fill ${statusClass}" id="fill-${sp.id}" style="width: ${Math.min(100, ratio)}%;"></div>
                        </div>
                    </div>
                    <div class="obs-number-wrap">
                        <input type="number" class="obs-number-input" id="num-${sp.id}"
                               min="0" max="${maxSlider}" value="${currentCount}"
                               data-space-id="${sp.id}">
                        <span class="obs-unit-label">فرد</span>
                    </div>
                </div>
            `;

            // ربط أحداث الشريط والحقل الرقمي
            const slider = card.querySelector(`#slider-${sp.id}`);
            const numInput = card.querySelector(`#num-${sp.id}`);

            const onValueChange = (newVal) => {
                const count = Math.max(0, parseInt(newVal, 10) || 0);
                this.observationReadings[sp.id] = count;
                slider.value = count;
                numInput.value = count;

                this.updateCardStatus(sp.id, count, sp.capacity);
                this.applyLiveObservation();
            };

            slider.addEventListener('input', (e) => onValueChange(e.target.value));
            numInput.addEventListener('change', (e) => onValueChange(e.target.value));

            container.appendChild(card);
        });

        this.setupPresetButtons();
    }

    /**
     * تحديث ألوان وشارات البطاقة عند تغيير قيمة الإشغال
     */
    updateCardStatus(spaceId, count, capacity) {
        const card = document.getElementById(`obs-card-${spaceId}`);
        const statusTag = document.getElementById(`obs-status-${spaceId}`);
        const ratioEl = document.getElementById(`obs-ratio-val-${spaceId}`);
        const fill = document.getElementById(`fill-${spaceId}`);
        if (!card || !statusTag || !fill) return;

        const ratio = (count / Math.max(1, capacity)) * 100;
        if (ratioEl) ratioEl.textContent = `${ratio.toFixed(0)}%`;

        let statusClass = 'normal';
        let statusText = '🟢 طبيعي';
        if (ratio > 100) {
            statusClass = 'danger';
            statusText = '🚨 تكدس حاد يتطلب تدخلاً';
        } else if (ratio >= 80) {
            statusClass = 'warning';
            statusText = '🟡 إشغال مرتفع';
        }

        card.className = `obs-space-card ${statusClass}`;
        statusTag.className = `obs-status-tag ${statusClass}`;
        statusTag.innerHTML = `${statusText} (<span id="obs-ratio-val-${spaceId}">${ratio.toFixed(0)}%</span>)`;

        fill.className = `obs-progress-fill ${statusClass}`;
        fill.style.width = `${Math.min(100, ratio)}%`;
    }

    /**
     * سيناريوهات الضغط السريع للملاحظة الميدانية
     */
    setupPresetButtons() {
        const btnCourtRush = document.getElementById('btn-preset-court-rush');
        const btnChoke = document.getElementById('btn-preset-corridor-choke');
        const btnNormal = document.getElementById('btn-preset-balanced');
        const btnZero = document.getElementById('btn-preset-zero-all');

        if (btnCourtRush) {
            btnCourtRush.onclick = () => {
                this.applyScenarioPreset('rush');
            };
        }
        if (btnChoke) {
            btnChoke.onclick = () => {
                this.applyScenarioPreset('choke');
            };
        }
        if (btnNormal) {
            btnNormal.onclick = () => {
                this.applyScenarioPreset('normal');
            };
        }
        if (btnZero) {
            btnZero.onclick = () => {
                this.applyScenarioPreset('zero');
            };
        }
    }

    applyScenarioPreset(presetType) {
        const spaces = this.getActiveSpaces();
        spaces.forEach(sp => {
            let count = Math.round(sp.capacity * 0.5);
            const isWaitOrLobby = sp.id.includes('wait') || sp.id.includes('reception') || sp.id.includes('court') || sp.id.includes('citizen') || sp.id.includes('lobby');

            if (presetType === 'rush') {
                count = isWaitOrLobby ? Math.round(sp.capacity * 1.55) : Math.round(sp.capacity * 0.35);
            } else if (presetType === 'choke') {
                const isCorridor = sp.type === 'circulation' || sp.id.includes('corridor') || isWaitOrLobby;
                count = isCorridor ? Math.round(sp.capacity * 1.40) : Math.round(sp.capacity * 0.40);
            } else if (presetType === 'normal') {
                count = Math.round(sp.capacity * 0.55);
            } else if (presetType === 'zero') {
                count = 0;
            }

            this.observationReadings[sp.id] = count;
            const slider = document.getElementById(`slider-${sp.id}`);
            const num = document.getElementById(`num-${sp.id}`);
            if (slider) slider.value = count;
            if (num) num.value = count;
            this.updateCardStatus(sp.id, count, sp.capacity);
        });

        this.applyLiveObservation();
    }

    /**
     * تطبيق الملاحظة الميدانية فورياً في المشهد ثلاثي الأبعاد والـ HUD
     */
    applyLiveObservation() {
        const bData = this.app?.viewer?.buildingData || this.app?.viewer?.currentModel || {};
        const partitions = bData.partitions || {};
        const spaces = bData.spaces || {};

        // 1. تحديد الفضاءات المكتظة والسعة الفعالة
        const overcrowded = [];
        for (const [id, count] of Object.entries(this.observationReadings)) {
            const sp = spaces[id];
            if (!sp) continue;

            let effectiveCap = sp.capacity || 15;
            for (const [pId, part] of Object.entries(partitions)) {
                const isPartOpen = (this.app?.viewer?.partitionMeshes?.[pId]?.status === 'open') || (part.status === 'open');
                if (isPartOpen && part.between && part.between.includes(id)) {
                    effectiveCap += (part.expansion_capacity || 18);
                    break;
                }
            }

            if (count > effectiveCap) {
                overcrowded.push({ id, count, effectiveCap, ratio: (count / effectiveCap) * 100 });
            }
        }

        // 2. تحديث المشهد ثلاثي الأبعاد
        const currentState = {
            step: Math.floor(Date.now() / 1500),
            scenario: 'field_observation',
            layout_mode: this.app.isAdaptive ? 'kinetic' : 'baseline',
            sensor_readings: { ...this.observationReadings },
            corridor_flows: {
                corridor_central: overcrowded.length > 0 ? 56.0 : 26.0,
                lobby_transition: 28.0
            },
            partitions: partitions,
            evaluation: {
                layout_mode: this.app.isAdaptive ? 'kinetic' : 'baseline',
                overcrowded_spaces: overcrowded.map(o => o.id),
                spatial_balance: overcrowded.length > 0 ? 64.5 : 88.0,
                walking_distance_effort: overcrowded.length > 0 ? 5400 : 3600
            }
        };

        if (this.app.viewer) {
            this.app.viewer.updateRealtimeState(currentState);
        }
        if (this.app.analytics) {
            this.app.analytics.updateDashboard(currentState);
        }

        // 3. إرسال إلى خادم بايثون إن وُجد
        try {
            fetch('/api/observation/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    readings: this.observationReadings,
                    hour: this.activeHour,
                    overcrowded: overcrowded.map(o => o.id)
                })
            }).catch(() => {});
        } catch (_) {}

        // 4. تحديث صندوق التوصيات التكيفية
        this.updateAdaptiveRecommendations(overcrowded);
    }

    /**
     * تحديث بطاقة التوصيات التكيفية الذكية داخل النافذة
     */
    updateAdaptiveRecommendations(overcrowdedList) {
        const container = document.getElementById('obs-adaptive-recommendation-box');
        if (!container) return;

        const spaces = this.getActiveSpaces();
        const bData = this.app?.viewer?.buildingData || this.app?.viewer?.currentModel || {};
        const partitions = bData.partitions || {};

        const overcrowded = overcrowdedList || spaces.filter(sp => {
            const count = this.observationReadings[sp.id] || 0;
            return count > sp.capacity;
        });

        if (overcrowded.length === 0) {
            container.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px; color:#10b981; font-size:12.5px; font-weight:600;">
                    <span style="font-size:18px;">✅</span>
                    <span>كافة الفضاءات ضمن حدود السعة التصميمية المقبولة. لا يوجد تكدس ميداني حالياً.</span>
                </div>
            `;
            return;
        }

        const firstOver = overcrowded[0];
        const spInfo = spaces.find(s => s.id === (firstOver.id || firstOver)) || { name: 'الفضاء الرئيسي' };

        // البحث عن قاطع منزلق مجاور لهذا الفضاء
        let linkedPartition = null;
        for (const [pId, part] of Object.entries(partitions)) {
            if (part.between && part.between.includes(spInfo.id)) {
                linkedPartition = { id: pId, ...part };
                break;
            }
        }

        const pName = linkedPartition ? (linkedPartition.name_ar || linkedPartition.id) : 'القاطع التكيفي المنزلق (P1)';
        const expCap = linkedPartition ? (linkedPartition.expansion_capacity || 18) : 18;

        container.innerHTML = `
            <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 8px; padding: 12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <strong style="color: #fca5a5; font-size:13px;">🚨 تنبيه تكدس ميداني استناداً إلى بيانات الملاحظة</strong>
                    <span style="font-size:11px; padding:2px 8px; background:#ef4444; color:#fff; border-radius:10px; font-weight:bold;">${overcrowded.length} فضاء مكتظ</span>
                </div>
                <p style="font-size:12px; color:var(--text-main); margin-bottom:10px; line-height:1.6;">
                    رصد تكدس في <strong>"${spInfo.name}"</strong> يتجاوز السعة الاستيعابية. 
                    يقترح التوأم الرقمي فتح <strong>"${pName}"</strong> لدمج الفضاء ورفع السعة الاستيعابية فورياً بمقدار <strong>+${expCap} فرداً</strong>.
                </p>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn btn-primary" id="btn-obs-apply-kinetic" style="font-size:12px; padding:6px 14px; background:linear-gradient(135deg, #0284c7, #0369a1); border-color:#38bdf8;">
                        🚪 فتح القاطع وتطبيق التكيف الحركي 3D
                    </button>
                    <button class="btn btn-secondary" id="btn-obs-apply-swap" style="font-size:12px; padding:6px 14px; background:rgba(16,185,129,0.15); border-color:#10b981; color:#a7f3d0;">
                        🔄 التوزيع الوظيفي الأمثل للمسارات
                    </button>
                </div>
            </div>
        `;

        const btnKinetic = container.querySelector('#btn-obs-apply-kinetic');
        if (btnKinetic) {
            btnKinetic.onclick = async () => {
                if (this.app.openAllPartitions) {
                    await this.app.openAllPartitions();
                } else if (this.app.applyReconfiguration) {
                    await this.app.applyReconfiguration('kinetic');
                }
                this.refreshSpaceSliders();
                this.updateAdaptiveRecommendations();
            };
        }

        const btnSwap = container.querySelector('#btn-obs-apply-swap');
        if (btnSwap) {
            btnSwap.onclick = async () => {
                if (this.app.applyReconfiguration) {
                    await this.app.applyReconfiguration('functional_swap');
                }
                this.refreshSpaceSliders();
                this.updateAdaptiveRecommendations();
            };
        }
    }

    /**
     * إعداد وحدة استيراد ملفات الملاحظة (CSV / Excel)
     */
    setupCsvImporter() {
        const dropzone = document.getElementById('obs-csv-dropzone');
        const fileInput = document.getElementById('obs-csv-file-input');
        const btnTemplate = document.getElementById('btn-download-obs-template');
        const btnApplyCsv = document.getElementById('btn-apply-csv-readings');

        if (btnTemplate) {
            btnTemplate.onclick = () => this.downloadCsvTemplate();
        }

        if (dropzone && fileInput) {
            dropzone.onclick = () => fileInput.click();

            dropzone.ondragover = (e) => {
                e.preventDefault();
                dropzone.classList.add('drag-over');
            };

            dropzone.ondragleave = () => {
                dropzone.classList.remove('drag-over');
            };

            dropzone.ondrop = (e) => {
                e.preventDefault();
                dropzone.classList.remove('drag-over');
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    this.handleCsvFile(e.dataTransfer.files[0]);
                }
            };

            fileInput.onchange = (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.handleCsvFile(e.target.files[0]);
                }
            };
        }

        if (btnApplyCsv) {
            btnApplyCsv.onclick = () => {
                this.applyCsvDataToBuilding();
            };
        }
    }

    /**
     * توليد وتحميل نموذج ملف CSV فارغ ومنسق وفقاً لفضاءات المبنى
     */
    downloadCsvTemplate() {
        const spaces = this.getActiveSpaces();
        let csvContent = "\uFEFFspace_id,space_name,observation_hour,visitors_count,staff_count,notes\n";

        const sampleHours = ['09:00', '10:00', '11:00'];
        sampleHours.forEach(h => {
            spaces.forEach(sp => {
                const sampleVisitors = Math.round(sp.capacity * (h === '10:00' ? 1.4 : 0.6));
                const sampleStaff = Math.max(2, Math.round(sp.capacity * 0.15));
                csvContent += `"${sp.id}","${sp.name}","${h}",${sampleVisitors},${sampleStaff},"رصد ميداني تجريبي"\n`;
            });
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `field_observation_survey_template_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * قراءة ومعالجة ملف CSV المرفوع
     */
    handleCsvFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            this.parseCsvContent(text, file.name);
        };
        reader.readAsText(file, 'UTF-8');
    }

    parseCsvContent(csvText, fileName) {
        const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) {
            alert('الملف المرفوع فارغ أو لا يحتوي على صفوف بيانات.');
            return;
        }

        const headerLine = lines[0].replace(/^\uFEFF/, '').trim();
        const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

        const idIdx = headers.findIndex(h => h.includes('space_id') || h.includes('id') || h.includes('فضاء'));
        const nameIdx = headers.findIndex(h => h.includes('space_name') || h.includes('name') || h.includes('اسم'));
        const hourIdx = headers.findIndex(h => h.includes('hour') || h.includes('time') || h.includes('ساعة'));
        const visitorsIdx = headers.findIndex(h => h.includes('visitors') || h.includes('مراجع') || h.includes('زائر'));
        const staffIdx = headers.findIndex(h => h.includes('staff') || h.includes('كوادر') || h.includes('موظف'));
        const notesIdx = headers.findIndex(h => h.includes('note') || h.includes('ملاحظ'));

        this.csvRecords = [];
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
            if (row.length < 2) continue;

            const spaceId = row[idIdx !== -1 ? idIdx : 0] || `space_${i}`;
            const spaceName = row[nameIdx !== -1 ? nameIdx : 1] || spaceId;
            const hour = row[hourIdx !== -1 ? hourIdx : 2] || '09:00';
            const visitors = parseInt(row[visitorsIdx !== -1 ? visitorsIdx : 3], 10) || 0;
            const staff = parseInt(row[staffIdx !== -1 ? staffIdx : 4], 10) || 0;
            const notes = row[notesIdx !== -1 ? notesIdx : 5] || '';

            this.csvRecords.push({
                spaceId,
                spaceName,
                hour,
                visitors,
                staff,
                total: visitors + staff,
                notes
            });
        }

        this.renderCsvPreview(fileName);
    }

    renderCsvPreview(fileName) {
        const previewContainer = document.getElementById('obs-csv-preview-container');
        const countBadge = document.getElementById('obs-csv-count-badge');
        const tableBody = document.getElementById('obs-csv-table-body');
        const btnApply = document.getElementById('btn-apply-csv-readings');

        if (!previewContainer || !tableBody) return;

        previewContainer.style.display = 'block';
        if (countBadge) {
            countBadge.textContent = `${this.csvRecords.length} سجل مقروء من (${fileName})`;
        }
        if (btnApply) btnApply.style.display = 'inline-flex';

        tableBody.innerHTML = '';
        const spaces = this.getActiveSpaces();

        this.csvRecords.slice(0, 50).forEach((rec, idx) => {
            const sp = spaces.find(s => s.id === rec.spaceId || s.name === rec.spaceName);
            const cap = sp ? sp.capacity : 20;
            const ratio = (rec.total / cap) * 100;
            const isDanger = ratio > 100;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${idx + 1}</td>
                <td><strong>${rec.spaceName}</strong> <br/><small style="color:var(--text-muted);">${rec.spaceId}</small></td>
                <td><span class="obs-hour-badge">⏰ ${rec.hour}</span></td>
                <td>${rec.visitors} فرد</td>
                <td>${rec.staff} فرد</td>
                <td><strong>${rec.total}</strong></td>
                <td>
                    <span class="obs-status-tag ${isDanger ? 'danger' : 'normal'}">
                        ${ratio.toFixed(0)}% ${isDanger ? '⚠️ تكدس' : '✅'}
                    </span>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    applyCsvDataToBuilding() {
        if (!this.csvRecords || this.csvRecords.length === 0) return;

        // تطبيق قراءات الساعة الأولى أو النشطة
        const currentHour = this.activeHour;
        const hourRecords = this.csvRecords.filter(r => r.hour === currentHour);
        const recordsToApply = hourRecords.length > 0 ? hourRecords : this.csvRecords;

        recordsToApply.forEach(rec => {
            this.observationReadings[rec.spaceId] = rec.total;
        });

        this.refreshSpaceSliders();
        this.applyLiveObservation();

        alert(`✅ تم تطبيق بيانات الرصد الميداني بنجاح لـ (${recordsToApply.length}) فضاء معماري. تم تحديث المشهد ثلاثي الأبعاد والـ HUD.`);
    }

    /**
     * إعداد محاكاة ساعات الرصد الزمني (Day Time-Playback Timelapse)
     */
    setupTimelapseControls() {
        const hourBtns = document.querySelectorAll('.obs-hour-btn');
        const btnPlay = document.getElementById('btn-timelapse-play');

        hourBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const hour = btn.dataset.hour;
                if (!hour) return;

                hourBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                this.activeHour = hour;
                this.simulateHourObservations(hour);
            });
        });

        if (btnPlay) {
            btnPlay.onclick = () => {
                this.toggleTimelapse();
            };
        }
    }

    simulateHourObservations(hour) {
        const spaces = this.getActiveSpaces();
        const hourNumber = parseInt(hour.split(':')[0], 10) || 9;

        // مصفوفة معاملات الإشغال خلال ساعات العمل اليومية
        // 08:00 (وصول 40%)، 09:00 (تصاعد 75%)، 10:00 (ذروة 140%)، 11:00 (ذروة 130%)، 12:00 (انخفاض 80%)، 13:00 (هدوء 45%)، 14:00 (انصراف 20%)
        let factor = 0.5;
        if (hourNumber === 8) factor = 0.40;
        else if (hourNumber === 9) factor = 0.85;
        else if (hourNumber === 10) factor = 1.45;
        else if (hourNumber === 11) factor = 1.30;
        else if (hourNumber === 12) factor = 0.75;
        else if (hourNumber === 13) factor = 0.50;
        else if (hourNumber >= 14) factor = 0.25;

        spaces.forEach(sp => {
            const isLobby = sp.id.includes('wait') || sp.id.includes('court') || sp.id.includes('citizen') || sp.id.includes('lobby');
            const roomFactor = isLobby ? factor : Math.min(0.9, factor * 0.7);
            const count = Math.round(sp.capacity * roomFactor);
            this.observationReadings[sp.id] = count;

            const slider = document.getElementById(`slider-${sp.id}`);
            const num = document.getElementById(`num-${sp.id}`);
            if (slider) slider.value = count;
            if (num) num.value = count;
            this.updateCardStatus(sp.id, count, sp.capacity);
        });

        this.applyLiveObservation();
    }

    toggleTimelapse() {
        if (this.isPlayingTimelapse) {
            this.stopTimelapse();
        } else {
            this.startTimelapse();
        }
    }

    startTimelapse() {
        this.isPlayingTimelapse = true;
        const btnPlay = document.getElementById('btn-timelapse-play');
        if (btnPlay) {
            btnPlay.innerHTML = `<span>⏸️</span><span>إيقاف المحاكاة المؤقت</span>`;
            btnPlay.classList.add('playing');
        }

        let currentIdx = this.timelapseHours.indexOf(this.activeHour);
        if (currentIdx === -1) currentIdx = 0;

        this.timelapseTimer = setInterval(() => {
            currentIdx = (currentIdx + 1) % this.timelapseHours.length;
            const nextHour = this.timelapseHours[currentIdx];
            this.activeHour = nextHour;

            const hourBtns = document.querySelectorAll('.obs-hour-btn');
            hourBtns.forEach(b => {
                b.classList.toggle('active', b.dataset.hour === nextHour);
            });

            this.simulateHourObservations(nextHour);
        }, 2200);
    }

    stopTimelapse() {
        this.isPlayingTimelapse = false;
        if (this.timelapseTimer) {
            clearInterval(this.timelapseTimer);
            this.timelapseTimer = null;
        }
        const btnPlay = document.getElementById('btn-timelapse-play');
        if (btnPlay) {
            btnPlay.innerHTML = `<span>▶️</span><span>تشغيل المحاكاة الزمنية (Timelapse)</span>`;
            btnPlay.classList.remove('playing');
        }
    }
}

// جعل الفئة متاحة عالمياً في المتصفح
window.ObservationManager = ObservationManager;
