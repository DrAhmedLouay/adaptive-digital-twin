// public/js/analytics.js
/**
 * Academic Analytics & Performance Engine
 * Displays spatial KPIs, updates the Before vs After comparison matrix,
 * handles IoT telemetry streams, and data export for thesis validation.
 */

class TwinAnalytics {
    constructor() {
        this.balanceScoreEl = document.getElementById('kpi-balance-score');
        this.circWorkEl = document.getElementById('kpi-circ-work');
        this.overcrowdCountEl = document.getElementById('kpi-overcrowd-count');
        this.corridorFlowEl = document.getElementById('kpi-corridor-flow');
        this.co2LevelEl = document.getElementById('kpi-co2-level');
        this.activeActionsEl = document.getElementById('kpi-active-actions');
        this.actionFeedEl = document.getElementById('action-feed-container');
        
        // عناصر جدول المقارنة الأكاديمي
        this.tableBaselineBalance = document.getElementById('tb-baseline-balance');
        this.tableAdaptedBalance = document.getElementById('tb-adapted-balance');
        this.tableGainBalance = document.getElementById('tb-gain-balance');

        this.tableBaselineOvercrowd = document.getElementById('tb-baseline-overcrowd');
        this.tableAdaptedOvercrowd = document.getElementById('tb-adapted-overcrowd');
        this.tableGainOvercrowd = document.getElementById('tb-gain-overcrowd');

        this.tableBaselineCirc = document.getElementById('tb-baseline-circ');
        this.tableAdaptedCirc = document.getElementById('tb-adapted-circ');
        this.tableGainCirc = document.getElementById('tb-gain-circ');

        // جداول مستشعرات IoT في النافذة المنبثقة
        this.iotTelemetryTbody = document.getElementById('iot-telemetry-tbody');
        this.iotDoorsTbody = document.getElementById('iot-doors-tbody');
        this.iotSensorsInventoryTbody = document.getElementById('iot-sensors-inventory-tbody');
        this.formAddIoTSensor = document.getElementById('form-add-iot-sensor');
        this.sensorTypeSelect = document.getElementById('iot-new-sensor-type');
        this.sensorTargetSelect = document.getElementById('iot-new-sensor-target');
        this.sensorNameInput = document.getElementById('iot-new-sensor-name');

        this.lastExportData = null;
        this.lastTelemetryData = null;

        this.initIoTSensorManagement();
    }

    async updateDashboard(data) {
        if (!data || !data.evaluation) return;
        const evalData = data.evaluation;
        const currentKpis = evalData.current_kpis || {};
        const baselineKpis = evalData.baseline_kpis || {};
        const summary = evalData.improvement_summary || {};
        const flows = data.corridor_flows || {};

        this.lastExportData = data;

        // 1. تحديث بطاقات الـ HUD العلوية
        if (this.balanceScoreEl) {
            this.balanceScoreEl.textContent = `${currentKpis.spatial_balance_score || 0}%`;
        }
        if (this.overcrowdCountEl) {
            const count = (currentKpis.overcrowded_rooms || []).length;
            this.overcrowdCountEl.textContent = count;
            const parentCard = this.overcrowdCountEl.closest('.hud-card');
            if (parentCard) {
                parentCard.className = `hud-card ${count > 0 ? 'accent-red' : 'accent-green'}`;
            }
        }
        if (this.corridorFlowEl) {
            const mainFlow = flows.corridor_central || 0;
            this.corridorFlowEl.textContent = `${mainFlow.toFixed(1)} ش/د`;
        }
        if (this.activeActionsEl) {
            const actionsCount = (evalData.actions || []).length;
            this.activeActionsEl.textContent = actionsCount;
        }

        // 2. تحديث جدول المقارنة الأكاديمي (Before vs After)
        this.updateComparisonTable(baselineKpis, currentKpis, summary);

        // 3. تحديث شريط قرارات التكيف الحية
        this.updateActionFeed(evalData.actions || []);

        // 4. جلب وتحديث دفق مستشعرات IoT ومؤشرات إجهاد الحركة والـ CO2
        this.fetchAndUpdateIoTTelemetry();
    }

    async fetchAndUpdateIoTTelemetry() {
        try {
            const res = await fetch('/api/iot/telemetry');
            if (!res.ok) return;
            const iot = await res.json();
            this.lastTelemetryData = iot;

            const kpis = iot.kpis || {};
            const zones = iot.zone_telemetry || {};
            const doors = iot.door_counters || {};

            // أ. تحديث إجهاد الحركة (Circulation Work: W = sum(Fij * Dij))
            if (this.circWorkEl && kpis.total_circulation_work !== undefined) {
                this.circWorkEl.textContent = Math.round(kpis.total_circulation_work);
            }

            // ب. حساب متوسط غاز CO2 وتحديث الـ HUD
            const zoneList = Object.values(zones);
            if (zoneList.length > 0 && this.co2LevelEl) {
                const avgCo2 = Math.round(zoneList.reduce((acc, z) => acc + (z.co2_ppm || 420), 0) / zoneList.length);
                this.co2LevelEl.textContent = `${avgCo2} ppm`;
                const co2Card = document.getElementById('hud-card-co2');
                if (co2Card) {
                    if (avgCo2 > 850) co2Card.className = 'hud-card accent-red';
                    else if (avgCo2 > 650) co2Card.className = 'hud-card accent-amber';
                    else co2Card.className = 'hud-card accent-green';
                }
            }

            // ج. تحديث جدول الفضاءات في نافذة المستشعرات
            if (this.iotTelemetryTbody) {
                this.iotTelemetryTbody.innerHTML = zoneList.map(z => {
                    const util = z.utilization_rate || 0;
                    let badgeClass = 'gain-positive';
                    let statusText = 'متزن';
                    if (util > 100) {
                        badgeClass = 'accent-red';
                        statusText = 'تكدس حرج';
                    } else if (util < 30 && z.type !== 'circulation') {
                        badgeClass = 'accent-amber';
                        statusText = 'شاغر / هدر';
                    }
                    return `
                        <tr>
                            <td style="font-weight:bold; color:var(--text-main);">${z.name_ar}</td>
                            <td>${z.type}</td>
                            <td>${z.capacity}</td>
                            <td style="font-weight:bold;">${z.occupancy}</td>
                            <td><span class="${badgeClass}" style="padding:2px 8px; border-radius:4px;">${util}%</span></td>
                            <td>${z.avg_dwell_minutes} دقيقة</td>
                            <td>${z.co2_ppm} ppm</td>
                            <td style="color:${util > 100 ? '#f87171' : (util < 30 ? '#fbbf24' : '#34d399')}; font-weight:bold;">${statusText}</td>
                        </tr>
                    `;
                }).join('');
            }

            // د. تحديث جدول عدادات الأبواب ونقاط الاختناق
            if (this.iotDoorsTbody) {
                this.iotDoorsTbody.innerHTML = Object.values(doors).map(d => {
                    const choke = d.choke_severity || 0;
                    let evalText = 'تدفق سلس';
                    let color = '#34d399';
                    if (choke > 0.6) {
                        evalText = 'اختناق حرج (Bottleneck)';
                        color = '#f87171';
                    } else if (choke > 0.3) {
                        evalText = 'ضغط متوسط';
                        color = '#fbbf24';
                    }
                    return `
                        <tr>
                            <td style="font-weight:bold;">${d.name_ar}</td>
                            <td style="color:#38bdf8;">${d.in_count}</td>
                            <td style="color:#a855f7;">${d.out_count}</td>
                            <td style="font-weight:bold;">${d.flow_rate_min}</td>
                            <td>${(choke * 100).toFixed(0)}%</td>
                            <td style="color:${color}; font-weight:bold;">${evalText}</td>
                        </tr>
                    `;
                }).join('');
            }
        } catch (e) {
            console.warn("IoT telemetry fetch err:", e);
        }
        await this.fetchAndUpdateSensorsInventory();
    }

    initIoTSensorManagement() {
        if (this.sensorTypeSelect) {
            this.sensorTypeSelect.addEventListener('change', () => {
                this.updateSensorTargetOptions();
            });
        }

        if (this.formAddIoTSensor) {
            this.formAddIoTSensor.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleCreateSensorSubmit();
            });
        }

        if (this.iotSensorsInventoryTbody) {
            this.iotSensorsInventoryTbody.addEventListener('click', async (e) => {
                const delBtn = e.target.closest('.btn-delete-sensor');
                if (delBtn) {
                    const sensorId = delBtn.dataset.id;
                    if (confirm(`هل أنت متأكد من حذف مستشعر الـ IoT (${sensorId}) من النموذج الرقمي؟`)) {
                        await this.deleteSensor(sensorId);
                    }
                }
            });
        }
    }

    updateSensorTargetOptions() {
        if (!this.sensorTargetSelect) return;
        const bData = window.app?.viewer?.buildingData || {};
        const isDoorType = this.sensorTypeSelect && this.sensorTypeSelect.value === 'OPTICAL_DOOR_COUNTER';

        if (isDoorType) {
            const openings = bData.openings || {};
            const doors = Object.entries(openings).filter(([_, op]) => op.type === 'door' || op.type === 'passage');
            if (doors.length === 0) {
                this.sensorTargetSelect.innerHTML = '<option value="">لا توجد أبواب مسجلة</option>';
            } else {
                this.sensorTargetSelect.innerHTML = doors.map(([id, d]) => {
                    const name = d.name_ar || (d.type === 'door' ? `باب (${id})` : `ممر (${id})`);
                    return `<option value="${id}">${name}</option>`;
                }).join('');
            }
        } else {
            const spaces = bData.spaces || {};
            const spaceEntries = Object.entries(spaces);
            if (spaceEntries.length === 0) {
                this.sensorTargetSelect.innerHTML = '<option value="">لا توجد فضاءات مسجلة</option>';
            } else {
                this.sensorTargetSelect.innerHTML = spaceEntries.map(([id, sp]) => {
                    return `<option value="${id}">${sp.name_ar || sp.name_en || id} (${sp.type || 'فضاء'})</option>`;
                }).join('');
            }
        }
    }

    async handleCreateSensorSubmit() {
        const type = this.sensorTypeSelect?.value || 'PIR_OCCUPANCY';
        const targetId = this.sensorTargetSelect?.value || '';
        const customName = this.sensorNameInput?.value?.trim() || '';

        if (!targetId) {
            alert('يرجى اختيار الفضاء أو الباب المستهدف لتثبيت المستشعر.');
            return;
        }

        const isDoor = type === 'OPTICAL_DOOR_COUNTER';
        const payload = {
            type: type,
            space_id: isDoor ? null : targetId,
            door_id: isDoor ? targetId : null,
            name_ar: customName || undefined
        };

        try {
            const res = await fetch('/api/iot/sensors/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.status === 'ok' && data.sensor) {
                if (window.app?.viewer) {
                    window.app.viewer.addIoTSensorMesh(data.sensor);
                }
                if (this.sensorNameInput) this.sensorNameInput.value = '';
                await this.fetchAndUpdateSensorsInventory();
                await this.fetchAndUpdateIoTTelemetry();
            } else {
                alert('تعذر إضافة المستشعر: ' + (data.error || 'خطأ غير معروف'));
            }
        } catch (err) {
            console.error('Failed to add IoT sensor:', err);
            alert('حدث خطأ أثناء الاتصال بالخادم لإضافة المستشعر.');
        }
    }

    async deleteSensor(sensorId) {
        try {
            const res = await fetch('/api/iot/sensors/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sensor_id: sensorId })
            });
            const data = await res.json();
            if (data.status === 'ok') {
                if (window.app?.viewer) {
                    window.app.viewer.removeIoTSensorMesh(sensorId);
                }
                await this.fetchAndUpdateSensorsInventory();
                await this.fetchAndUpdateIoTTelemetry();
            } else {
                alert('تعذر حذف المستشعر: ' + (data.error || 'خطأ غير معروف'));
            }
        } catch (err) {
            console.error('Failed to delete IoT sensor:', err);
        }
    }

    async fetchAndUpdateSensorsInventory() {
        if (!this.iotSensorsInventoryTbody) return;
        try {
            const res = await fetch('/api/iot/sensors');
            if (!res.ok) return;
            const data = await res.json();
            const sensors = data.sensors || {};
            const list = Object.values(sensors);

            if (list.length === 0) {
                this.iotSensorsInventoryTbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align:center; padding:12px; color:var(--text-muted);">
                            لا توجد مستشعرات IoT مثبتة حالياً في النموذج.
                        </td>
                    </tr>
                `;
                return;
            }

            const typeBadges = {
                'PIR_OCCUPANCY': { text: 'حركة PIR', bg: 'rgba(0,210,255,0.15)', color: '#38bdf8' },
                'ENVIRONMENTAL_TELEMETRY': { text: 'بيئي وCO2', bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
                'ACOUSTIC_NOISE': { text: 'ضوضاء وصوت', bg: 'rgba(168,85,247,0.15)', color: '#c084fc' },
                'OPTICAL_DOOR_COUNTER': { text: 'عداد تدفق أبواب', bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' }
            };

            this.iotSensorsInventoryTbody.innerHTML = list.map(s => {
                const badge = typeBadges[s.type] || { text: s.type, bg: 'rgba(255,255,255,0.1)', color: '#fff' };
                const loc = s.space_id || s.door_id || 'عام';
                const posStr = s.position ? `(${s.position.x?.toFixed(1)}, ${s.position.y?.toFixed(1)}, ${s.position.z?.toFixed(1)})` : '-';
                return `
                    <tr>
                        <td style="font-family:monospace; color:var(--accent-cyan); font-weight:bold;">${s.id}</td>
                        <td style="font-weight:bold;">${s.name_ar || s.id}</td>
                        <td><span style="background:${badge.bg}; color:${badge.color}; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:bold;">${badge.text}</span></td>
                        <td>${loc}</td>
                        <td style="font-size:10px; color:var(--text-muted); direction:ltr; text-align:right;">${posStr}</td>
                        <td><span style="color:#34d399; font-size:11px;">● نشط (98%)</span></td>
                        <td>
                            <button class="btn-delete-sensor hud-mini-btn" data-id="${s.id}" style="background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.4); padding:3px 8px; border-radius:4px; cursor:pointer; font-size:11px;" title="حذف المستشعر">
                                🗑️ حذف
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (e) {
            console.warn('Failed to fetch sensors inventory:', e);
        }
    }

    updateComparisonTable(baseline, current, summary) {
        if (this.tableBaselineBalance) this.tableBaselineBalance.textContent = `${baseline.spatial_balance_score || 0}%`;
        if (this.tableAdaptedBalance) this.tableAdaptedBalance.textContent = `${current.spatial_balance_score || 0}%`;
        if (this.tableGainBalance) {
            const gain = summary.balance_gain_percent || 0;
            this.tableGainBalance.textContent = `+${gain}%`;
            this.tableGainBalance.className = gain > 0 ? 'gain-positive' : '';
        }

        const baseOver = (baseline.overcrowded_rooms || []).length;
        const currOver = (current.overcrowded_rooms || []).length;
        if (this.tableBaselineOvercrowd) this.tableBaselineOvercrowd.textContent = baseOver;
        if (this.tableAdaptedOvercrowd) this.tableAdaptedOvercrowd.textContent = currOver;
        if (this.tableGainOvercrowd) {
            const diff = baseOver - currOver;
            this.tableGainOvercrowd.textContent = diff > 0 ? `-${diff} غرف` : '0';
            this.tableGainOvercrowd.className = diff > 0 ? 'gain-positive' : '';
        }

        const baseCirc = baseline.j_circ_penalty || 0;
        const currCirc = current.j_circ_penalty || 0;
        if (this.tableBaselineCirc) this.tableBaselineCirc.textContent = baseCirc.toFixed(1);
        if (this.tableAdaptedCirc) this.tableAdaptedCirc.textContent = currCirc.toFixed(1);
        if (this.tableGainCirc) {
            const redPct = summary.congestion_reduction_percent || 0;
            this.tableGainCirc.textContent = redPct > 0 ? `-${redPct}%` : '0%';
            this.tableGainCirc.className = redPct > 0 ? 'gain-positive' : '';
        }
    }

    updateActionFeed(actions) {
        if (!this.actionFeedEl) return;
        
        if (actions.length === 0) {
            this.actionFeedEl.innerHTML = `
                <div style="text-align:center; padding: 18px; color: var(--text-muted); font-size: 12px;">
                    لا توجد تدخلات تكيفية نشطة حالياً (الفضاء مستقر ومثالي أو وضع التكيف معطل).
                </div>
            `;
            return;
        }

        this.actionFeedEl.innerHTML = actions.map(action => {
            const isPartition = action.type === 'MOVABLE_PARTITION_EXPANSION';
            return `
                <div class="action-card ${isPartition ? 'partition' : 'reroute'}">
                    <h5>${action.title_ar}</h5>
                    <p style="margin-bottom: 4px;"><strong>السبب:</strong> ${action.reason_ar}</p>
                    <p style="color: var(--accent-cyan);"><strong>الأثر:</strong> ${action.impact_ar}</p>
                </div>
            `;
        }).join('');
    }

    exportData() {
        if (!this.lastExportData) {
            alert('لا توجد بيانات متاحة للتصدير بعد.');
            return;
        }

        const jsonStr = JSON.stringify(this.lastExportData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `adaptive_twin_research_data_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    exportCSV() {
        // تنزيل ملف CSV الأكاديمي المعياري مباشرة من الـ Backend
        const a = document.createElement('a');
        a.href = '/api/analytics/export_csv';
        a.download = `digital_twin_spatial_research_data_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}
