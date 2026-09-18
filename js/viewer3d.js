// public/js/viewer3d.js
/**
 * Three.js 3D WebGL Digital Twin Engine
 * Renders the architectural BIM layout, real-time spatial heatmaps,
 * animated movable partitions, and circulation flow particles.
 */

// Cross-browser polyfill for CanvasRenderingContext2D.prototype.roundRect
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
        if (!radii) radii = 0;
        if (typeof radii === 'number') {
            radii = [radii, radii, radii, radii];
        } else if (Array.isArray(radii)) {
            if (radii.length === 1) radii = [radii[0], radii[0], radii[0], radii[0]];
            else if (radii.length === 2) radii = [radii[0], radii[1], radii[0], radii[1]];
            else if (radii.length === 3) radii = [radii[0], radii[1], radii[2], radii[1]];
            else if (radii.length >= 4) radii = radii.slice(0, 4);
        } else {
            radii = [0, 0, 0, 0];
        }
        var tl = Math.min(radii[0] || 0, w / 2, h / 2);
        var tr = Math.min(radii[1] || 0, w / 2, h / 2);
        var br = Math.min(radii[2] || 0, w / 2, h / 2);
        var bl = Math.min(radii[3] || 0, w / 2, h / 2);
        this.beginPath();
        this.moveTo(x + tl, y);
        this.lineTo(x + w - tr, y);
        this.quadraticCurveTo(x + w, y, x + w, y + tr);
        this.lineTo(x + w, y + h - br);
        this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
        this.lineTo(x + bl, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - bl);
        this.lineTo(x, y + tl);
        this.quadraticCurveTo(x, y, x + tl, y);
        this.closePath();
        return this;
    };
}

class Twin3DViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.roomMeshes = {};
        this.partitionMeshes = {};
        this.labelSprites = {};
        this.labelsVisible = true;
        this.particleSystem = null;
        this.buildingData = null;
        this.isTopView = false;
        this.blueprintMesh = null;
        this.blueprintOpacity = 0.85;
        this.spacesOpacity = 0.40;
        this.blueprintVisible = true;
        this.wallMeshes = {};
        this.openingMeshes = {};
        this.stairMeshes = {};
        this.stairBadges = {};
        this.spaceWireframes = {};
        this.storeyGroups = {};
        this.slabMeshes = {};
        this.columnMeshes = {};
        this.beamMeshes = {};
        this.selectedElement = null;
        this.selectionHighlight = null;
        this.onElementSelected = null;
        this.ifcCategoryVisibility = {
            walls: true,
            slabs_floor: true,
            slabs_roof: true,
            slabs_site: false,
            columns: true,
            beams: true,
            doors: true,
            windows: true,
            stairs: true,
            spaces: false
        };
        this.activeStoreyFilter = 'all';
        this.isExplodedView = false;
        this.wallsVisible = true;
        this.flowVisible = true;
        this.clock = new THREE.Clock();
        this.circulationRoutes = [];
        this.circulationRoutesGroup = null;
        this.particleAgents = [];
        this.particleTexture = null;
        this.corridorFlowState = {};
        this.flowColorTheme = localStorage.getItem('adaptive_twin_flow_theme') || 'royal_blue';
        this.isPanMode = false;
        this.wallHighlightMeshes = {};
        this.batchedWallBoxes = {};
        
        this.init();
    }

    // منظومة ألوان التدفق الحركي المعماري عالية التباين على الخلفية البيضاء
    static FLOW_THEMES = {
        'royal_blue': {
            id: 'royal_blue',
            name_ar: 'أزرق ملكي كحلي',
            hexStr: '#1d4ed8',
            primary: 0x1d4ed8,    // أزرق ملكي عميق وكحلي عالي التباين (8.5:1) ناصع الوضوح على الأبيض
            spine: 0x1e40af,      // كحلي داكن لشريان الحركة الرئيسي
            stair: 0xb45309,      // برونزي كهرماني لحركة السلالم
            staff: 0x0f766e,      // تيل داكن لكوادر المكاتب
            adaptive: 0x6d28d9,   // أرجواني عميق للمسارات التكيفية
            bypass: 0x047857,     // زمردي غني لمسارات التفريغ
            congested: 0xb91c1c,  // أحمر قرمزي داكن للتكدس الحرج
            streamline: 0x2563eb,
            streamlineOpacity: 0.55
        },
        'radiant_violet': {
            id: 'radiant_violet',
            name_ar: 'بنفسجي إشعاعي',
            hexStr: '#7c3aed',
            primary: 0x7c3aed,
            spine: 0x5b21b6,
            stair: 0xd97706,
            staff: 0x0d9488,
            adaptive: 0x9333ea,
            bypass: 0x059669,
            congested: 0xdc2626,
            streamline: 0x8b5cf6,
            streamlineOpacity: 0.55
        },
        'vibrant_crimson': {
            id: 'vibrant_crimson',
            name_ar: 'قرمزي ديناميكي',
            hexStr: '#dc2626',
            primary: 0xdc2626,
            spine: 0x991b1b,
            stair: 0xb45309,
            staff: 0x047857,
            adaptive: 0x7c3aed,
            bypass: 0x15803d,
            congested: 0x7f1d1d,
            streamline: 0xef4444,
            streamlineOpacity: 0.55
        },
        'emerald_green': {
            id: 'emerald_green',
            name_ar: 'أخضر زمردي',
            hexStr: '#059669',
            primary: 0x059669,
            spine: 0x065f46,
            stair: 0xd97706,
            staff: 0x0284c7,
            adaptive: 0x7c3aed,
            bypass: 0x10b981,
            congested: 0xdc2626,
            streamline: 0x10b981,
            streamlineOpacity: 0.55
        },
        'architectural_amber': {
            id: 'architectural_amber',
            name_ar: 'كهرماني معماري',
            hexStr: '#d97706',
            primary: 0xd97706,
            spine: 0x92400e,
            stair: 0x2563eb,
            staff: 0x0f766e,
            adaptive: 0x7c3aed,
            bypass: 0x059669,
            congested: 0xdc2626,
            streamline: 0xf59e0b,
            streamlineOpacity: 0.55
        }
    };

    get currentModel() {
        return this.buildingData;
    }

    set currentModel(val) {
        this.buildingData = val;
    }

    init() {
        if (!this.container) {
            console.error("Twin3DViewer: container element not found!");
            return;
        }

        if (typeof THREE === 'undefined') {
            console.error("Twin3DViewer: Three.js library not loaded or blocked.");
            const banner = document.getElementById('js-error-banner');
            if (banner) {
                banner.textContent = "⚠️ تعذر تحميل مكتبة Three.js ثلاثية الأبعاد (يرجى التحقق من اتصالك بالإنترنت)";
                banner.style.display = 'block';
            }
            return;
        }

        const width = this.container.clientWidth || window.innerWidth - 380;
        const height = this.container.clientHeight || window.innerHeight - 60;

        // 1. Scene
        this.scene = new THREE.Scene();
        // خلفية بيضاء معمارية نقية وناصعة (Pure White Architectural Studio)
        this.scene.background = new THREE.Color(0xffffff);
        this.isWhiteBackground = true;
        // تم إلغاء الضباب تماماً لضمان بقاء المخطط والمسقط ناصعاً وواضحاً دون أي اسوداد عند الابتعاد (Zoom Out)
        this.scene.fog = null;

        // 2. Camera — توسيع مدى الرؤية الأقصى (Far Plane = 5000) لمنع تلاشي أو قطع المخطط عند الابتعاد
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 5000);
        this.camera.position.set(0, 45, 38);

        // 3. Renderer — تعيين خلفية صلبة غير شفافة بيضاء ناصعة تمنع أي تداخل مع خلفية الصفحة
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        this.renderer.setClearColor(0xffffff, 1.0);
        this.renderer.domElement.style.background = '#ffffff';
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // مؤشر اليد للسحب والإزاحة عند تفعيل نمط التحريك (Grab / Grabbing Pan Cursor)
        this.renderer.domElement.addEventListener('pointerdown', (e) => {
            if (this.isPanMode && e.button === 0) {
                this.renderer.domElement.style.cursor = 'grabbing';
            }
        });
        window.addEventListener('pointerup', () => {
            if (this.isPanMode && this.renderer?.domElement) {
                this.renderer.domElement.style.cursor = 'grab';
            }
        });

        // 4. OrbitControls — تحكم وتدوير وإزاحة وتقريب فائق السلاسة (Smooth CAD/BIM Orbit Controls)
        try {
            const ControlsClass = (THREE.OrbitControls) || (window.OrbitControls);
            if (ControlsClass) {
                this.controls = new ControlsClass(this.camera, this.renderer.domElement);
                this.controls.enableDamping = true;
                this.controls.dampingFactor = 0.08;
                this.controls.screenSpacePanning = true;
                this.controls.rotateSpeed = 0.85;
                this.controls.zoomSpeed = 1.2;
                this.controls.panSpeed = 1.0;
                this.controls.minDistance = 0.5;
                this.controls.maxDistance = 6000.0;
                this.controls.maxPolarAngle = Math.PI - 0.02; // حرية كاملة في تدوير ورؤية المبنى من كافة الزوايا
                this.controls.target.set(0, 0, 0);
                this.controls.mouseButtons = {
                    LEFT: THREE.MOUSE.ROTATE,
                    MIDDLE: THREE.MOUSE.DOLLY,
                    RIGHT: THREE.MOUSE.PAN
                };
            } else {
                console.warn("OrbitControls not found — camera controls disabled.");
                this.controls = { update: () => {}, enableDamping: false };
            }
        } catch(e) {
            console.warn("OrbitControls init failed:", e);
            this.controls = { update: () => {}, enableDamping: false };
        }

        // 5. Lighting
        this.setupLighting();

        // 6. Architectural Grid — شبكة معمارية واضحة وأنيقة فوق الخلفية البيضاء (Architectural Slate & Light Grey Grid)
        const grid = new THREE.GridHelper(300, 100, 0x94a3b8, 0xe2e8f0);
        grid.position.y = -0.05;
        if (grid.material) {
            grid.material.transparent = true;
            grid.material.opacity = 0.85;
            grid.material.depthWrite = false;
        }
        this.gridHelper = grid;
        this.scene.add(grid);

        // محاور الشبكة المحورية للشاشة (X: أحمر، Y: أخضر، Z: أزرق) لإبراز نقطة الأصل (0, 0, 0)
        const axesHelper = new THREE.AxesHelper(15);
        axesHelper.position.y = 0.01;
        this.scene.add(axesHelper);

        // 7. Circulation Flow Particles
        this.setupCirculationParticles();
        this.updateFlowThemeUI();

        // 8. Resize Listener
        window.addEventListener('resize', () => this.onWindowResize());

        // 9. Blueprint HUD Event Listeners
        this.setupBlueprintHudEvents();

        // 9.b فاحص ومحدد عناصر BIM ثلاثية الأبعاد (3D Raycaster Element Inspector)
        this.setupRaycasterSelection();

        // 10. Animation Loop
        this.animate();
    }

    setupLighting() {
        const ambient = new THREE.AmbientLight(0xdbe6f6, 0.7);
        this.scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xffffff, 0.9);
        sun.position.set(25, 45, 20);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 150;
        const d = 35;
        sun.shadow.camera.left = -d;
        sun.shadow.camera.right = d;
        sun.shadow.camera.top = d;
        sun.shadow.camera.bottom = -d;
        this.scene.add(sun);

        const fillLight = new THREE.DirectionalLight(0x00d2ff, 0.3);
        fillLight.position.set(-20, 20, -20);
        this.buildingGroup = new THREE.Group();
        this.scene.add(this.buildingGroup);
    }

    clearBuilding() {
        if (this.blueprintMesh) {
            if (this.blueprintMesh.geometry) this.blueprintMesh.geometry.dispose();
            if (this.blueprintMesh.material) {
                if (this.blueprintMesh.material.map) this.blueprintMesh.material.map.dispose();
                this.blueprintMesh.material.dispose();
            }
            if (this.buildingGroup) this.buildingGroup.remove(this.blueprintMesh);
            this.blueprintMesh = null;
        }
        if (this.buildingGroup) {
            while (this.buildingGroup.children.length > 0) {
                const obj = this.buildingGroup.children[0];
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                    else obj.material.dispose();
                }
                this.buildingGroup.remove(obj);
            }
        }
        this.roomMeshes = {};
        this.partitionMeshes = {};
        this.labelSprites = {};
        this.wallMeshes = {};
        this.openingMeshes = {};
        if (this.stairMeshes) {
            for (const grp of Object.values(this.stairMeshes)) {
                if (grp && this.buildingGroup) this.buildingGroup.remove(grp);
            }
        }
        this.stairMeshes = {};
        if (this.stairBadges) {
            for (const sp of Object.values(this.stairBadges)) {
                if (sp && this.buildingGroup) this.buildingGroup.remove(sp);
            }
        }
        this.stairBadges = {};
        this.spaceWireframes = {};
        this.storeyGroups = {};
        this.slabMeshes = {};
        this.columnMeshes = {};
        if (this.beamMeshes) {
            for (const mesh of Object.values(this.beamMeshes)) {
                if (mesh && mesh.parent) mesh.parent.remove(mesh);
            }
        }
        this.beamMeshes = {};
        if (this.wallHighlightMeshes) {
            for (const mesh of Object.values(this.wallHighlightMeshes)) {
                if (mesh && this.buildingGroup) this.buildingGroup.remove(mesh);
                if (mesh?.geometry) mesh.geometry.dispose();
                if (mesh?.material) mesh.material.dispose();
            }
        }
        this.wallHighlightMeshes = {};
        this.batchedWallBoxes = {};
        if (this.bimMeshes) {
            for (const mesh of this.bimMeshes) {
                if (mesh && mesh.parent) mesh.parent.remove(mesh);
                if (mesh?.geometry) mesh.geometry.dispose();
                if (mesh?.material) {
                    if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
                    else mesh.material.dispose();
                }
            }
        }
        this.bimMeshes = [];
        this.ifcCategoryMeshes = {};
        this.clearSelection();
        this.activeStoreyFilter = 'all';
        this.isExplodedView = false;
        this.clearCirculationParticles();
    }

    loadBuildingModel(modelData) {
        this.clearBuilding();
        this.buildingData = modelData;
        const spaces = modelData.spaces || {};

        // 1. تصيير المسقط المعماري الأصلي كخلفية مسقط أرضي ثلاثي الأبعاد (High-Resolution Blueprint Ground Mesh)
        const hasBlueprint = Boolean(modelData.blueprintCanvas || modelData.blueprintImage || modelData.blueprintTexture);
        const bpOpCtrl = document.getElementById('hud-blueprint-opacity-ctrl');
        const zonesOpCtrl = document.getElementById('hud-zones-opacity-ctrl');
        if (hasBlueprint) {
            const source = modelData.blueprintCanvas || modelData.blueprintImage;
            let texture = modelData.blueprintTexture;
            if (!texture && source) {
                texture = new THREE.CanvasTexture(source);
            }
            if (texture) {
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.anisotropy = 16;
            }

            // حساب أبعاد المسقط المعماري بناءً على النسبة الطولية العرضية للمخطط
            let bpWidth = 64.0;
            let bpDepth = 48.0;
            if (source && source.width && source.height) {
                const aspect = source.width / source.height;
                if (aspect >= 1) {
                    bpWidth = 64.0;
                    bpDepth = 64.0 / aspect;
                } else {
                    bpDepth = 52.0;
                    bpWidth = 52.0 * aspect;
                }
            }
            if (modelData.blueprintBounds) {
                bpWidth = modelData.blueprintBounds.width || bpWidth;
                bpDepth = modelData.blueprintBounds.depth || bpDepth;
            }

            const bpGeo = new THREE.PlaneGeometry(bpWidth, bpDepth);
            const bpMat = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: this.blueprintOpacity,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            this.blueprintMesh = new THREE.Mesh(bpGeo, bpMat);
            this.blueprintMesh.rotation.x = -Math.PI / 2;
            const bpPosX = (modelData.blueprintBounds && typeof modelData.blueprintBounds.offsetX === 'number') ? modelData.blueprintBounds.offsetX : 0;
            const bpPosZ = (modelData.blueprintBounds && typeof modelData.blueprintBounds.offsetZ === 'number') ? modelData.blueprintBounds.offsetZ : 0;
            this.blueprintMesh.position.set(bpPosX, 0.02, bpPosZ);
            this.blueprintMesh.visible = this.blueprintVisible;
            this.buildingGroup.add(this.blueprintMesh);

            // إظهار عناصر التحكم المتعلقة بالمسقط عند تحميله
            if (bpOpCtrl) bpOpCtrl.style.display = 'flex';
            if (zonesOpCtrl) zonesOpCtrl.style.display = 'flex';
            const bpScalePanel = document.getElementById('hud-blueprint-scale-panel');
            if (bpScalePanel) bpScalePanel.style.display = 'flex';
        } else {
            // إخفاء عناصر التحكم المتعلقة بالمسقط عند غيابه
            if (bpOpCtrl) bpOpCtrl.style.display = 'none';
            if (zonesOpCtrl) zonesOpCtrl.style.display = 'none';
            const bpScalePanel = document.getElementById('hud-blueprint-scale-panel');
            if (bpScalePanel) bpScalePanel.style.display = 'none';
        }

        // 1.ب تهيئة مجموعات الطوابق والمستويات المعمارية (Storey Groups)
        if (modelData.storeys && Object.keys(modelData.storeys).length > 0) {
            for (const [sId, s] of Object.entries(modelData.storeys)) {
                const grp = new THREE.Group();
                grp.userData = { isStoreyGroup: true, storeyId: sId, elevation: s.elevation || 0 };
                this.buildingGroup.add(grp);
                this.storeyGroups[sId] = grp;
            }
        }

        // 1.ج في حال كان النموذج مستورداً ومولداً بمحرك BIM WebAssembly (web-ifc)
        if (modelData.is_wasm_ifc && modelData.rawMeshes && modelData.rawMeshes.length > 0) {
            this.bimMeshes = modelData.rawMeshes;
            this.ifcCategoryMeshes = modelData.meshesByCategory || {};

            for (const mesh of modelData.rawMeshes) {
                const sId = mesh.userData?.storeyId;
                const parent = (sId && this.storeyGroups[sId]) || this.buildingGroup;
                parent.add(mesh);
            }

            // إنشاء شارات الفضاءات المعمارية
            for (const [id, space] of Object.entries(spaces)) {
                const b = space.bounds || { x: 0, z: 0, width: 6, depth: 6 };
                const cx = b.x + b.width / 2;
                const cz = b.z + b.depth / 2;
                this.createRoomBadge(id, space, cx, cz);
            }

            // 4. بناء وتفعيل شبكة التدفق الحركي المعماري ثلاثية الأبعاد
            this.setupCirculationParticles(modelData);

            // 5. بناء وتجسيم شبكة مجسمات مستشعرات إنترنت الأشياء ثلاثية الأبعاد
            this.initIoTSensors();

            // 6. توسيط وضبط الكاميرا بدقة على منتصف الشبكة وتأطير المبنى
            this.frameBuildingInView(modelData);
            return;
        }

        // 2. إنشاء أرضيات وجدران الفضاءات المعمارية (سواء كانت مستطيلة أو مضلعة بـ 3 جدران أو أكثر)
        for (const [id, space] of Object.entries(spaces)) {
            const poly = space.polygon;
            let centerX, centerZ, floorGeo;

            if (poly && Array.isArray(poly) && poly.length >= 3) {
                // فضاء مضلع محاط بـ 3 جدران أو أكثر
                if (space.centroid && Array.isArray(space.centroid)) {
                    centerX = space.centroid[0];
                    centerZ = space.centroid[1];
                } else {
                    centerX = poly.reduce((sum, pt) => sum + pt[0], 0) / poly.length;
                    centerZ = poly.reduce((sum, pt) => sum + pt[1], 0) / poly.length;
                }

                const shape = new THREE.Shape();
                shape.moveTo(poly[0][0] - centerX, -(poly[0][1] - centerZ));
                for (let i = 1; i < poly.length; i++) {
                    shape.lineTo(poly[i][0] - centerX, -(poly[i][1] - centerZ));
                }
                shape.closePath();

                const extrudeSettings = {
                    depth: 0.15,
                    bevelEnabled: false
                };
                floorGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                // تدوير بزاوية -90 درجة حول محور X لكي تسقط الأرضية على المستوي الأفقي XZ وتتجه للأعلى (+Y)
                floorGeo.rotateX(-Math.PI / 2);
            } else {
                const b = space.bounds || { x: 0, z: 0, width: 6, depth: 6 };
                centerX = b.x + b.width / 2;
                centerZ = b.z + b.depth / 2;
                floorGeo = new THREE.BoxGeometry(b.width, 0.15, b.depth);
            }

            const baseElev = space.base_elevation || 0;

            const hasRealSlabs = modelData.slabs && Object.keys(modelData.slabs).length > 0;
            const hasRealWalls = modelData.walls && Object.keys(modelData.walls).length > 0;
            const isImportedBim = (modelData.building_type === 'imported_bim') || hasRealSlabs || hasRealWalls;

            // أ. بلاطة الأرضية (Floor Slab) - شبه شفافة مع المخطط المعماري
            const floorMat = new THREE.MeshStandardMaterial({
                color: this.getOccupancyColor(0.5),
                roughness: 0.25,
                metalness: 0.1,
                transparent: true,
                opacity: hasBlueprint ? this.spacesOpacity : (hasRealSlabs ? 0.35 : 0.85)
            });
            const floorMesh = new THREE.Mesh(floorGeo, floorMat);
            floorMesh.position.set(centerX, baseElev + 0.08, centerZ);
            floorMesh.receiveShadow = true;
            floorMesh.userData = { 
                type: 'space', 
                spaceId: id, 
                storeyId: space.storey_id, 
                baseY: baseElev + 0.08,
                spaceData: space,
                ifcType: 'IfcSpace'
            };

            // حواف معمارية محددة مضيئة (Luminous Architectural Edges)
            const floorEdges = new THREE.EdgesGeometry(floorGeo);
            const edgeLine = new THREE.LineSegments(floorEdges, new THREE.LineBasicMaterial({
                color: (poly && poly.length >= 3) ? 0x2ecc71 : 0x00d2ff,
                transparent: true,
                opacity: 0.75
            }));
            floorMesh.add(edgeLine);

            // في نماذج الـ BIM، تُحجب كتل الفضاءات المصمتة افتراضياً حتى لا تشوه بلاطات الطوابق والأسقف الأصلية
            if (isImportedBim || space.is_fallback) {
                floorMesh.visible = false;
            }

            const spaceParent = (space.storey_id && this.storeyGroups[space.storey_id]) || this.buildingGroup;
            spaceParent.add(floorMesh);
            this.roomMeshes[id] = floorMesh;

            // ب. جدران حدودية زجاجية شفافة للمبنى للمكعبات المستطيلة التقليدية
            // يتم رسمها فقط في حال عدم وجود جدران معمارية حقيقية في النموذج ولا يُعتبر فضاء عشوائي غير مُموضع
            if (!hasRealWalls && (!poly || poly.length < 3) && !space.is_fallback) {
                const b = space.bounds || { x: 0, z: 0, width: 6, depth: 6 };
                const wallGeo = new THREE.BoxGeometry(b.width, 1.8, b.depth);
                const wallWire = new THREE.WireframeGeometry(wallGeo);
                const wireLine = new THREE.LineSegments(wallWire, new THREE.LineBasicMaterial({
                    color: 0x2a4468,
                    transparent: true,
                    opacity: 0.35
                }));
                wireLine.position.set(centerX, baseElev + 0.9, centerZ);
                wireLine.userData = { storeyId: space.storey_id, baseY: baseElev + 0.9 };
                spaceParent.add(wireLine);
                this.spaceWireframes[id] = wireLine;
            }

            // ج. لوحة نصية عائمة (Floating Space Badge) في مركز الثقل الفراغي
            this.createRoomBadge(id, space, centerX, centerZ);
        }

        // إنشاء القواطع المرنة التكيفية (Movable Partitions)
        for (const [pId, part] of Object.entries(modelData.partitions || {})) {
            const p = part.position;
            const pGeo = new THREE.BoxGeometry(p.width, 2.8, p.depth);
            const pMat = new THREE.MeshStandardMaterial({
                color: 0x2ecc71,
                roughness: 0.2,
                metalness: 0.8,
                emissive: 0x1a452a,
                emissiveIntensity: 0.3
            });
            const pMesh = new THREE.Mesh(pGeo, pMat);
            pMesh.position.set(p.x, 1.4, p.z + p.depth / 2);
            pMesh.castShadow = true;
            this.buildingGroup.add(pMesh);
            this.partitionMeshes[pId] = {
                mesh: pMesh,
                defaultZ: p.z + p.depth / 2,
                openZ: (p.z + p.depth / 2) + p.depth // sliding animation target
            };
        }

        // 3. بناء وتجسيم البلاطات المعمارية (Floor Slabs & Roof Slabs)
        this.buildSlabs(modelData.slabs, modelData.storeys);

        // 3.أ بناء وتجسيم الأعمدة الإنشائية (Structural Columns)
        this.buildColumns(modelData.columns, modelData.storeys);

        // 3.أ-2 بناء وتجسيم الجسور والكمرات الإنشائية (Structural Beams)
        this.buildBeams(modelData.beams, modelData.storeys);

        // 3.ب بناء وتجسيم الجدران المعمارية ثلاثية الأبعاد بفتحات الأبواب والشبابيك
        this.buildWallsAndOpenings(modelData.walls, modelData.openings, spaces);

        // 3.ج بناء وتجسيم السلالم المعمارية وعقد الحركة العمودية
        this.buildStaircases(modelData.stairs);

        // 4. بناء وتفعيل شبكة التدفق الحركي المعماري ثلاثية الأبعاد (Multi-Path Circulation Network)
        this.setupCirculationParticles(modelData);

        // 5. بناء وتجسيم شبكة مجسمات مستشعرات إنترنت الأشياء ثلاثية الأبعاد (3D IoT Sensor Nodes)
        this.initIoTSensors();

        // 6. توسيط وضبط الكاميرا بدقة على منتصف الشبكة المحورية للشاشة (0, 0, 0) وتأطير المشهد
        this.frameBuildingInView(modelData);
    }

    createRoomBadge(id, space, x, z) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'rgba(15, 23, 36, 0.9)';
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(10, 10, 236, 108, 12);
        } else {
            ctx.rect(10, 10, 236, 108);
        }
        ctx.fill();
        ctx.strokeStyle = '#00d2ff';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(space.name_ar, 128, 48);

        ctx.fillStyle = '#8fa0b5';
        ctx.font = '16px sans-serif';
        ctx.fillText(`السعة: ${space.capacity} م²: ${space.area_m2}`, 128, 85);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        const baseElev = space.base_elevation || 0;
        sprite.position.set(x, baseElev + 4.0, z);
        sprite.scale.set(6, 3, 1);
        sprite.userData = { storeyId: space.storey_id, baseY: baseElev + 4.0 };
        sprite.visible = this.labelsVisible !== false;
        const badgeParent = (space.storey_id && this.storeyGroups[space.storey_id]) || this.buildingGroup;
        badgeParent.add(sprite);

        this.labelSprites[id] = { sprite, canvas, ctx, texture, space };
    }

    updateRoomBadge(id, currentOcc, maxCap) {
        const badge = this.labelSprites[id];
        if (!badge) return;

        const { canvas, ctx, texture, space } = badge;
        const ratio = currentOcc / maxCap;

        ctx.clearRect(0, 0, 256, 128);
        ctx.fillStyle = 'rgba(15, 23, 36, 0.9)';
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(10, 10, 236, 108, 12);
        } else {
            ctx.rect(10, 10, 236, 108);
        }
        ctx.fill();

        let strokeColor = '#00d2ff';
        if (ratio > 1.0) strokeColor = '#e74c3c';
        else if (ratio < 0.25) strokeColor = '#3498db';
        else strokeColor = '#2ecc71';

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(space.name_ar, 128, 44);

        ctx.fillStyle = strokeColor;
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(`${currentOcc} / ${maxCap} (${Math.round(ratio * 100)}%)`, 128, 85);

        texture.needsUpdate = true;
    }

    createParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        const cx = 64, cy = 64;

        // 1. تفريغ الخلفية لتكون شفافة بالكامل
        ctx.clearRect(0, 0, 128, 128);

        // 2. ظل ناعم داكن محيطي (High-Contrast Ambient Drop Shadow) لإبراز الجسيم على أي خلفية بيضاء
        const shadowGrad = ctx.createRadialGradient(cx, cy, 36, cx, cy, 62);
        shadowGrad.addColorStop(0, 'rgba(15, 23, 42, 0.45)');
        shadowGrad.addColorStop(0.65, 'rgba(15, 23, 42, 0.18)');
        shadowGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 62, 0, Math.PI * 2);
        ctx.fill();

        // 3. إطار خارجي داكن محدد لحواف الجسيم (Dark Crisp Contrast Rim)
        const rimGrad = ctx.createRadialGradient(cx, cy, 28, cx, cy, 44);
        rimGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        rimGrad.addColorStop(0.70, 'rgba(240, 245, 255, 0.98)');
        rimGrad.addColorStop(0.88, 'rgba(30, 41, 59, 0.85)');
        rimGrad.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
        ctx.fillStyle = rimGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 44, 0, Math.PI * 2);
        ctx.fill();

        // 4. قلب الجسيم المشع النقي (Luminous Core Mask for Vertex Colors)
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 34);
        coreGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        coreGrad.addColorStop(0.75, 'rgba(255, 255, 255, 0.98)');
        coreGrad.addColorStop(1, 'rgba(245, 248, 255, 0.92)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 34, 0, Math.PI * 2);
        ctx.fill();

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    clearCirculationParticles() {
        if (this.particleSystem) {
            if (this.particleSystem.geometry) this.particleSystem.geometry.dispose();
            if (this.particleSystem.material) this.particleSystem.material.dispose();
            this.scene.remove(this.particleSystem);
            this.particleSystem = null;
        }
        if (this.circulationRoutesGroup) {
            while (this.circulationRoutesGroup.children.length > 0) {
                const child = this.circulationRoutesGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                this.circulationRoutesGroup.remove(child);
            }
            this.scene.remove(this.circulationRoutesGroup);
            this.circulationRoutesGroup = null;
        }
        this.particleAgents = [];
        this.circulationRoutes = [];
    }

    checkSegmentWallCollision(p1, p2, walls, openings, partitions) {
        if (!walls) return false;
        const x1 = p1.x, z1 = p1.z;
        const x2 = p2.x, z2 = p2.z;

        for (const wall of Object.values(walls)) {
            const wx1 = wall.start[0], wz1 = wall.start[1];
            const wx2 = wall.end[0], wz2 = wall.end[1];

            const denom = (wz2 - wz1) * (x2 - x1) - (wx2 - wx1) * (z2 - z1);
            if (Math.abs(denom) < 1e-9) continue;

            const ua = ((wx2 - wx1) * (z1 - wz1) - (wz2 - wz1) * (x1 - wx1)) / denom;
            const ub = ((x2 - x1) * (z1 - wz1) - (z2 - z1) * (x1 - wx1)) / denom;

            if (ua > 0.005 && ua < 0.995 && ub > 0.005 && ub < 0.995) {
                const ix = x1 + ua * (x2 - x1);
                const iz = z1 + ua * (z2 - z1);

                // 1. فحص هل نقطة التقاطع تمر عبر فتحة باب أو ممر عبور نشط
                let hitDoor = false;
                for (const op of Object.values(openings || {})) {
                    if (op.type === 'door' || op.type === 'passage') {
                        const opx = Array.isArray(op.position) ? op.position[0] : op.position?.x;
                        const opz = Array.isArray(op.position) ? op.position[1] : op.position?.z;
                        if (opx !== undefined && opz !== undefined) {
                            const d = Math.hypot(ix - opx, iz - opz);
                            const w = op.width || 1.2;
                            if (d <= (w * 0.5 + 0.35)) {
                                hitDoor = true;
                                break;
                            }
                        }
                    }
                }
                if (hitDoor) continue; // عبور شرعي عبر فتحة

                // 2. فحص هل نقطة التقاطع تمر عبر قاطع مرن مفتوح
                let hitPartition = false;
                for (const part of Object.values(partitions || {})) {
                    if (part.status === 'open') {
                        const px = part.position?.x;
                        const pz = part.position?.z;
                        if (px !== undefined && pz !== undefined) {
                            const d = Math.hypot(ix - px, iz - pz);
                            if (d <= 3.8) {
                                hitPartition = true;
                                break;
                            }
                        }
                    }
                }
                if (hitPartition) continue; // عبور شرعي عبر قاطع مفتوح

                // اختراق غير مسموح لجدار مصمت مغلق!
                return true;
            }
        }
        return false;
    }

    buildCirculationNetwork(modelData) {
        const routes = [];
        if (!modelData) return routes;

        const spaces = modelData.spaces || {};
        const openings = modelData.openings || {};
        const partitions = modelData.partitions || {};
        const walls = modelData.walls || {};

        // فحص هل النموذج هو المبنى الإداري النموذجي (Case Study 1)
        const isStandardOffice = Boolean(spaces['reception'] && spaces['waiting_hall'] && spaces['corridor_central']);

        if (isStandardOffice) {
            // دوال مساعدة لجلب معرفات وإحداثيات الفتحات المعمارية بمرونة تدعم كافة مسميات المخططات
            const getOp = (...keys) => {
                for (const k of keys) {
                    if (openings[k]) return openings[k];
                }
                return null;
            };
            const getOpId = (...keys) => {
                for (const k of keys) {
                    if (openings[k]) return k;
                }
                return null;
            };
            const posOf = (op, defX, defZ) => {
                if (!op) return { x: defX, z: defZ };
                const x = Array.isArray(op.position) ? op.position[0] : (op.position?.x ?? defX);
                const z = Array.isArray(op.position) ? op.position[1] : (op.position?.z ?? defZ);
                return { x, z };
            };

            const opMain = getOp('d_main_entry', 'door_main', 'door_reception_main', 'door_main_entry');
            const idMain = getOpId('d_main_entry', 'door_main', 'door_reception_main', 'door_main_entry') || 'd_main_entry';

            const opRec = getOp('d_reception_corr', 'door_reception', 'd_reception');
            const idRec = getOpId('d_reception_corr', 'door_reception', 'd_reception') || 'd_reception_corr';

            const opWait = getOp('d_waiting_corr', 'door_waiting_hall', 'd_waiting');
            const idWait = getOpId('d_waiting_corr', 'door_waiting_hall', 'd_waiting') || 'd_waiting_corr';

            const opMultiA = getOp('d_multi_a_corr', 'door_multi_hall_a', 'd_multi_a');
            const idMultiA = getOpId('d_multi_a_corr', 'door_multi_hall_a', 'd_multi_a') || 'd_multi_a_corr';

            const opMultiB = getOp('d_multi_b_corr', 'door_multi_hall_b', 'd_multi_b');
            const idMultiB = getOpId('d_multi_b_corr', 'door_multi_hall_b', 'd_multi_b') || 'd_multi_b_corr';

            const opOffN = getOp('d_office_n_corr', 'door_open_office_north', 'door_corridor_central', 'd_office_n');
            const idOffN = getOpId('d_office_n_corr', 'door_open_office_north', 'door_corridor_central', 'd_office_n') || 'd_office_n_corr';

            const opOffS = getOp('d_office_s_corr', 'door_open_office_south', 'd_office_s');
            const idOffS = getOpId('d_office_s_corr', 'door_open_office_south', 'd_office_s') || 'd_office_s_corr';

            // 1. دورة المراجعين والخدمة العامة (المدخل الخارجي -> الاستقبال -> الممر -> صالة الانتظار -> الخروج)
            if (opMain && opRec && opWait) {
                const pMain = posOf(opMain, -18, -10);
                const pRec = posOf(opRec, -12, -6);
                const pWait = posOf(opWait, 1, -6);
                routes.push({
                    id: 'journey_visitor_public',
                    name_ar: 'رحلة المراجعين (المدخل - الاستقبال - صالة الانتظار - المغادرة)',
                    category: 'visitor',
                    points: [
                        { x: -22, y: 0.38, z: pMain.z },
                        { x: pMain.x, y: 0.38, z: pMain.z },
                        { x: -14, y: 0.38, z: pMain.z },
                        { x: pRec.x, y: 0.38, z: -7.5 },
                        { x: pRec.x, y: 0.38, z: pRec.z },
                        { x: pRec.x, y: 0.38, z: -4 },
                        { x: pWait.x, y: 0.38, z: -4 },
                        { x: pWait.x, y: 0.38, z: pWait.z },
                        { x: pWait.x, y: 0.38, z: -10 },
                        { x: -2, y: 0.38, z: -10 },
                        { x: pWait.x, y: 0.38, z: -10 },
                        { x: pWait.x, y: 0.38, z: pWait.z },
                        { x: pWait.x, y: 0.38, z: -4 },
                        { x: pRec.x, y: 0.38, z: -4 },
                        { x: pRec.x, y: 0.38, z: pRec.z },
                        { x: -14, y: 0.38, z: pMain.z },
                        { x: pMain.x, y: 0.38, z: pMain.z },
                        { x: -22, y: 0.38, z: pMain.z }
                    ],
                    doorPositions: [
                        { x: pMain.x, z: pMain.z, width: opMain.width || 1.8 },
                        { x: pRec.x, z: pRec.z, width: opRec.width || 1.4 },
                        { x: pWait.x, z: pWait.z, width: opWait.width || 1.6 }
                    ],
                    doorIds: [idMain, idRec, idWait],
                    corridorId: 'corridor_central',
                    active: true,
                    weight: 1.5
                });
            }

            // 2. رحلة رواد القاعة المتعددة المرنة (أ) لحضور الفعاليات والاستشارات
            if (opMain && opRec && opMultiA) {
                const pMain = posOf(opMain, -18, -10);
                const pRec = posOf(opRec, -12, -6);
                const pA = posOf(opMultiA, 13, -6);
                routes.push({
                    id: 'journey_visitor_hall_a',
                    name_ar: 'رحلة رواد القاعة المتعددة المرنة (أ)',
                    category: 'visitor',
                    points: [
                        { x: -22, y: 0.38, z: pMain.z },
                        { x: pMain.x, y: 0.38, z: pMain.z },
                        { x: -14, y: 0.38, z: pMain.z },
                        { x: pRec.x, y: 0.38, z: -7.5 },
                        { x: pRec.x, y: 0.38, z: pRec.z },
                        { x: pRec.x, y: 0.38, z: -4 },
                        { x: pA.x, y: 0.38, z: -4 },
                        { x: pA.x, y: 0.38, z: pA.z },
                        { x: pA.x, y: 0.38, z: -10 },
                        { x: 10, y: 0.38, z: -10 },
                        { x: pA.x, y: 0.38, z: -10 },
                        { x: pA.x, y: 0.38, z: pA.z },
                        { x: pA.x, y: 0.38, z: -4 },
                        { x: pRec.x, y: 0.38, z: -4 },
                        { x: pRec.x, y: 0.38, z: pRec.z },
                        { x: -14, y: 0.38, z: pMain.z },
                        { x: pMain.x, y: 0.38, z: pMain.z },
                        { x: -22, y: 0.38, z: pMain.z }
                    ],
                    doorPositions: [
                        { x: pMain.x, z: pMain.z, width: opMain.width || 1.8 },
                        { x: pRec.x, z: pRec.z, width: opRec.width || 1.4 },
                        { x: pA.x, z: pA.z, width: opMultiA.width || 1.2 }
                    ],
                    doorIds: [idMain, idRec, idMultiA],
                    corridorId: 'corridor_central',
                    active: true,
                    weight: 1.2
                });
            }

            // 3. رحلة رواد قاعة الاجتماعات والتدريب (ب)
            if (opMain && opRec && opMultiB) {
                const pMain = posOf(opMain, -18, -10);
                const pRec = posOf(opRec, -12, -6);
                const pB = posOf(opMultiB, 23, -6);
                routes.push({
                    id: 'journey_visitor_hall_b',
                    name_ar: 'رحلة رواد قاعة الاجتماعات والتدريب (ب)',
                    category: 'visitor',
                    points: [
                        { x: -22, y: 0.38, z: pMain.z },
                        { x: pMain.x, y: 0.38, z: pMain.z },
                        { x: -14, y: 0.38, z: pMain.z },
                        { x: pRec.x, y: 0.38, z: -7.5 },
                        { x: pRec.x, y: 0.38, z: pRec.z },
                        { x: pRec.x, y: 0.38, z: -4 },
                        { x: pB.x, y: 0.38, z: -4 },
                        { x: pB.x, y: 0.38, z: pB.z },
                        { x: pB.x, y: 0.38, z: -10 },
                        { x: 20, y: 0.38, z: -10 },
                        { x: pB.x, y: 0.38, z: -10 },
                        { x: pB.x, y: 0.38, z: pB.z },
                        { x: pB.x, y: 0.38, z: -4 },
                        { x: pRec.x, y: 0.38, z: -4 },
                        { x: pRec.x, y: 0.38, z: pRec.z },
                        { x: -14, y: 0.38, z: pMain.z },
                        { x: pMain.x, y: 0.38, z: pMain.z },
                        { x: -22, y: 0.38, z: pMain.z }
                    ],
                    doorPositions: [
                        { x: pMain.x, z: pMain.z, width: opMain.width || 1.8 },
                        { x: pRec.x, z: pRec.z, width: opRec.width || 1.4 },
                        { x: pB.x, z: pB.z, width: opMultiB.width || 1.2 }
                    ],
                    doorIds: [idMain, idRec, idMultiB],
                    corridorId: 'corridor_central',
                    active: true,
                    weight: 1.0
                });
            }

            // 4. التدفق التكيفي المباشر عبر القاطع المنزلق (صالة الانتظار <-> القاعة أ)
            if (partitions['p_waiting_multi'] && opWait && opMultiA) {
                const pWait = posOf(opWait, 1, -6);
                const pA = posOf(opMultiA, 13, -6);
                routes.push({
                    id: 'journey_adaptive_waiting_hall_a',
                    name_ar: 'التدفق التكيفي المباشر عبر القاطع المنزلق (صالة الانتظار - قاعة أ)',
                    category: 'adaptive',
                    points: [
                        { x: 1, y: 0.38, z: -10 },
                        { x: 4, y: 0.38, z: -10 },
                        { x: 8, y: 0.38, z: -10 },
                        { x: 11, y: 0.38, z: -10 },
                        { x: pA.x, y: 0.38, z: -10 },
                        { x: pA.x, y: 0.38, z: pA.z },
                        { x: pA.x, y: 0.38, z: -4 },
                        { x: pWait.x, y: 0.38, z: -4 },
                        { x: pWait.x, y: 0.38, z: pWait.z },
                        { x: 1, y: 0.38, z: -10 }
                    ],
                    doorPositions: [
                        { x: 8, z: -10, width: 2.5 },
                        { x: pA.x, z: pA.z, width: opMultiA.width || 1.2 },
                        { x: pWait.x, z: pWait.z, width: opWait.width || 1.6 }
                    ],
                    doorIds: [idMultiA, idWait],
                    partitionId: 'p_waiting_multi',
                    requiresOpen: true,
                    active: (partitions['p_waiting_multi']?.status === 'open'),
                    weight: 1.4
                });
            }

            // 5. حركة كوادر الجناح الشمالي ومرفق استراحة الموظفين والخدمات
            if (opOffN) {
                const pOffN = posOf(opOffN, -7, -2);
                routes.push({
                    id: 'journey_staff_north_lounge',
                    name_ar: 'حركة كوادر الجناح الشمالي ومرفق استراحة الموظفين',
                    category: 'staff',
                    points: [
                        { x: -12, y: 0.38, z: -4 },
                        { x: pOffN.x, y: 0.38, z: -4 },
                        { x: pOffN.x, y: 0.38, z: pOffN.z },
                        { x: pOffN.x, y: 0.38, z: 2 },
                        { x: -12, y: 0.38, z: 5 },
                        { x: -4, y: 0.38, z: 6 },
                        { x: -1, y: 0.38, z: 7 },
                        { x: -4, y: 0.38, z: 4 },
                        { x: pOffN.x, y: 0.38, z: 2 },
                        { x: pOffN.x, y: 0.38, z: pOffN.z },
                        { x: pOffN.x, y: 0.38, z: -4 },
                        { x: -12, y: 0.38, z: -4 }
                    ],
                    doorPositions: [{ x: pOffN.x, z: pOffN.z, width: opOffN.width || 1.4 }],
                    doorIds: [idOffN],
                    corridorId: 'corridor_central',
                    active: true,
                    weight: 1.3
                });
            }

            // 6. حركة كوادر الجناح الجنوبي ومرفق استراحة الموظفين والخدمات
            if (opOffS) {
                const pOffS = posOf(opOffS, 16, -2);
                routes.push({
                    id: 'journey_staff_south_lounge',
                    name_ar: 'حركة كوادر الجناح الجنوبي ومرفق استراحة الموظفين',
                    category: 'staff',
                    points: [
                        { x: 1, y: 0.38, z: -4 },
                        { x: pOffS.x, y: 0.38, z: -4 },
                        { x: pOffS.x, y: 0.38, z: pOffS.z },
                        { x: pOffS.x, y: 0.38, z: 3 },
                        { x: 12, y: 0.38, z: 6 },
                        { x: 3, y: 0.38, z: 7 },
                        { x: -1, y: 0.38, z: 7 },
                        { x: 5, y: 0.38, z: 5 },
                        { x: pOffS.x, y: 0.38, z: 3 },
                        { x: pOffS.x, y: 0.38, z: pOffS.z },
                        { x: pOffS.x, y: 0.38, z: -4 },
                        { x: 1, y: 0.38, z: -4 }
                    ],
                    doorPositions: [{ x: pOffS.x, z: pOffS.z, width: opOffS.width || 1.4 }],
                    doorIds: [idOffS],
                    corridorId: 'corridor_central',
                    active: true,
                    weight: 1.3
                });
            }

            // 7. الشريان الحركي المركزي الرئيسي (داخل الممر بدقة دون اختراق الجدران)
            routes.push({
                id: 'journey_central_spine',
                name_ar: 'الشريان الحركي المركزي الرئيسي',
                category: 'spine',
                points: [
                    { x: -16, y: 0.38, z: -4 },
                    { x: -12, y: 0.38, z: -4 },
                    { x: -7, y: 0.38, z: -4 },
                    { x: 1, y: 0.38, z: -4 },
                    { x: 13, y: 0.38, z: -4 },
                    { x: 16, y: 0.38, z: -4 },
                    { x: 23, y: 0.38, z: -4 },
                    { x: 26, y: 0.38, z: -4 },
                    { x: 23, y: 0.38, z: -4 },
                    { x: 16, y: 0.38, z: -4 },
                    { x: 13, y: 0.38, z: -4 },
                    { x: 1, y: 0.38, z: -4 },
                    { x: -7, y: 0.38, z: -4 },
                    { x: -12, y: 0.38, z: -4 },
                    { x: -16, y: 0.38, z: -4 }
                ],
                doorPositions: [],
                corridorId: 'corridor_central',
                active: true,
                weight: 1.4
            });

            // 8. ممر الحركة الالتفافي البديل لتخفيف الازدحام عبر الأبواب المعمارية
            if (opOffN && opOffS) {
                const pOffN = posOf(opOffN, -7, -2);
                const pOffS = posOf(opOffS, 16, -2);
                routes.push({
                    id: 'journey_southern_bypass',
                    name_ar: 'ممر الحركة الالتفافي البديل لتخفيف الازدحام',
                    category: 'bypass',
                    points: [
                        { x: pOffN.x, y: 0.38, z: -4 },
                        { x: pOffN.x, y: 0.38, z: pOffN.z },
                        { x: pOffN.x, y: 0.38, z: 4 },
                        { x: pOffN.x, y: 0.38, z: 13.5 },
                        { x: 0, y: 0.38, z: 13.5 },
                        { x: 8, y: 0.38, z: 13.5 },
                        { x: pOffS.x, y: 0.38, z: 13.5 },
                        { x: pOffS.x, y: 0.38, z: 4 },
                        { x: pOffS.x, y: 0.38, z: pOffS.z },
                        { x: pOffS.x, y: 0.38, z: -4 },
                        { x: 1, y: 0.38, z: -4 },
                        { x: pOffN.x, y: 0.38, z: -4 }
                    ],
                    doorPositions: [
                        { x: pOffN.x, z: pOffN.z, width: opOffN.width || 1.4 },
                        { x: pOffS.x, z: pOffS.z, width: opOffS.width || 1.4 }
                    ],
                    doorIds: [idOffN, idOffS],
                    corridorId: 'corridor_bypass_south',
                    isBypass: true,
                    active: true,
                    weight: 1.1
                });
            }
        }

        // 9. التحليل والربط الطوبولوجي التلقائي لكافة الفتحات والأبواب (المضافة حديثاً أو في المخططات المخصصة والمستوردة)
        const coveredDoorIds = new Set();
        for (const r of routes) {
            if (r.doorIds) {
                for (const dId of r.doorIds) coveredDoorIds.add(dId);
            }
        }

        const unroutedOpenings = Object.entries(openings).filter(([dId, op]) => {
            return (op.type === 'door' || op.type === 'passage') && !coveredDoorIds.has(dId);
        });

        const findSpaceAtPoint = (x, z) => {
            for (const [sId, sp] of Object.entries(spaces)) {
                if (!sp.bounds) continue;
                const b = sp.bounds;
                if (x >= b.x && x <= b.x + b.width && z >= b.z && z <= b.z + b.depth) {
                    return { id: sId, space: sp };
                }
            }
            return null;
        };

        for (const [dId, op] of unroutedOpenings) {
            const dx = (Array.isArray(op.position) ? op.position[0] : op.position?.x) || 0;
            const dz = (Array.isArray(op.position) ? op.position[1] : op.position?.z) || 0;
            const pDoor = { x: dx, y: 0.38, z: dz };

            // تحديد الجدار الحاضن للفتحة لحساب المتجه العمودي بدقة هندسية
            let hostWall = walls[op.wall_id];
            if (!hostWall) {
                let minDist = Infinity;
                for (const w of Object.values(walls)) {
                    const x1 = w.start[0], z1 = w.start[1];
                    const x2 = w.end[0], z2 = w.end[1];
                    const wx = x2 - x1, wz = z2 - z1;
                    const wlen2 = wx * wx + wz * wz;
                    if (wlen2 < 0.01) continue;
                    const u = Math.max(0, Math.min(1, ((dx - x1) * wx + (dz - z1) * wz) / wlen2));
                    const px = x1 + u * wx, pz = z1 + u * wz;
                    const d = Math.hypot(dx - px, dz - pz);
                    if (d < minDist) {
                        minDist = d;
                        hostWall = w;
                    }
                }
            }

            let nx = 0, nz = 1;
            if (hostWall) {
                const wx = hostWall.end[0] - hostWall.start[0];
                const wz = hostWall.end[1] - hostWall.start[1];
                const wlen = Math.hypot(wx, wz) || 1;
                nx = -wz / wlen;
                nz = wx / wlen;
            }

            const step = 1.6;
            const pIn = { x: dx + nx * step, y: 0.38, z: dz + nz * step };
            const pOut = { x: dx - nx * step, y: 0.38, z: dz - nz * step };

            const spIn = findSpaceAtPoint(pIn.x, pIn.z);
            const spOut = findSpaceAtPoint(pOut.x, pOut.z);

            // تحديد نقاط الارتكاز العميقة داخل كل فضاء مع التحقق من عدم اختراق الجدران
            let anchorIn = pIn;
            if (spIn) {
                const b = spIn.space.bounds;
                const cin = { x: b.x + b.width / 2, y: 0.38, z: b.z + b.depth / 2 };
                if (!this.checkSegmentWallCollision(pIn, cin, walls, openings, partitions)) {
                    anchorIn = cin;
                } else {
                    const deepPt = { x: dx + nx * 2.8, y: 0.38, z: dz + nz * 2.8 };
                    if (deepPt.x >= b.x + 0.3 && deepPt.x <= b.x + b.width - 0.3 &&
                        deepPt.z >= b.z + 0.3 && deepPt.z <= b.z + b.depth - 0.3 &&
                        !this.checkSegmentWallCollision(pIn, deepPt, walls, openings, partitions)) {
                        anchorIn = deepPt;
                    }
                }
            } else {
                anchorIn = { x: dx + nx * 4.0, y: 0.38, z: dz + nz * 4.0 };
            }

            let anchorOut = pOut;
            if (spOut) {
                const b = spOut.space.bounds;
                const cout = { x: b.x + b.width / 2, y: 0.38, z: b.z + b.depth / 2 };
                if (!this.checkSegmentWallCollision(pOut, cout, walls, openings, partitions)) {
                    anchorOut = cout;
                } else {
                    const deepPt = { x: dx - nx * 2.8, y: 0.38, z: dz - nz * 2.8 };
                    if (deepPt.x >= b.x + 0.3 && deepPt.x <= b.x + b.width - 0.3 &&
                        deepPt.z >= b.z + 0.3 && deepPt.z <= b.z + b.depth - 0.3 &&
                        !this.checkSegmentWallCollision(pOut, deepPt, walls, openings, partitions)) {
                        anchorOut = deepPt;
                    }
                }
            } else {
                anchorOut = { x: dx - nx * 4.0, y: 0.38, z: dz - nz * 4.0 };
            }

            const dynamicPoints = [anchorIn, pIn, pDoor, pOut, anchorOut, pOut, pDoor, pIn, anchorIn];
            const routeName = op.name_ar || (op.type === 'door' ? `مسار الباب (${dId})` : `مسار فتحة العبور (${dId})`);

            routes.push({
                id: `dynamic_route_${dId}`,
                name_ar: routeName,
                category: op.type === 'passage' ? 'bypass' : 'adaptive',
                points: dynamicPoints,
                doorPositions: [{ x: dx, z: dz, width: op.width || 1.2 }],
                doorIds: [dId],
                active: true,
                weight: 1.2
            });
        }

        // توليد مسارات تكيفية للقواطع التي لم يتم تغطيتها
        for (const [pId, part] of Object.entries(partitions)) {
            const hasPartitionRoute = routes.some(r => r.partitionId === pId);
            if (!hasPartitionRoute) {
                const between = part.between || [];
                if (between.length >= 2 && spaces[between[0]] && spaces[between[1]]) {
                    const sp1 = spaces[between[0]], sp2 = spaces[between[1]];
                    const c1 = { x: sp1.bounds.x + sp1.bounds.width / 2, y: 0.38, z: sp1.bounds.z + sp1.bounds.depth / 2 };
                    const c2 = { x: sp2.bounds.x + sp2.bounds.width / 2, y: 0.38, z: sp2.bounds.z + sp2.bounds.depth / 2 };
                    const px = part.position?.x !== undefined ? part.position.x : ((c1.x + c2.x) / 2);
                    const pz = part.position?.z !== undefined ? part.position.z : ((c1.z + c2.z) / 2);
                    const pMid = { x: px, y: 0.38, z: pz };
                    routes.push({
                        id: `partition_route_${pId}`,
                        name_ar: `التدفق التكيفي عبر ${part.name_ar || pId}`,
                        category: 'adaptive',
                        points: [c1, pMid, c2, pMid, c1],
                        doorPositions: [{ x: px, z: pz, width: 2.5 }],
                        doorIds: [],
                        partitionId: pId,
                        requiresOpen: true,
                        active: (part.status === 'open'),
                        weight: 1.3
                    });
                }
            }
        }

        // توليد مسارات الحركة والتدفق العمودي للسلالم المعمارية المربوطة بالممرات
        for (const [stairId, stair] of Object.entries(modelData.stairs || {})) {
            const sx = (stair.position && stair.position[0] !== undefined) ? stair.position[0] : 0;
            const sz = (stair.position && stair.position[1] !== undefined) ? stair.position[1] : 0;
            const rotRad = ((stair.rotation || 0) * Math.PI) / 180.0;
            const depth = stair.depth || 4.5;
            
            let lx = sx, lz = sz;
            if (stair.landing_pos && Array.isArray(stair.landing_pos)) {
                lx = stair.landing_pos[0];
                lz = stair.landing_pos[1];
            } else {
                lx = sx + Math.sin(rotRad) * (depth / 2.0);
                lz = sz + Math.cos(rotRad) * (depth / 2.0);
            }

            const pStairTop = { x: sx, y: 0.38, z: sz };
            const pLanding = { x: lx, y: 0.38, z: lz };

            // تحديد نقطة ربط بالممر أو الساحة أمام السلم
            const stepOut = 1.8;
            let dirX = lx - sx;
            let dirZ = lz - sz;
            const dirLen = Math.hypot(dirX, dirZ) || 1;
            dirX /= dirLen;
            dirZ /= dirLen;

            const pCorridor = { x: lx + dirX * stepOut, y: 0.38, z: lz + dirZ * stepOut };
            const canStepOut = !this.checkSegmentWallCollision(pLanding, pCorridor, walls, openings, partitions);
            const pTarget = canStepOut ? pCorridor : pLanding;

            const stairPoints = [
                pStairTop,
                pLanding,
                pTarget,
                pLanding,
                pStairTop
            ];

            routes.push({
                id: `stair_route_${stairId}`,
                name_ar: `تدفق الحركة العمودية عبر (${stair.name_ar || stairId})`,
                category: 'stair',
                stairId: stairId,
                points: stairPoints,
                doorPositions: [{ x: lx, z: lz, width: stair.width || 2.4 }],
                doorIds: [],
                active: true,
                weight: 1.5
            });
        }

        // فحص وتصفية مسارات الحركة هندسياً: استبعاد أي مسار يخترق جداراً مصمتاً دون فتحة
        const validRoutes = [];
        for (const r of routes) {
            let hasIllegalCollision = false;
            for (let i = 0; i < r.points.length - 1; i++) {
                if (this.checkSegmentWallCollision(r.points[i], r.points[i + 1], walls, openings, partitions)) {
                    hasIllegalCollision = true;
                    console.warn(`[Circulation] مسار ملغي لاختراقه جداراً مصمتاً: ${r.name_ar}`);
                    break;
                }
            }
            if (!hasIllegalCollision) {
                validRoutes.push(r);
            }
        }

        // حساب أطوال القطع المستقيمة والمترية بدقة لكل مسار (Arc-Length Parameterization)
        for (const r of validRoutes) {
            r.segmentLengths = [];
            r.cumulativeLengths = [0];
            let total = 0;
            for (let i = 0; i < r.points.length - 1; i++) {
                const p1 = r.points[i];
                const p2 = r.points[i + 1];
                const d = Math.hypot(p2.x - p1.x, p2.z - p1.z);
                r.segmentLengths.push(d);
                total += d;
                r.cumulativeLengths.push(total);
            }
            r.totalLength = Math.max(0.1, total);
        }

        return validRoutes;
    }

    evaluateRoutePosition(route, dist, laneOffset = 0) {
        if (!route || !route.points || route.points.length < 2) {
            return { x: 0, y: 0.38, z: 0 };
        }
        const L = route.totalLength;
        let clampedDist = dist % L;
        if (clampedDist < 0) clampedDist += L;

        let k = 0;
        while (k < route.segmentLengths.length - 1 && clampedDist > route.cumulativeLengths[k + 1]) {
            k++;
        }

        const segLen = route.segmentLengths[k] || 1;
        const segDist = clampedDist - route.cumulativeLengths[k];
        const t = Math.max(0, Math.min(1, segDist / segLen));

        const p0 = route.points[k];
        const p1 = route.points[k + 1];

        let x = p0.x + (p1.x - p0.x) * t;
        const y = 0.38;
        let z = p0.z + (p1.z - p0.z) * t;

        // تضييق انزياح الحارة (laneOffset) تلقائياً عند الاقتراب من أي باب للمرور من مركز الفتحة تماماً دون ملامسة الجدار
        let effLane = laneOffset;
        if (route.doorPositions && route.doorPositions.length > 0) {
            let minDoorDist = Infinity;
            for (const dp of route.doorPositions) {
                const d = Math.hypot(x - dp.x, z - dp.z);
                if (d < minDoorDist) minDoorDist = d;
            }
            if (minDoorDist < 1.2) {
                const factor = Math.max(0, (minDoorDist - 0.2) / 1.0);
                effLane *= (factor * factor);
            }
        }

        if (effLane !== 0) {
            const dx = p1.x - p0.x;
            const dz = p1.z - p0.z;
            const len = Math.hypot(dx, dz) || 1;
            const nx = -dz / len;
            const nz = dx / len;
            x += nx * effLane;
            z += nz * effLane;
        }

        return { x, y, z };
    }

    setupCirculationParticles(modelData) {
        this.clearCirculationParticles();

        const data = modelData || this.buildingData;
        if (!data) return;

        this.circulationRoutes = this.buildCirculationNetwork(data);
        if (!this.circulationRoutes || this.circulationRoutes.length === 0) return;

        const themeConfig = Twin3DViewer.FLOW_THEMES[this.flowColorTheme] || Twin3DViewer.FLOW_THEMES['royal_blue'];

        // 1. بناء أشرطة ومسارات التدفق المعمارية على الأرضية (Flow Streamlines)
        if (!this.circulationRoutesGroup) {
            this.circulationRoutesGroup = new THREE.Group();
            this.scene.add(this.circulationRoutesGroup);
        }
        this.rebuildCirculationStreamlines(themeConfig);

        // 2. بناء وتوزيع جسيمات التدفق الحركي عالية التباين على المسارات
        const particleCount = 200;
        this.particleAgents = [];

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        const activeRoutes = this.circulationRoutes.filter(r => r.active);
        const candidates = activeRoutes.length > 0 ? activeRoutes : this.circulationRoutes;

        for (let i = 0; i < particleCount; i++) {
            const assignedRoute = candidates[i % candidates.length];
            const actualRouteIndex = this.circulationRoutes.indexOf(assignedRoute);
            const dist = (i / particleCount) * assignedRoute.totalLength;
            const speed = 1.6 + (i % 6) * 0.18;
            const dir = 1; // تدفق أمامي مستمر يحاكي حركة المشاة الواقعية
            const laneOffset = ((i % 5) - 2) * 0.12;

            let baseColor = themeConfig.primary;
            if (assignedRoute.category === 'staff') baseColor = themeConfig.staff;
            else if (assignedRoute.category === 'adaptive') baseColor = themeConfig.adaptive;
            else if (assignedRoute.category === 'bypass') baseColor = themeConfig.bypass;
            else if (assignedRoute.category === 'stair') baseColor = themeConfig.stair;
            else if (assignedRoute.category === 'spine') baseColor = themeConfig.spine;

            const agent = {
                routeIndex: actualRouteIndex,
                dist: dist,
                speed: speed,
                dir: dir,
                laneOffset: laneOffset,
                speedMultiplier: 1.0,
                currentColor: new THREE.Color(baseColor)
            };
            this.particleAgents.push(agent);

            const pos = this.evaluateRoutePosition(assignedRoute, dist, laneOffset);
            positions[i * 3] = pos.x;
            positions[i * 3 + 1] = pos.y;
            positions[i * 3 + 2] = pos.z;

            colors[i * 3] = agent.currentColor.r;
            colors[i * 3 + 1] = agent.currentColor.g;
            colors[i * 3 + 2] = agent.currentColor.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        if (!this.particleTexture) {
            this.particleTexture = this.createParticleTexture();
        }

        const mat = new THREE.PointsMaterial({
            size: 1.95,
            map: this.particleTexture,
            vertexColors: true,
            transparent: true,
            opacity: 0.98,
            blending: THREE.NormalBlending,
            depthTest: true,
            depthWrite: false
        });

        this.particleSystem = new THREE.Points(geometry, mat);
        this.particleSystem.visible = (this.flowVisible !== false);
        this.scene.add(this.particleSystem);
    }

    // إعادة رسم أشرطة وخطوط التدفق الحركي على أرضية الممرات
    rebuildCirculationStreamlines(theme) {
        if (!this.circulationRoutesGroup) return;

        while (this.circulationRoutesGroup.children.length > 0) {
            const child = this.circulationRoutesGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            this.circulationRoutesGroup.remove(child);
        }

        if (!this.circulationRoutes || this.circulationRoutes.length === 0) return;

        const themeConfig = theme || Twin3DViewer.FLOW_THEMES[this.flowColorTheme] || Twin3DViewer.FLOW_THEMES['royal_blue'];

        for (const route of this.circulationRoutes) {
            if (!route.points || route.points.length < 2) continue;

            const pts = route.points.map(p => new THREE.Vector3(p.x, 0.14, p.z));
            const curveGeo = new THREE.BufferGeometry().setFromPoints(pts);

            let routeColor = themeConfig.streamline;
            if (route.category === 'stair') routeColor = themeConfig.stair;
            else if (route.category === 'staff') routeColor = themeConfig.staff;
            else if (route.category === 'bypass') routeColor = themeConfig.bypass;
            else if (route.category === 'adaptive') routeColor = themeConfig.adaptive;
            else if (route.category === 'spine') routeColor = themeConfig.spine;

            const lineMat = new THREE.LineBasicMaterial({
                color: routeColor,
                transparent: true,
                opacity: 0.50,
                depthWrite: false
            });

            const lineMesh = new THREE.Line(curveGeo, lineMat);
            lineMesh.userData = { routeId: route.id, category: route.category, isRouteStreamline: true };
            this.circulationRoutesGroup.add(lineMesh);
        }

        this.circulationRoutesGroup.visible = (this.flowVisible !== false);
    }

    // تغيير ثيم لون التدفق الحركي وتحديث كافة الجسيمات والمسارات لحظياً
    setFlowTheme(themeId) {
        if (!Twin3DViewer.FLOW_THEMES[themeId]) return;
        this.flowColorTheme = themeId;
        localStorage.setItem('adaptive_twin_flow_theme', themeId);
        const themeConfig = Twin3DViewer.FLOW_THEMES[themeId];

        // 1. إعادة تلوين الجسيمات فورياً
        if (this.particleAgents && this.circulationRoutes) {
            for (const agent of this.particleAgents) {
                const route = this.circulationRoutes[agent.routeIndex];
                if (!route) continue;
                if (route.category === 'staff') agent.currentColor.setHex(themeConfig.staff);
                else if (route.category === 'adaptive') agent.currentColor.setHex(themeConfig.adaptive);
                else if (route.category === 'bypass') agent.currentColor.setHex(themeConfig.bypass);
                else if (route.category === 'stair') agent.currentColor.setHex(themeConfig.stair);
                else if (route.category === 'spine') agent.currentColor.setHex(themeConfig.spine);
                else agent.currentColor.setHex(themeConfig.primary);
            }
            if (this.particleSystem?.geometry?.attributes?.color) {
                this.particleSystem.geometry.attributes.color.needsUpdate = true;
            }
        }

        // 2. إعادة رسم أشرطة المسارات بالأرضية
        this.rebuildCirculationStreamlines(themeConfig);
        this.updateFlowThemeUI(themeConfig);

        return themeConfig;
    }

    // التنقل التتابعي بين ألوان التدفق عند النقر على الزر
    cycleFlowTheme() {
        const themeKeys = Object.keys(Twin3DViewer.FLOW_THEMES);
        let currentIndex = themeKeys.indexOf(this.flowColorTheme);
        if (currentIndex === -1) currentIndex = 0;
        const nextIndex = (currentIndex + 1) % themeKeys.length;
        const nextThemeKey = themeKeys[nextIndex];
        return this.setFlowTheme(nextThemeKey);
    }

    // تحديث الشارة والنقطة اللونية لزر التدفق في واجهة المستخدم
    updateFlowThemeUI(theme) {
        const themeConfig = theme || Twin3DViewer.FLOW_THEMES[this.flowColorTheme] || Twin3DViewer.FLOW_THEMES['royal_blue'];
        const dot = document.getElementById('flow-color-dot');
        const label = document.getElementById('flow-color-label');
        if (dot) {
            dot.style.background = themeConfig.hexStr;
            dot.style.boxShadow = `0 0 8px ${themeConfig.hexStr}`;
        }
        if (label) {
            label.textContent = `لون التدفق: ${themeConfig.name_ar}`;
        }
    }

    updateRealtimeState(state) {
        if (!state) return;
        const readings = state.sensor_readings || {};
        const partitions = state.partitions || {};
        const flows = state.corridor_flows || {};
        this.corridorFlowState = flows;

        // 1. تحديث الألوان الحرارية والشارات للغرف
        for (const [id, count] of Object.entries(readings)) {
            const mesh = this.roomMeshes[id];
            const space = this.buildingData?.spaces?.[id];
            if (mesh && space) {
                const effectiveCap = (id === 'waiting_hall' && partitions['p_waiting_multi']?.status === 'open')
                    ? space.capacity + 18
                    : space.capacity;
                const ratio = count / Math.max(1, effectiveCap);
                mesh.material.color.set(this.getOccupancyColor(ratio));
                this.updateRoomBadge(id, count, effectiveCap);
            }
        }

        // 2. تحديث حركة القواطع المرنة (انزلاق تدريجي)
        for (const [pId, partData] of Object.entries(partitions)) {
            const pObj = this.partitionMeshes[pId];
            if (pObj) {
                const targetZ = partData.status === 'open' ? pObj.openZ : pObj.defaultZ;
                pObj.mesh.position.z += (targetZ - pObj.mesh.position.z) * 0.1;
                pObj.mesh.material.color.set(partData.status === 'open' ? 0x00d2ff : 0x2ecc71);
            }
        }

        // 3. تحديث مسارات التدفق الحركي التكيفية استناداً إلى حالة القواطع والازدحام وسلامة الأبواب
        if (this.circulationRoutes && this.circulationRoutes.length > 0) {
            for (const route of this.circulationRoutes) {
                if (route.partitionId) {
                    const p = partitions[route.partitionId];
                    const isOpen = p ? (p.status === 'open') : false;
                    route.active = isOpen;
                }
                // فحص الأبواب والفتحات: إذا تم حذف أي باب في المسار، يتم تعطيل المسار فوراً
                if (route.doorIds && route.doorIds.length > 0) {
                    const allDoorsExist = route.doorIds.every(dId => Boolean(this.buildingData?.openings?.[dId]));
                    if (!allDoorsExist) {
                        route.active = false;
                    }
                }
            }

            const centralFlow = flows['corridor_central'] || 30;
            const isCongested = (centralFlow > 52);
            const themeConfig = Twin3DViewer.FLOW_THEMES[this.flowColorTheme] || Twin3DViewer.FLOW_THEMES['royal_blue'];

            for (let i = 0; i < this.particleAgents.length; i++) {
                const agent = this.particleAgents[i];
                let route = this.circulationRoutes[agent.routeIndex];

                if (route && !route.active) {
                    const activeRoutes = this.circulationRoutes.filter(r => r.active);
                    if (activeRoutes.length > 0) {
                        const newRoute = activeRoutes[Math.floor(Math.random() * activeRoutes.length)];
                        agent.routeIndex = this.circulationRoutes.indexOf(newRoute);
                        agent.dist = Math.random() * newRoute.totalLength;
                        route = newRoute;
                    }
                }

                if (route) {
                    if (route.category === 'bypass' || route.isBypass) {
                        if (isCongested) {
                            agent.currentColor.setHex(0x059669); // زمردي عميق متمايز لتصريف الازدحام
                            agent.speedMultiplier = 1.65;
                        } else {
                            agent.currentColor.setHex(themeConfig.bypass);
                            agent.speedMultiplier = 1.0;
                        }
                    } else if (route.category === 'adaptive' || route.partitionId) {
                        agent.currentColor.setHex(themeConfig.adaptive); // بنفسجي معماري تكيفي
                        agent.speedMultiplier = 1.4;
                    } else if (route.category === 'staff') {
                        agent.currentColor.setHex(themeConfig.staff); // تيل داكن للكوادر
                        agent.speedMultiplier = 1.05;
                    } else if (route.category === 'stair') {
                        agent.currentColor.setHex(themeConfig.stair); // كهرماني عميق للحركة العمودية
                        agent.speedMultiplier = 0.65; // تباطؤ طبيعي لسرعة صعود ونزول الدرج علمياً
                    } else if (route.category === 'spine') {
                        if (isCongested) {
                            agent.currentColor.setHex(themeConfig.congested); // قرمزي داكن للتكدس الحرج
                            agent.speedMultiplier = 0.72; // تباطؤ الاحتكاك والازدحام
                        } else {
                            agent.currentColor.setHex(themeConfig.spine);
                            agent.speedMultiplier = 1.1;
                        }
                    } else {
                        // زوار ومراجعون
                        agent.currentColor.setHex(themeConfig.primary); // اللون الأساسي المختار
                        agent.speedMultiplier = 1.0;
                    }
                }
            }

            // تحديث لون شريط الممر عند التكدس
            if (this.circulationRoutesGroup && this.circulationRoutesGroup.children.length > 0) {
                this.circulationRoutesGroup.children.forEach(lineMesh => {
                    if (lineMesh.userData?.category === 'spine' || lineMesh.userData?.routeId?.includes('corridor')) {
                        if (lineMesh.material) {
                            lineMesh.material.color.setHex(isCongested ? themeConfig.congested : themeConfig.spine);
                        }
                    }
                });
            }
        }
    }

    getOccupancyColor(ratio) {
        if (ratio > 1.15) return 0xd63031; // تكدس حاد (أحمر ناري)
        if (ratio > 0.90) return 0xe17055; // اقتراب من الامتلاء (برتقالي)
        if (ratio >= 0.40) return 0x00b894; // مثالي متزن (أخضر زمردي)
        return 0x0984e3;                   // إشغال منخفض / شاغر (أزرق بارد)
    }

    toggleCameraView() {
        this.setCameraView(!this.isTopView);
    }

    setCameraView(isTop) {
        this.isTopView = Boolean(isTop);
        if (this.isTopView) {
            this.camera.position.set(0, 60, 0.01);
            this.controls.target.set(0, 0, 0);
        } else {
            this.camera.position.set(0, 45, 38);
            this.controls.target.set(0, 0, 0);
        }
        this.controls.update();
    }

    resetCamera() {
        this.setCameraView(false);
    }

    // تدوير الكاميرا بسلاسة تامة أفقياً ورأسياً (Smooth Orbit)
    orbitCamera(deltaAzimuthDeg = 15, deltaPolarDeg = 0) {
        if (!this.controls || !this.camera) return;
        const dTheta = (deltaAzimuthDeg * Math.PI) / 180;
        const dPhi = (deltaPolarDeg * Math.PI) / 180;
        
        const offset = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
        const spherical = new THREE.Spherical().setFromVector3(offset);
        spherical.theta += dTheta;
        spherical.phi = Math.max(0.08, Math.min(Math.PI - 0.08, spherical.phi + dPhi));
        offset.setFromSpherical(spherical);
        this.camera.position.copy(this.controls.target).add(offset);
        this.controls.update();
    }

    // تقريب وتبعيد الكاميرا بسلاسة تامة (Smooth Zoom)
    zoomCamera(factor = 0.8) {
        if (!this.controls || !this.camera) return;
        const offset = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
        const newLen = offset.length() * factor;
        const minD = this.controls.minDistance || 0.5;
        const maxD = this.controls.maxDistance || 3500;
        if (newLen >= minD && newLen <= maxD) {
            offset.multiplyScalar(factor);
            this.camera.position.copy(this.controls.target).add(offset);
            this.controls.update();
        }
    }

    // إزاحة وتحريك الكاميرا في فضاء الشاشة (Smooth Screen-space Pan)
    panCamera(deltaX = 0, deltaY = 0) {
        if (!this.controls || !this.camera) return;
        const eye = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
        const right = new THREE.Vector3().crossVectors(this.camera.up, eye).normalize();
        const up = new THREE.Vector3().copy(this.camera.up).normalize();

        const move = new THREE.Vector3()
            .addScaledVector(right, deltaX)
            .addScaledVector(up, deltaY);

        this.camera.position.add(move);
        this.controls.target.add(move);
        this.controls.update();
    }

    // تفعيل أو تعطيل نمط أداة اليد لتحريك وإزاحة المشهد بسلاسة (Pan Hand Tool Mode)
    togglePanMode(forceState = null) {
        this.isPanMode = (forceState !== null) ? forceState : !this.isPanMode;
        if (this.controls && this.controls.mouseButtons) {
            this.controls.mouseButtons.LEFT = this.isPanMode ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
        }
        const canvas = this.renderer?.domElement;
        if (canvas) {
            canvas.style.cursor = this.isPanMode ? 'grab' : '';
        }
        const btn = document.getElementById('btn-nav-hand-pan');
        if (btn) {
            btn.classList.toggle('active', this.isPanMode);
            if (this.isPanMode) {
                btn.style.background = 'rgba(37, 99, 235, 0.45)';
                btn.style.borderColor = '#38bdf8';
                btn.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.6)';
            } else {
                btn.style.background = '';
                btn.style.borderColor = '';
                btn.style.boxShadow = '';
            }
        }
        return this.isPanMode;
    }

    /**
     * تدوير كامل كتل ومجسمات الـ IFC حول أحد المحاور بمقدار زاوية محددة
     * وتعديل الارتفاع بحيث يستقر أسفل المبنى بدقة على أرضية المشهد (Y = 0)
     * @param {string} axis 'x' | 'y' | 'z'
     * @param {number} angleRad زاوية التدوير بالراديان (افتراضياً Math.PI / 2 أي 90 درجة)
     */
    rotateModel(axis = 'x', angleRad = Math.PI / 2) {
        const meshes = this.bimMeshes || [];
        if (meshes.length === 0) {
            console.warn("rotateModel: لا توجد مجسمات BIM نشطة لتدويرها.");
            return;
        }

        const rotMat = new THREE.Matrix4();
        if (axis === 'x') rotMat.makeRotationX(angleRad);
        else if (axis === 'y') rotMat.makeRotationY(angleRad);
        else if (axis === 'z') rotMat.makeRotationZ(angleRad);

        // تطبيق التدوير على رؤوس هندسة كل عنصر
        for (const mesh of meshes) {
            mesh.geometry.applyMatrix4(rotMat);
            mesh.geometry.computeBoundingBox();
            mesh.geometry.computeBoundingSphere();
        }

        // إعادة حساب الصندوق المحيط الإجمالي وتوسيط المبنى رأسياً وأفقياً
        const globalBox = new THREE.Box3();
        for (const mesh of meshes) {
            if (mesh.geometry.boundingBox) {
                globalBox.union(mesh.geometry.boundingBox);
            }
        }

        const center = new THREE.Vector3();
        globalBox.getCenter(center);
        const minY = globalBox.min.y;

        const offX = -center.x;
        const offY = -minY;
        const offZ = -center.z;

        for (const mesh of meshes) {
            mesh.geometry.translate(offX, offY, offZ);
            mesh.geometry.computeBoundingBox();
            mesh.geometry.computeBoundingSphere();
            mesh.updateMatrix();
        }

        // تحديث أبعاد المخطط وإعادة تأطير الكاميرا
        this.frameBuildingInView(this.buildingData);
        console.log(`✓ تم تدوير مجسمات المبنى حول المحور ${axis.toUpperCase()} بمقدار ${(angleRad * 180 / Math.PI).toFixed(0)}° وتعديل الارتفاع.`);
    }

    /**
     * الضبط والاستقامة التلقائية للنموذج (Auto-Level)
     * يفحص سماكة البلاطات لجعل السطح الأفقي مستوياً ومستقراً على أرضية المشهد
     */
    autoLevelModel() {
        const meshes = this.bimMeshes || [];
        if (meshes.length === 0) return;

        const slabs = meshes.filter(m => m.userData?.category === 'slabs_floor' || m.userData?.category === 'slabs_roof');
        const targetMeshes = slabs.length > 0 ? slabs : meshes;

        let sumDx = 0, sumDy = 0, sumDz = 0;
        for (const m of targetMeshes) {
            const b = m.geometry.boundingBox;
            if (!b) continue;
            sumDx += Math.abs(b.max.x - b.min.x);
            sumDy += Math.abs(b.max.y - b.min.y);
            sumDz += Math.abs(b.max.z - b.min.z);
        }

        if (sumDz < sumDy * 0.6 && sumDz < sumDx * 0.6) {
            // Z يمثل السماكة (المبنى نائم على جانبه) -> تدوير حول X بـ -90 درجة
            this.rotateModel('x', -Math.PI / 2);
        } else if (sumDx < sumDy * 0.6 && sumDx < sumDz * 0.6) {
            // X يمثل السماكة -> تدوير حول Z بـ 90 درجة
            this.rotateModel('z', Math.PI / 2);
        } else {
            // Y هو السماكة أصلاً (النموذج قائم بالفعل)
            this.rotateModel('y', 0);
        }
    }

    fitCameraToBuilding() {
        this.frameBuildingInView(this.buildingData);
    }

    frameBuildingInView(modelData = null) {
        let center = new THREE.Vector3(0, 0, 0);
        let maxDim = 45.0;

        // احتساب المركز الحقيقي والأبعاد الفراغية القصوى لكامل عناصر المبنى
        if (this.buildingGroup && this.buildingGroup.children.length > 0) {
            const box = new THREE.Box3().setFromObject(this.buildingGroup);
            if (!box.isEmpty()) {
                box.getCenter(center);
                const size = new THREE.Vector3();
                box.getSize(size);
                maxDim = Math.max(size.x, size.y, size.z, 20.0);
            }
        } else if (modelData && modelData.blueprintBounds) {
            maxDim = Math.max(modelData.blueprintBounds.width || 45, modelData.blueprintBounds.depth || 45);
        }

        // 1. إعادة ضبط ارتكاز الكاميرا (OrbitControls Target) على مركز المبنى الحقيقي
        // هذا يضمن دوران الكاميرا بسلاسة تامة حول المبنى نفسه بدلاً من الدوران حول فراغ
        if (this.controls && this.controls.target) {
            this.controls.target.copy(center);
        }

        // 2. احتساب الموضع الدقيق للكاميرا لتأطير المبنى بارتفاع وحجم مثاليين في منتصف الشاشة
        if (this.isTopView) {
            this.camera.position.set(center.x, center.y + Math.max(55, maxDim * 1.4), center.z + 0.01);
        } else {
            const dist = Math.max(45, maxDim * 1.25);
            this.camera.position.set(center.x, center.y + dist * 0.75, center.z + dist * 0.9);
        }

        this.camera.near = 0.5;
        this.camera.far = Math.max(6000, maxDim * 20);
        this.camera.updateProjectionMatrix();

        if (this.controls && typeof this.controls.update === 'function') {
            this.controls.update();
        }
    }

    // تبديل خلفية المشهد ثلاثي الأبعاد بين الأبيض الناصع والداكن بضغطة زر
    toggleBackgroundTheme() {
        this.isWhiteBackground = !this.isWhiteBackground;
        const containerEl = document.getElementById('viewport-container');
        const canvasEl = this.renderer ? this.renderer.domElement : null;
        if (this.isWhiteBackground) {
            this.scene.background = new THREE.Color(0xffffff);
            if (this.renderer) this.renderer.setClearColor(0xffffff, 1.0);
            if (this.gridHelper) {
                this.scene.remove(this.gridHelper);
                this.gridHelper = new THREE.GridHelper(300, 100, 0x94a3b8, 0xe2e8f0);
                this.gridHelper.position.y = -0.05;
                if (this.gridHelper.material) {
                    this.gridHelper.material.transparent = true;
                    this.gridHelper.material.opacity = 0.85;
                    this.gridHelper.material.depthWrite = false;
                }
                this.scene.add(this.gridHelper);
            }
            if (containerEl) containerEl.style.background = '#ffffff';
            if (canvasEl) canvasEl.style.background = '#ffffff';
        } else {
            this.scene.background = new THREE.Color(0x0c111a);
            if (this.renderer) this.renderer.setClearColor(0x0c111a, 1.0);
            if (this.gridHelper) {
                this.scene.remove(this.gridHelper);
                this.gridHelper = new THREE.GridHelper(300, 100, 0xffffff, 0x475569);
                this.gridHelper.position.y = -0.05;
                if (this.gridHelper.material) {
                    this.gridHelper.material.transparent = true;
                    this.gridHelper.material.opacity = 0.6;
                    this.gridHelper.material.depthWrite = false;
                }
                this.scene.add(this.gridHelper);
            }
            if (containerEl) containerEl.style.background = '#0a0d14';
            if (canvasEl) canvasEl.style.background = '#0a0d14';
        }
        return this.isWhiteBackground;
    }

    clearBlueprint() {
        if (this.blueprintMesh) {
            if (this.blueprintMesh.geometry) this.blueprintMesh.geometry.dispose();
            if (this.blueprintMesh.material) {
                if (this.blueprintMesh.material.map) this.blueprintMesh.material.map.dispose();
                this.blueprintMesh.material.dispose();
            }
            if (this.buildingGroup) this.buildingGroup.remove(this.blueprintMesh);
            this.blueprintMesh = null;
        }
        const bpOpCtrl = document.getElementById('hud-blueprint-opacity-ctrl');
        const zonesOpCtrl = document.getElementById('hud-zones-opacity-ctrl');
        const bpScalePanel = document.getElementById('hud-blueprint-scale-panel');
        if (bpOpCtrl) bpOpCtrl.style.display = 'none';
        if (zonesOpCtrl) zonesOpCtrl.style.display = 'none';
        if (bpScalePanel) bpScalePanel.style.display = 'none';
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = Math.min(this.clock.getDelta(), 0.08);

        // تحريك وتحديث جسيمات التدفق الحركي المعماري عبر شبكة المسارات
        if (this.particleSystem && this.particleAgents && this.particleAgents.length > 0 && this.circulationRoutes.length > 0) {
            const positions = this.particleSystem.geometry.attributes.position.array;
            const colors = this.particleSystem.geometry.attributes.color.array;
            const activeRoutes = this.circulationRoutes.filter(r => r.active);

            for (let i = 0; i < this.particleAgents.length; i++) {
                const agent = this.particleAgents[i];
                let route = this.circulationRoutes[agent.routeIndex];

                if (!route || !route.active) {
                    if (activeRoutes.length > 0) {
                        route = activeRoutes[Math.floor(Math.random() * activeRoutes.length)];
                        agent.routeIndex = this.circulationRoutes.indexOf(route);
                        agent.dist = Math.random() * route.totalLength;
                    } else {
                        continue;
                    }
                }

                // تقدم الجسيم على طول مسار الرحلة المعمارية باتجاه أمامي مستمر
                const speedMul = agent.speedMultiplier || 1.0;
                agent.dist += agent.speed * agent.dir * delta * speedMul;

                // عند إتمام دورة الرحلة المعمارية، إعادة التدفق المستمر من بداية المسار بانسيابية تامة
                if (agent.dist >= route.totalLength) {
                    agent.dist = agent.dist % route.totalLength;

                    // إمكانية انتقال الجسيم لرحلة وظيفية متصلة تبدأ من نفس الموقع (عند المدخل أو الشريان)
                    if (Math.random() < 0.35 && activeRoutes.length > 1) {
                        const startPt = route.points[0];
                        const connectingCandidates = [];
                        for (const cand of activeRoutes) {
                            if (cand === route) continue;
                            const candStart = cand.points[0];
                            if (Math.hypot(candStart.x - startPt.x, candStart.z - startPt.z) < 2.0) {
                                connectingCandidates.push(cand);
                            }
                        }
                        if (connectingCandidates.length > 0) {
                            const chosen = connectingCandidates[Math.floor(Math.random() * connectingCandidates.length)];
                            agent.routeIndex = this.circulationRoutes.indexOf(chosen);
                            agent.dist = 0;
                            route = chosen;
                        }
                    }
                } else if (agent.dist < 0) {
                    agent.dist = 0;
                }

                // احتساب الإحداثيات ثلاثية الأبعاد الدقيقة مع انزياح حارة السير
                const pos = this.evaluateRoutePosition(route, agent.dist, agent.laneOffset);
                positions[i * 3] = pos.x;
                positions[i * 3 + 1] = pos.y;
                positions[i * 3 + 2] = pos.z;

                // تحديث ألوان الجسيمات
                colors[i * 3] = agent.currentColor.r;
                colors[i * 3 + 1] = agent.currentColor.g;
                colors[i * 3 + 2] = agent.currentColor.b;
            }

            this.particleSystem.geometry.attributes.position.needsUpdate = true;
            this.particleSystem.geometry.attributes.color.needsUpdate = true;
        }

        // نبض وتوهج بصري لمستشعرات IoT في المشهد
        if (this.iotSensorsGroup && this.iotSensorsVisible && this.sensorMeshes) {
            const t = Date.now() * 0.003;
            for (const group of Object.values(this.sensorMeshes)) {
                if (!group) continue;
                group.children.forEach(c => {
                    if (c.geometry && c.geometry.type === 'RingGeometry') {
                        const s = 1.0 + 0.15 * Math.sin(t + group.position.x);
                        c.scale.set(s, s, s);
                    } else if (c.geometry && c.geometry.type === 'ConeGeometry') {
                        if (c.material) {
                            c.material.opacity = 0.2 + 0.15 * Math.abs(Math.sin(t + group.position.z));
                        }
                    }
                });
            }
        }

        if (this.controls && typeof this.controls.update === 'function') {
            this.controls.update();
        }
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    setupBlueprintHudEvents() {
        // 1. منزلق شفافية المخطط المعماري
        const sliderBp = document.getElementById('slider-blueprint-opacity');
        const labelBp = document.getElementById('label-blueprint-opacity');
        if (sliderBp) {
            sliderBp.addEventListener('input', (e) => {
                const val = parseInt(e.target.value) / 100;
                this.setBlueprintOpacity(val);
                if (labelBp) labelBp.textContent = `${e.target.value}%`;
            });
        }

        // 2. منزلق شفافية كتل الفضاءات ثلاثية الأبعاد
        const sliderZones = document.getElementById('slider-zones-opacity');
        const labelZones = document.getElementById('label-zones-opacity');
        if (sliderZones) {
            sliderZones.addEventListener('input', (e) => {
                const val = parseInt(e.target.value) / 100;
                this.setSpacesOpacity(val);
                if (labelZones) labelZones.textContent = `${e.target.value}%`;
            });
        }

        // 3. زر إظهار / إخفاء المخطط المعماري
        const toggleVisBtn = document.getElementById('btn-toggle-blueprint-vis');
        if (toggleVisBtn) {
            toggleVisBtn.addEventListener('click', () => {
                this.blueprintVisible = !this.blueprintVisible;
                this.setBlueprintVisible(this.blueprintVisible);
                toggleVisBtn.textContent = this.blueprintVisible ? '👁️ إخفاء المسقط' : '👁️ إظهار المسقط';
            });
        }

        // 4. زر إظهار / إخفاء الجدران والفتحات المعمارية ثلاثية الأبعاد
        const toggleWallsBtn = document.getElementById('btn-toggle-walls-vis');
        if (toggleWallsBtn) {
            toggleWallsBtn.addEventListener('click', () => {
                this.toggleWallsVisibility();
                toggleWallsBtn.textContent = this.wallsVisible ? '🧱 إخفاء الجدران' : '🧱 إظهار الجدران';
            });
        }

        // 5. زر إظهار / إخفاء تدفق الحركة الحركية المعمارية (Spatial Flow)
        const toggleFlowBtn = document.getElementById('btn-toggle-flow-vis');
        if (toggleFlowBtn) {
            toggleFlowBtn.addEventListener('click', () => {
                this.flowVisible = !this.flowVisible;
                if (this.particleSystem) {
                    this.particleSystem.visible = this.flowVisible;
                }
                if (this.circulationRoutesGroup) {
                    this.circulationRoutesGroup.visible = this.flowVisible;
                }
                toggleFlowBtn.textContent = this.flowVisible ? '⚡ إخفاء تدفق الحركة' : '⚡ إظهار تدفق الحركة';
            });
        }

        // 5.ب زر تخصيص لون التدفق الحركي على الخلفية البيضاء
        const toggleFlowThemeBtn = document.getElementById('btn-toggle-flow-theme');
        if (toggleFlowThemeBtn) {
            this.updateFlowThemeUI();
            toggleFlowThemeBtn.addEventListener('click', () => {
                this.cycleFlowTheme();
            });
        }

        // 6. زر إظهار / إخفاء مستشعرات الـ IoT في المشهد ثلاثي الأبعاد
        const toggleIoTBtn = document.getElementById('btn-toggle-iot-vis');
        if (toggleIoTBtn) {
            toggleIoTBtn.addEventListener('click', () => {
                this.toggleIoTSensorsVisibility();
            });
        }

        // 7. زر إظهار / إخفاء عناوين وشارات الفضاءات المعمارية
        const toggleLabelsBtn = document.getElementById('btn-toggle-labels-vis');
        if (toggleLabelsBtn) {
            toggleLabelsBtn.addEventListener('click', () => {
                this.toggleSpaceLabelsVisibility();
            });
        }
    }

    generateDefaultSensorsFromModel() {
        const bData = this.buildingData || {};
        const spaces = bData.spaces || {};
        const openings = bData.openings || {};
        const sensors = {};

        // 1. مستشعرات الفضاءات (PIR & Environmental)
        for (const [sid, sp] of Object.entries(spaces)) {
            const b = sp.bounds || { x: 0, z: 0, width: 10, depth: 8 };
            const cx = (b.x || 0) + (b.width || 10) / 2.0;
            const cz = (b.z || 0) + (b.depth || 8) / 2.0;
            const baseY = sp.base_elevation || 0;
            const h = (b.height || 3.5);

            // حساس حركة وإشغال PIR سقفي
            const pirId = `pir_${sid}`;
            sensors[pirId] = {
                id: pirId,
                type: 'PIR_OCCUPANCY',
                space_id: sid,
                name_ar: `حساس حركة وإشغال (${sp.name_ar || sid})`,
                position: { x: +cx.toFixed(2), y: +(baseY + h - 0.2).toFixed(2), z: +cz.toFixed(2) },
                status: 'ONLINE',
                battery: 98.5
            };

            // مستشعر بيئي CO2 في القاعات الرئيسية والمكاتب
            if (sp.type === 'public' || sp.type === 'flexible' || sp.type === 'workspace') {
                const envId = `env_${sid}`;
                sensors[envId] = {
                    id: envId,
                    type: 'ENVIRONMENTAL_TELEMETRY',
                    space_id: sid,
                    name_ar: `مستشعر بيئي وCO2 (${sp.name_ar || sid})`,
                    position: { x: +(cx + 1.2).toFixed(2), y: +(baseY + 2.4).toFixed(2), z: +cz.toFixed(2) },
                    status: 'ONLINE',
                    co2_baseline: 420.0
                };
            }
        }

        // 2. عدادات تدفق المشاة عند الأبواب
        for (const [oid, op] of Object.entries(openings)) {
            if (op.type === 'door' || op.type === 'passage') {
                const pos = op.position || [0, 0];
                const doorX = pos[0];
                const doorZ = pos[1];
                const cntId = `counter_${oid}`;
                sensors[cntId] = {
                    id: cntId,
                    type: 'OPTICAL_DOOR_COUNTER',
                    door_id: oid,
                    name_ar: `عداد مرور (${op.name_ar || oid})`,
                    position: { x: +doorX.toFixed(2), y: 2.2, z: +doorZ.toFixed(2) },
                    status: 'ONLINE'
                };
            }
        }

        return sensors;
    }

    initIoTSensors() {
        if (this.iotSensorsGroup && this.buildingGroup) {
            this.buildingGroup.remove(this.iotSensorsGroup);
            this.iotSensorsGroup.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            });
        }
        this.iotSensorsGroup = new THREE.Group();
        this.iotSensorsVisible = true;
        this.sensorMeshes = {};
        this.hoveredSensorId = null;
        if (this.buildingGroup) {
            this.buildingGroup.add(this.iotSensorsGroup);
        }

        const fallbackLocalSensors = () => {
            const sensors = this.generateDefaultSensorsFromModel();
            this.iotSensors = sensors;
            for (const [sId, s] of Object.entries(sensors)) {
                this.addIoTSensorMesh(s);
            }
        };

        if (window.location.hostname.includes('github.io') || window.location.protocol === 'file:') {
            fallbackLocalSensors();
            return;
        }

        fetch('/api/iot/sensors')
            .then(res => {
                if (!res.ok) throw new Error("HTTP " + res.status);
                return res.json();
            })
            .then(data => {
                const sensors = data.sensors || {};
                const sensorEntries = Object.entries(sensors);
                if (sensorEntries.length === 0) {
                    fallbackLocalSensors();
                } else {
                    this.iotSensors = sensors;
                    for (const [sId, s] of sensorEntries) {
                        this.addIoTSensorMesh(s);
                    }
                }
            })
            .catch(e => {
                console.warn("Failed to load 3D IoT sensors from server, using local model sensors:", e);
                fallbackLocalSensors();
            });
    }

    addIoTSensorMesh(s) {
        if (!s || !s.id) return null;
        if (!this.iotSensors) {
            this.iotSensors = {};
        }
        this.iotSensors[s.id] = s;
        if (!this.iotSensorsGroup) {
            this.iotSensorsGroup = new THREE.Group();
            if (this.buildingGroup) this.buildingGroup.add(this.iotSensorsGroup);
        }
        if (!this.sensorMeshes) {
            this.sensorMeshes = {};
        }
        if (this.sensorMeshes[s.id]) {
            this.removeIoTSensorMesh(s.id);
        }

        const sensorGroup = new THREE.Group();
        sensorGroup.name = `sensor_${s.id}`;
        sensorGroup.userData = { type: 'iot_sensor', sensorId: s.id, sensor: s };

        const pos = s.position || { x: 0, y: 3.2, z: 0 };
        const sType = s.type || 'PIR_OCCUPANCY';

        if (sType === 'PIR_OCCUPANCY') {
            // 1. مستشعر PIR سقفي: قاعدة تثبيت معدنية + قبة كروية مشعة + حلقة رصد إشعاعي
            const baseGeom = new THREE.CylinderGeometry(0.28, 0.28, 0.05, 16);
            const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
            const baseMesh = new THREE.Mesh(baseGeom, baseMat);
            baseMesh.position.set(0, 0.1, 0);
            baseMesh.userData = sensorGroup.userData;
            sensorGroup.add(baseMesh);

            const domeGeom = new THREE.SphereGeometry(0.24, 16, 16);
            const domeMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff });
            const domeMesh = new THREE.Mesh(domeGeom, domeMat);
            domeMesh.position.set(0, 0, 0);
            domeMesh.userData = sensorGroup.userData;
            sensorGroup.add(domeMesh);

            const ringGeom = new THREE.RingGeometry(0.4, 0.75, 24);
            ringGeom.rotateX(-Math.PI / 2);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
            const ring = new THREE.Mesh(ringGeom, ringMat);
            ring.position.set(0, -0.05, 0);
            ring.userData = sensorGroup.userData;
            sensorGroup.add(ring);

            sensorGroup.position.set(pos.x, pos.y || 3.35, pos.z);
        } else if (sType === 'ENVIRONMENTAL_TELEMETRY') {
            // 2. مستشعر بيئي وCO2: كبسولة خضراء مع حلقة LED زمردية
            const capGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.35, 16);
            const capMat = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.4 });
            const capMesh = new THREE.Mesh(capGeom, capMat);
            capMesh.userData = sensorGroup.userData;
            sensorGroup.add(capMesh);

            const ledGeom = new THREE.TorusGeometry(0.2, 0.03, 8, 24);
            ledGeom.rotateX(Math.PI / 2);
            const ledMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
            const ledMesh = new THREE.Mesh(ledGeom, ledMat);
            ledMesh.position.set(0, 0, 0);
            ledMesh.userData = sensorGroup.userData;
            sensorGroup.add(ledMesh);

            sensorGroup.position.set(pos.x, pos.y || 2.5, pos.z);
        } else if (sType === 'ACOUSTIC_NOISE') {
            // 3. مستشعر صوتي وضوضاء: قبة بنفسجية مع حلقة تموجات صوتية
            const domeGeom = new THREE.SphereGeometry(0.22, 12, 12);
            const domeMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
            const domeMesh = new THREE.Mesh(domeGeom, domeMat);
            domeMesh.userData = sensorGroup.userData;
            sensorGroup.add(domeMesh);

            const waveGeom = new THREE.RingGeometry(0.3, 0.6, 16);
            waveGeom.rotateX(-Math.PI / 2);
            const waveMat = new THREE.MeshBasicMaterial({ color: 0xc084fc, side: THREE.DoubleSide, transparent: true, opacity: 0.45 });
            const wave = new THREE.Mesh(waveGeom, waveMat);
            wave.position.set(0, -0.05, 0);
            wave.userData = sensorGroup.userData;
            sensorGroup.add(wave);

            sensorGroup.position.set(pos.x, pos.y || 3.1, pos.z);
        } else if (sType === 'OPTICAL_DOOR_COUNTER') {
            // 4. عداد بصري للأبواب: عارضة أفقية ذهبية فوق العتبة + شعاع رصد عمودي مخروطي
            const barGeom = new THREE.BoxGeometry(0.65, 0.1, 0.15);
            const barMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3 });
            const barMesh = new THREE.Mesh(barGeom, barMat);
            barMesh.userData = sensorGroup.userData;
            sensorGroup.add(barMesh);

            const beamGeom = new THREE.ConeGeometry(0.35, 2.1, 16, 1, true);
            beamGeom.rotateX(Math.PI);
            beamGeom.translate(0, -1.05, 0);
            const beamMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
            const beamMesh = new THREE.Mesh(beamGeom, beamMat);
            beamMesh.userData = sensorGroup.userData;
            sensorGroup.add(beamMesh);

            sensorGroup.position.set(pos.x, pos.y || 2.25, pos.z);
        } else {
            const geom = new THREE.SphereGeometry(0.25, 12, 12);
            const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
            const mesh = new THREE.Mesh(geom, mat);
            mesh.userData = sensorGroup.userData;
            sensorGroup.add(mesh);
            sensorGroup.position.set(pos.x, pos.y || 3.0, pos.z);
        }

        this.iotSensorsGroup.add(sensorGroup);
        this.sensorMeshes[s.id] = sensorGroup;
        return sensorGroup;
    }

    removeIoTSensorMesh(sensorId) {
        if (!this.sensorMeshes || !this.sensorMeshes[sensorId]) return;
        const group = this.sensorMeshes[sensorId];
        if (this.iotSensorsGroup) {
            this.iotSensorsGroup.remove(group);
        }
        group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        });
        delete this.sensorMeshes[sensorId];
        if (this.iotSensors) delete this.iotSensors[sensorId];
    }

    highlightIoTSensor(sensorId) {
        this.clearIoTSensorHighlight();
        if (!this.sensorMeshes || !this.sensorMeshes[sensorId]) return;
        const group = this.sensorMeshes[sensorId];
        group.scale.set(1.4, 1.4, 1.4);
        this.hoveredSensorId = sensorId;
    }

    clearIoTSensorHighlight() {
        if (this.hoveredSensorId && this.sensorMeshes && this.sensorMeshes[this.hoveredSensorId]) {
            this.sensorMeshes[this.hoveredSensorId].scale.set(1.0, 1.0, 1.0);
        }
        this.hoveredSensorId = null;
    }

    toggleIoTSensorsVisibility() {
        this.iotSensorsVisible = !this.iotSensorsVisible;
        if (this.iotSensorsGroup) {
            this.iotSensorsGroup.visible = this.iotSensorsVisible;
        }
        const btn = document.getElementById('btn-toggle-iot-vis');
        if (btn) {
            btn.textContent = this.iotSensorsVisible ? '📡 إخفاء الحساسات' : '📡 إظهار الحساسات';
        }
    }

    toggleSpaceLabelsVisibility() {
        this.labelsVisible = !this.labelsVisible;
        if (this.labelSprites) {
            for (const badge of Object.values(this.labelSprites)) {
                if (badge && badge.sprite) {
                    badge.sprite.visible = this.labelsVisible;
                }
            }
        }
        if (this.stairBadges) {
            for (const sprite of Object.values(this.stairBadges)) {
                if (sprite) {
                    sprite.visible = this.labelsVisible;
                }
            }
        }
        const btn = document.getElementById('btn-toggle-labels-vis');
        if (btn) {
            btn.textContent = this.labelsVisible ? '🏷️ إخفاء العناوين' : '🏷️ إظهار العناوين';
        }
    }

    buildStaircases(stairs) {
        if (this.stairMeshes) {
            for (const [id, grp] of Object.entries(this.stairMeshes)) {
                if (grp) {
                    if (grp.parent) grp.parent.remove(grp);
                    grp.traverse(child => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                            else child.material.dispose();
                        }
                    });
                }
            }
        }
        this.stairMeshes = {};
        if (this.stairBadges) {
            for (const [id, sp] of Object.entries(this.stairBadges)) {
                if (sp) {
                    if (sp.parent) sp.parent.remove(sp);
                    if (sp.material?.map) sp.material.map.dispose();
                    if (sp.material) sp.material.dispose();
                }
            }
        }
        this.stairBadges = {};

        if (!stairs) return;
        if (!this.buildingData) this.buildingData = {};
        this.buildingData.stairs = stairs;

        for (const [sId, stair] of Object.entries(stairs)) {
            const stairGroup = new THREE.Group();
            stairGroup.userData = { type: 'stair', stairId: sId };

            const posX = stair.position ? stair.position[0] : 0;
            const posZ = stair.position ? stair.position[1] : 0;
            const width = stair.width || 2.4;
            const depth = stair.depth || 4.5;
            const numSteps = stair.num_steps || 18;
            const floorHeight = 2.8;
            const rotDeg = stair.rotation || 0;
            const rotRad = (rotDeg * Math.PI) / 180.0;
            const direction = stair.direction || (stair.stair_type === 'emergency' ? 'down' : 'two_way');

            const isEmergency = stair.stair_type === 'emergency';
            const stepMat = new THREE.MeshStandardMaterial({
                color: isEmergency ? 0x7f8c8d : 0x34495e,
                roughness: 0.35,
                metalness: 0.25
            });
            const edgeMat = new THREE.LineBasicMaterial({
                color: isEmergency ? 0xe74c3c : (direction === 'down' ? 0xe67e22 : (direction === 'up' ? 0x2ecc71 : 0x00d2ff)),
                transparent: true,
                opacity: 0.85
            });

            const railMat = new THREE.MeshStandardMaterial({
                color: 0xecf0f1,
                metalness: 0.85,
                roughness: 0.15
            });
            const railRadius = 0.032;
            const railHeight = 0.9;

            const startZ = -depth / 2.0;

            if (direction === 'two_way') {
                // ==========================================
                // 1. سلم مزدوج باتجاهين (Dogleg Staircase - شاحطين مع بسطة وسطية)
                // ==========================================
                const halfSteps = Math.max(6, Math.floor(numSteps / 2));
                const midHeight = floorHeight / 2.0; // 1.4m
                const stepRise = midHeight / halfSteps;
                const flightRun = (depth * 0.46) / halfSteps;
                const flightWidth = (width * 0.88 - 0.15) / 2.0;
                const xFlight1 = -(width * 0.44 - flightWidth / 2.0); // الشاحط الأيسر (صعود)
                const xFlight2 = (width * 0.44 - flightWidth / 2.0);  // الشاحط الأيمن (نزول / إكمال)

                // أ. الشاحط الأول (صعود من 0 إلى بسطة الاستراحة 1.4م)
                for (let i = 0; i < halfSteps; i++) {
                    const sHeight = stepRise * (i + 1);
                    const sGeo = new THREE.BoxGeometry(flightWidth, sHeight, flightRun * 1.05);
                    const sMesh = new THREE.Mesh(sGeo, stepMat);
                    sMesh.position.set(xFlight1, sHeight / 2.0, startZ + i * flightRun + flightRun / 2.0);
                    sMesh.castShadow = true;
                    sMesh.receiveShadow = true;
                    sMesh.userData = { type: 'stair', stairId: sId };
                    sMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(sGeo), edgeMat));
                    stairGroup.add(sMesh);
                }

                // ب. بسطة الاستراحة الوسطية (Intermediate Landing) في الخلف
                const landingDepth = depth * 0.48;
                const landingGeo = new THREE.BoxGeometry(width * 0.88, 0.22, landingDepth);
                const landingMat = new THREE.MeshStandardMaterial({
                    color: isEmergency ? 0xc0392b : 0x2980b9,
                    roughness: 0.3,
                    metalness: 0.3
                });
                const landingMesh = new THREE.Mesh(landingGeo, landingMat);
                landingMesh.position.set(0, midHeight - 0.11, depth / 2.0 - landingDepth / 2.0);
                landingMesh.castShadow = true;
                landingMesh.receiveShadow = true;
                landingMesh.userData = { type: 'stair', stairId: sId };
                stairGroup.add(landingMesh);

                // ج. الشاحط الثاني (صعود من بسطة الاستراحة 1.4م إلى الطابق التالي 2.8م)
                for (let i = 0; i < halfSteps; i++) {
                    const sHeight = midHeight + stepRise * (i + 1);
                    const sGeo = new THREE.BoxGeometry(flightWidth, sHeight, flightRun * 1.05);
                    const sMesh = new THREE.Mesh(sGeo, stepMat);
                    // عكس اتجاه الشاحط الثاني أو متوازي صاعد
                    sMesh.position.set(xFlight2, sHeight / 2.0, startZ + (halfSteps - 1 - i) * flightRun + flightRun / 2.0);
                    sMesh.castShadow = true;
                    sMesh.receiveShadow = true;
                    sMesh.userData = { type: 'stair', stairId: sId };
                    sMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(sGeo), edgeMat));
                    stairGroup.add(sMesh);
                }

                // د. درابزينات الأمان (Handrails) للشاحطين والوسط
                const run1Total = halfSteps * flightRun;
                const rail1Length = Math.hypot(run1Total, midHeight);
                const rail1Angle = Math.atan2(midHeight, run1Total);

                // درابزين الشاحط الأول (صعود)
                [-width * 0.44, 0].forEach(xOff => {
                    const rGeo = new THREE.CylinderGeometry(railRadius, railRadius, rail1Length, 8);
                    const rMesh = new THREE.Mesh(rGeo, railMat);
                    rMesh.rotation.x = Math.PI / 2 - rail1Angle;
                    rMesh.position.set(xOff, midHeight / 2.0 + railHeight, startZ + run1Total / 2.0);
                    rMesh.userData = { type: 'stair', stairId: sId };
                    stairGroup.add(rMesh);
                });

                // درابزين الشاحط الثاني
                [0, width * 0.44].forEach(xOff => {
                    const rGeo = new THREE.CylinderGeometry(railRadius, railRadius, rail1Length, 8);
                    const rMesh = new THREE.Mesh(rGeo, railMat);
                    rMesh.rotation.x = -(Math.PI / 2 - rail1Angle);
                    rMesh.position.set(xOff, midHeight + midHeight / 2.0 + railHeight, startZ + run1Total / 2.0);
                    rMesh.userData = { type: 'stair', stairId: sId };
                    stairGroup.add(rMesh);
                });

                // هـ. مؤشرات التدفق المزدوج (صعود ⬆️ ونزول ⬇️)
                const arrowAscent = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(xFlight1, 0.08, startZ - 0.2), 1.5, 0x00d2ff, 0.4, 0.25);
                stairGroup.add(arrowAscent);

                const arrowDescent = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(xFlight2, 0.08, startZ + 1.3), 1.5, 0x2ecc71, 0.4, 0.25);
                stairGroup.add(arrowDescent);

                // منارة الربط المضيئة عند المدخلين
                const bGeo1 = new THREE.RingGeometry(0.2, 0.45, 24);
                const bMat1 = new THREE.MeshBasicMaterial({ color: 0x00d2ff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
                const bMesh1 = new THREE.Mesh(bGeo1, bMat1);
                bMesh1.rotation.x = -Math.PI / 2;
                bMesh1.position.set(xFlight1, 0.05, startZ);
                bMesh1.userData = { type: 'stair', stairId: sId };
                stairGroup.add(bMesh1);

                const bMat2 = new THREE.MeshBasicMaterial({ color: 0x2ecc71, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
                const bMesh2 = new THREE.Mesh(bGeo1, bMat2);
                bMesh2.rotation.x = -Math.PI / 2;
                bMesh2.position.set(xFlight2, 0.05, startZ);
                bMesh2.userData = { type: 'stair', stairId: sId };
                stairGroup.add(bMesh2);

            } else {
                // ==========================================
                // 2. سلم شاحط مفرد (صاعد باتجاه واحد أو نازل باتجاه واحد)
                // ==========================================
                const stepRise = floorHeight / numSteps;
                const stepRun = (depth * 0.72) / numSteps;
                const isDown = direction === 'down';

                for (let i = 0; i < numSteps; i++) {
                    const stepIdx = isDown ? (numSteps - 1 - i) : i;
                    const sHeight = stepRise * (stepIdx + 1);
                    const sGeo = new THREE.BoxGeometry(width * 0.88, sHeight, stepRun * 1.05);
                    const stepMesh = new THREE.Mesh(sGeo, stepMat);
                    stepMesh.position.set(0, sHeight / 2.0, startZ + i * stepRun + stepRun / 2.0);
                    stepMesh.castShadow = true;
                    stepMesh.receiveShadow = true;
                    stepMesh.userData = { type: 'stair', stairId: sId };
                    stepMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(sGeo), edgeMat));
                    stairGroup.add(stepMesh);
                }

                // بسطة وصول
                const landingDepth = depth * 0.28;
                const landingGeo = new THREE.BoxGeometry(width * 0.88, 0.2, landingDepth);
                const landingMat = new THREE.MeshStandardMaterial({
                    color: isEmergency ? 0xc0392b : (isDown ? 0xd35400 : 0x2980b9),
                    roughness: 0.3,
                    metalness: 0.3
                });
                const landingMesh = new THREE.Mesh(landingGeo, landingMat);
                const landingZPos = isDown ? (startZ + landingDepth / 2.0 - 0.2) : (depth / 2.0 - landingDepth / 2.0);
                landingMesh.position.set(0, floorHeight - 0.1, landingZPos);
                landingMesh.castShadow = true;
                landingMesh.receiveShadow = true;
                landingMesh.userData = { type: 'stair', stairId: sId };
                stairGroup.add(landingMesh);

                // درابزينات الأمان
                const runTotal = numSteps * stepRun;
                const railLength = Math.hypot(runTotal, floorHeight);
                const railAngle = Math.atan2(floorHeight, runTotal);

                [-width * 0.44, width * 0.44].forEach(xOffset => {
                    const railGeo = new THREE.CylinderGeometry(railRadius, railRadius, railLength, 8);
                    const railMesh = new THREE.Mesh(railGeo, railMat);
                    railMesh.rotation.x = isDown ? -(Math.PI / 2 - railAngle) : (Math.PI / 2 - railAngle);
                    railMesh.position.set(xOffset, floorHeight / 2.0 + railHeight, startZ + runTotal / 2.0);
                    railMesh.userData = { type: 'stair', stairId: sId };
                    stairGroup.add(railMesh);
                });

                // سهم اتجاه الحركة (صاعد ⬆️ أو نازل ⬇️)
                const arrowLength = Math.min(2.2, depth * 0.45);
                const arrowDir = isDown ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 0, 1);
                const arrowOrigin = isDown ? new THREE.Vector3(0, 0.06, depth / 2.0) : new THREE.Vector3(0, 0.06, startZ - 0.2);
                const arrowColor = isEmergency ? 0xff4757 : (isDown ? 0xe67e22 : 0x2ecc71);
                const arrowHelper = new THREE.ArrowHelper(arrowDir, arrowOrigin, arrowLength, arrowColor, 0.5, 0.32);
                stairGroup.add(arrowHelper);

                // منارة الربط المضيئة
                const beaconGeo = new THREE.RingGeometry(0.35, 0.65, 32);
                const beaconMat = new THREE.MeshBasicMaterial({
                    color: arrowColor,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.8
                });
                const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
                beaconMesh.rotation.x = -Math.PI / 2;
                beaconMesh.position.set(0, 0.05, isDown ? depth / 2.0 : startZ);
                beaconMesh.userData = { type: 'stair', stairId: sId };
                stairGroup.add(beaconMesh);
            }

            const baseY = stair.base_elevation || 0;
            stairGroup.position.set(posX, baseY, posZ);
            stairGroup.rotation.y = rotRad;
            stairGroup.userData = { type: 'stair', stairId: sId, storeyId: stair.storey_id, baseY: baseY };

            const stairParent = (stair.storey_id && this.storeyGroups[stair.storey_id]) || this.buildingGroup;
            stairParent.add(stairGroup);
            this.stairMeshes[sId] = stairGroup;

            // لوحة نصية عائمة (Floating Staircase Badge)
            this.createStairBadge(sId, stair, posX, posZ);
        }
    }

    createStairBadge(id, stair, x, z) {
        const canvas = document.createElement('canvas');
        canvas.width = 280;
        canvas.height = 136;
        const ctx = canvas.getContext('2d');

        const isEmergency = stair.stair_type === 'emergency';
        const direction = stair.direction || (isEmergency ? 'down' : 'two_way');

        let dirTitle = '🔁 باتجاهين (صاعد / نازل)';
        let dirColor = '#00d2ff';
        let borderColor = '#00d2ff';
        if (direction === 'up') {
            dirTitle = '⬆️ صاعد باتجاه واحد';
            dirColor = '#2ecc71';
            borderColor = '#2ecc71';
        } else if (direction === 'down') {
            dirTitle = '⬇️ نازل باتجاه واحد';
            dirColor = '#e67e22';
            borderColor = '#e67e22';
        }
        if (isEmergency) {
            dirTitle = '🚨 مخرج طوارئ وهروب';
            dirColor = '#e74c3c';
            borderColor = '#e74c3c';
        }

        ctx.fillStyle = 'rgba(15, 23, 36, 0.94)';
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(8, 8, 264, 120, 14);
        } else {
            ctx.rect(8, 8, 264, 120);
        }
        ctx.fill();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(stair.name_ar || 'سلم معماري', 140, 42);

        ctx.fillStyle = dirColor;
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(dirTitle, 140, 74);

        ctx.fillStyle = '#a4b0be';
        ctx.font = '13px sans-serif';
        ctx.fillText(`عرض: ${stair.width || 2.4}م | ${stair.num_steps || 18} درجات`, 140, 104);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        const baseY = stair.base_elevation || 0;
        sprite.position.set(x, baseY + 4.2, z);
        sprite.scale.set(6.5, 3.2, 1);
        sprite.userData = { type: 'stair', stairId: id, storeyId: stair.storey_id, baseY: baseY + 4.2 };
        sprite.visible = this.labelsVisible !== false;
        const badgeParent = (stair.storey_id && this.storeyGroups[stair.storey_id]) || this.buildingGroup;
        badgeParent.add(sprite);

        if (!this.stairBadges) this.stairBadges = {};
        this.stairBadges[id] = sprite;
    }

    buildSlabs(slabs, storeys) {
        if (this.slabMeshes) {
            for (const [id, mesh] of Object.entries(this.slabMeshes)) {
                if (mesh && mesh.parent) {
                    mesh.parent.remove(mesh);
                    if (mesh.geometry) mesh.geometry.dispose();
                    if (mesh.material) {
                        if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
                        else mesh.material.dispose();
                    }
                }
            }
        }
        this.slabMeshes = {};
        if (!slabs || Object.keys(slabs).length === 0) return;

        const floorSlabMat = new THREE.MeshStandardMaterial({
            color: 0x141f2e,
            roughness: 0.45,
            metalness: 0.2,
            transparent: true,
            opacity: 0.92
        });

        const roofSlabMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.35,
            metalness: 0.3,
            transparent: true,
            opacity: 0.95
        });

        for (const [sId, slab] of Object.entries(slabs)) {
            const b = slab.bounds || { x: -18, z: -14, width: 36, depth: 28 };
            const thick = slab.thickness || 0.25;
            const baseY = slab.base_elevation || 0;
            const isRoof = slab.type === 'roof';
            const poly = slab.polygon;

            let geo;
            let cx, cz;

            if (poly && Array.isArray(poly) && poly.length >= 3) {
                cx = poly.reduce((sum, pt) => sum + pt[0], 0) / poly.length;
                cz = poly.reduce((sum, pt) => sum + pt[1], 0) / poly.length;

                const shape = new THREE.Shape();
                shape.moveTo(poly[0][0] - cx, -(poly[0][1] - cz));
                for (let i = 1; i < poly.length; i++) {
                    shape.lineTo(poly[i][0] - cx, -(poly[i][1] - cz));
                }
                shape.closePath();

                const extrudeSettings = {
                    depth: thick,
                    bevelEnabled: false
                };
                geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                geo.rotateX(-Math.PI / 2);
            } else {
                geo = new THREE.BoxGeometry(b.width, thick, b.depth);
                cx = b.x + b.width / 2;
                cz = b.z + b.depth / 2;
            }

            const mat = isRoof ? roofSlabMat : floorSlabMat;
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(cx, baseY - thick / 2, cz);
            mesh.receiveShadow = true;
            mesh.userData = { 
                type: 'slab', 
                slabId: sId, 
                storeyId: slab.storey_id, 
                baseY: baseY - thick / 2,
                slabData: slab,
                ifcType: isRoof ? 'IfcRoof / IfcSlab' : (slab.type === 'site' ? 'IfcSite / Terrain' : 'IfcSlab')
            };

            // بلاطات الموقع العام / الأرضيات الشاسعة تخفى افتراضياً لتوفير رؤية معمارية نقية
            if (slab.type === 'site' || slab.is_site) {
                mesh.visible = false;
            }

            const edgeGeo = new THREE.EdgesGeometry(geo);
            const edgeLine = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({
                color: isRoof ? 0x64748b : 0x00d2ff,
                transparent: true,
                opacity: 0.65
            }));
            mesh.add(edgeLine);

            const targetParent = (slab.storey_id && this.storeyGroups[slab.storey_id]) || this.buildingGroup;
            targetParent.add(mesh);
            this.slabMeshes[sId] = mesh;
        }
    }

    buildColumns(columns, storeys) {
        if (this.columnMeshes) {
            for (const [id, mesh] of Object.entries(this.columnMeshes)) {
                if (mesh && mesh.parent) {
                    mesh.parent.remove(mesh);
                    if (mesh.geometry) mesh.geometry.dispose();
                    if (mesh.material) {
                        if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
                        else mesh.material.dispose();
                    }
                }
            }
        }
        this.columnMeshes = {};
        if (!columns || Object.keys(columns).length === 0) return;

        const colMat = new THREE.MeshStandardMaterial({
            color: 0x2b394e,
            roughness: 0.3,
            metalness: 0.4
        });

        for (const [cId, col] of Object.entries(columns)) {
            const pos = col.position || [0, 0];
            const w = col.width || 0.45;
            const d = col.depth || 0.45;
            const h = col.height || 3.5;
            const baseY = col.base_elevation || 0;

            const geo = new THREE.BoxGeometry(w, h, d);
            const mesh = new THREE.Mesh(geo, colMat);
            mesh.position.set(pos[0], baseY + h / 2, pos[1]);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData = { 
                type: 'column', 
                columnId: cId, 
                storeyId: col.storey_id, 
                baseY: baseY + h / 2,
                columnData: col,
                ifcType: 'IfcColumn'
            };

            const edgeGeo = new THREE.EdgesGeometry(geo);
            const edgeLine = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({
                color: 0x4a6585,
                transparent: true,
                opacity: 0.7
            }));
            mesh.add(edgeLine);

            const targetParent = (col.storey_id && this.storeyGroups[col.storey_id]) || this.buildingGroup;
            targetParent.add(mesh);
            this.columnMeshes[cId] = mesh;
        }
    }

    buildBeams(beams, storeys) {
        if (this.beamMeshes) {
            for (const [id, mesh] of Object.entries(this.beamMeshes)) {
                if (mesh && mesh.parent) {
                    mesh.parent.remove(mesh);
                    if (mesh.geometry) mesh.geometry.dispose();
                    if (mesh.material) {
                        if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
                        else mesh.material.dispose();
                    }
                }
            }
        }
        this.beamMeshes = {};
        if (!beams || Object.keys(beams).length === 0) return;

        const beamMat = new THREE.MeshStandardMaterial({
            color: 0x334155,
            roughness: 0.35,
            metalness: 0.45
        });

        for (const [bId, beam] of Object.entries(beams)) {
            const s = beam.start || [0, 0];
            const e = beam.end || [0, 0];
            const dx = e[0] - s[0], dz = e[1] - s[1];
            const len = Math.hypot(dx, dz);
            if (len < 0.3) continue;

            const angle = Math.atan2(dz, dx);
            const bw = beam.width || 0.4;
            const bh = beam.depth || beam.height || 0.6;
            const baseY = beam.base_elevation || 3.0;

            const geo = new THREE.BoxGeometry(len, bh, bw);
            const mesh = new THREE.Mesh(geo, beamMat);
            mesh.position.set((s[0] + e[0]) / 2, baseY - bh / 2, (s[1] + e[1]) / 2);
            mesh.rotation.y = -angle;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData = {
                type: 'beam',
                beamId: bId,
                storeyId: beam.storey_id,
                baseY: baseY,
                beamData: beam,
                ifcType: 'IfcBeam'
            };

            const edgeGeo = new THREE.EdgesGeometry(geo);
            const edgeLine = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({
                color: 0x64748b,
                transparent: true,
                opacity: 0.6
            }));
            mesh.add(edgeLine);

            const targetParent = (beam.storey_id && this.storeyGroups[beam.storey_id]) || this.buildingGroup;
            targetParent.add(mesh);
            this.beamMeshes[bId] = mesh;
        }
    }

    _createMergedBoxesGeometry(boxList) {
        const count = boxList.length;
        const vertexCount = count * 24;
        const indexCount = count * 36;

        const positions = new Float32Array(vertexCount * 3);
        const normals = new Float32Array(vertexCount * 3);
        const uvs = new Float32Array(vertexCount * 2);
        const indices = (vertexCount > 65535) ? new Uint32Array(indexCount) : new Uint16Array(indexCount);

        const dummy = new THREE.Object3D();
        const baseBox = new THREE.BoxGeometry(1, 1, 1);
        const bPos = baseBox.attributes.position.array;
        const bNorm = baseBox.attributes.normal.array;
        const bUv = baseBox.attributes.uv.array;
        const bIdx = baseBox.index.array;

        for (let i = 0; i < count; i++) {
            const b = boxList[i];
            dummy.position.set(b.x, b.y, b.z);
            dummy.rotation.set(0, b.rotY, 0);
            dummy.scale.set(b.w, b.h, b.d);
            dummy.updateMatrix();
            const m = dummy.matrix.elements;

            const vOff = i * 24;
            const iOff = i * 36;

            for (let v = 0; v < 24; v++) {
                const vx = bPos[v * 3];
                const vy = bPos[v * 3 + 1];
                const vz = bPos[v * 3 + 2];

                positions[(vOff + v) * 3] = vx * m[0] + vy * m[4] + vz * m[8] + m[12];
                positions[(vOff + v) * 3 + 1] = vx * m[1] + vy * m[5] + vz * m[9] + m[13];
                positions[(vOff + v) * 3 + 2] = vx * m[2] + vy * m[6] + vz * m[10] + m[14];

                const nx = bNorm[v * 3];
                const ny = bNorm[v * 3 + 1];
                const nz = bNorm[v * 3 + 2];
                normals[(vOff + v) * 3] = nx * m[0] + ny * m[4] + nz * m[8];
                normals[(vOff + v) * 3 + 1] = nx * m[1] + ny * m[5] + nz * m[9];
                normals[(vOff + v) * 3 + 2] = nx * m[2] + ny * m[6] + nz * m[10];

                uvs[(vOff + v) * 2] = bUv[v * 2];
                uvs[(vOff + v) * 2 + 1] = bUv[v * 2 + 1];
            }

            for (let idx = 0; idx < 36; idx++) {
                indices[iOff + idx] = vOff + bIdx[idx];
            }
        }

        baseBox.dispose();

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geo.setIndex(new THREE.BufferAttribute(indices, 1));
        return geo;
    }

    buildWallsAndOpenings(walls, openings, spaces) {
        // تنظيف وحذف أي كائنات جدران سابقة لمنع التراكم والتداخل عند التعديل والحذف
        if (this.wallMeshes) {
            for (const [oldId, oldGroup] of Object.entries(this.wallMeshes)) {
                if (oldGroup && this.buildingGroup) {
                    this.buildingGroup.remove(oldGroup);
                    oldGroup.traverse((child) => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                            else child.material.dispose();
                        }
                    });
                }
            }
        }
        this.wallMeshes = {};
        this.openingMeshes = {};
        if (this.wallHighlightMeshes) {
            for (const mesh of Object.values(this.wallHighlightMeshes)) {
                if (mesh && this.buildingGroup) this.buildingGroup.remove(mesh);
                if (mesh?.geometry) mesh.geometry.dispose();
                if (mesh?.material) mesh.material.dispose();
            }
        }
        this.wallHighlightMeshes = {};
        this.batchedWallBoxes = {};

        if (this.jointCapsGroup && this.buildingGroup) {
            this.buildingGroup.remove(this.jointCapsGroup);
            this.jointCapsGroup.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            });
        }
        this.jointCapsGroup = new THREE.Group();
        this.jointCapsGroup.visible = this.wallsVisible;
        this.buildingGroup.add(this.jointCapsGroup);

        // إذا لم تكن الجدران معرفة صراحة (null/undefined)، نولد جدران محيطية وفتحات تلقائياً من الفضاءات
        if (walls === undefined || walls === null) {
            walls = {};
            openings = openings || {};
            for (const [sid, space] of Object.entries(spaces || {})) {
                const b = space.bounds;
                const wn = `w_${sid}_n`, ws = `w_${sid}_s`, ww = `w_${sid}_w`, we = `w_${sid}_e`;
                walls[wn] = { id: wn, start: [b.x, b.z], end: [b.x + b.width, b.z], thickness: 0.25, height: 2.8, type: "exterior" };
                walls[ws] = { id: ws, start: [b.x, b.z + b.depth], end: [b.x + b.width, b.z + b.depth], thickness: 0.25, height: 2.8, type: "interior" };
                walls[ww] = { id: ww, start: [b.x, b.z], end: [b.x, b.z + b.depth], thickness: 0.25, height: 2.8, type: "interior" };
                walls[we] = { id: we, start: [b.x + b.width, b.z], end: [b.x + b.width, b.z + b.depth], thickness: 0.25, height: 2.8, type: "interior" };

                const did = `door_${sid}`;
                openings[did] = {
                    id: did,
                    type: "door",
                    wall_id: ws,
                    position: [b.x + b.width * 0.5, b.z + b.depth],
                    width: 1.2,
                    height: 2.2
                };
            }
        }

        if (!this.buildingData) this.buildingData = {};
        this.buildingData.walls = walls;
        this.buildingData.openings = openings;

        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x1f2e44,
            roughness: 0.35,
            metalness: 0.15,
            transparent: true,
            opacity: 0.88
        });

        // تدرجات لونية وخامات معمارية عالية التباين والجمالية للأبواب والفتحات والشبابيك
        // 1. خامة إطار الباب الخشبي الداكن / البرونز المعماري
        const doorFrameMaterial = new THREE.MeshStandardMaterial({
            color: 0xb45309, // خشب كهرماني دافئ / برونز
            emissive: 0x451a03,
            roughness: 0.35,
            metalness: 0.2
        });

        // 2. خامة مصراع الباب ثلاثي الأبعاد المفتوح بزاوية معمارية
        const doorLeafMaterial = new THREE.MeshStandardMaterial({
            color: 0xf59e0b, // خشب بلوط عسلي دافئ ساطع
            emissive: 0x78350f, // إشعاع دافئ خفيف لمنع الخفوت
            roughness: 0.25,
            metalness: 0.15
        });

        // 3. خامة عتبة الباب النحاسية الذهبية المضيئة
        const doorThresholdMaterial = new THREE.MeshStandardMaterial({
            color: 0xfbbf24,
            emissive: 0x92400e,
            roughness: 0.2,
            metalness: 0.7
        });

        // 4. خامة مقبض الباب الكرومي الفضي اللامع
        const doorHandleMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.1,
            metalness: 0.95
        });

        // 5. خامة إطار فتحة العبور / الممر المفتوح بلون زمردي نيون عالي التباين
        const passageArchitraveMaterial = new THREE.MeshStandardMaterial({
            color: 0x00e676, // أخضر زمردي نيون عالي الوضوح
            emissive: 0x004d40,
            roughness: 0.25,
            metalness: 0.3
        });

        // 6. خامة عتبة ممر العبور الزمردية المضيئة
        const passageThresholdMaterial = new THREE.MeshStandardMaterial({
            color: 0x00e676,
            emissive: 0x00796b,
            roughness: 0.2,
            metalness: 0.5
        });

        // 7. خامة إطار النافذة المعماري الألمنيوم وجلسة الشباك
        const windowFrameMaterial = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0, // ألمنيوم معماري نقي عالي التباين
            roughness: 0.25,
            metalness: 0.6
        });
        const windowSillMaterial = new THREE.MeshStandardMaterial({
            color: 0x94a3b8, // حجر/رخام جلسة شباك بارز
            roughness: 0.35,
            metalness: 0.1
        });
        const glassMaterial = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            roughness: 0.1,
            metalness: 0.3,
            transparent: true,
            opacity: 0.5
        });

        const totalWallCount = Object.keys(walls).length;
        const isHugeModel = (totalWallCount > 250);

        // تعطيل الظلال الثقيلة للموديلات المعمارية الضخمة لضمان تدوير وتحريك فائق السلاسة (60 FPS)
        if (isHugeModel && this.renderer) {
            this.renderer.shadowMap.enabled = false;
        }

        if (isHugeModel) {
            // معالجة فائقة السرعة للموديلات المعمارية الضخمة (14,000+ جدار):
            // دمج جدران كل طابق في مجسم BufferGeometry واحد لتقليص أوامر الرسم والـ Draw Calls بنسبة 99.9%
            const storeyWallBoxes = {};
            for (const [wId, wall] of Object.entries(walls)) {
                if (!wall.start || !wall.end) continue;
                const stId = wall.storey_id || 'st_g';
                if (!storeyWallBoxes[stId]) storeyWallBoxes[stId] = [];

                const x1 = wall.start[0], z1 = wall.start[1];
                const x2 = wall.end[0], z2 = wall.end[1];
                const dx = x2 - x1, dz = z2 - z1;
                const length = Math.hypot(dx, dz);
                if (length < 0.05) continue;

                const angle = Math.atan2(dz, dx);
                const wallH = wall.height || 2.8;
                const wallT = wall.thickness || 0.25;
                const baseY = wall.base_elevation || wall.elevation || 0;

                const midX = (x1 + x2) / 2;
                const midZ = (z1 + z2) / 2;
                const midY = baseY + wallH / 2;

                storeyWallBoxes[stId].push({
                    x: midX,
                    y: midY,
                    z: midZ,
                    rotY: -angle,
                    w: length,
                    h: wallH,
                    d: wallT,
                    wallId: wId
                });
            }

            for (const [stId, boxList] of Object.entries(storeyWallBoxes)) {
                if (boxList.length === 0) continue;
                for (const b of boxList) {
                    this.batchedWallBoxes[b.wallId] = b;
                }
                const mergedGeo = this._createMergedBoxesGeometry(boxList);
                const batchMesh = new THREE.Mesh(mergedGeo, wallMaterial);
                batchMesh.userData = {
                    type: 'wall_batch',
                    storeyId: stId,
                    wallIds: boxList.map(b => b.wallId),
                    boxList: boxList
                };
                batchMesh.visible = this.wallsVisible;
                const parent = (this.storeyGroups && this.storeyGroups[stId]) || this.buildingGroup;
                parent.add(batchMesh);
                this.wallMeshes[`batch_${stId}`] = batchMesh;
            }

            // تحديث التدفق الحركي والإنهاء الفوري بدون أي تأخير
            if (typeof this.setupCirculationParticles === 'function') {
                this.setupCirculationParticles(this.buildingData);
            }
            return;
        }

        for (const [wId, wall] of Object.entries(walls)) {
            const x1 = wall.start[0], z1 = wall.start[1];
            const x2 = wall.end[0], z2 = wall.end[1];
            const dx = x2 - x1, dz = z2 - z1;
            const length = Math.sqrt(dx * dx + dz * dz);
            if (length < 0.5) continue;

            const angle = Math.atan2(dz, dx);
            const wallH = wall.height || 2.8;
            const wallT = wall.thickness || 0.25;

            // استخراج الفتحات الواقعة على هذا الجدار
            const wallOpenings = [];
            for (const [opId, op] of Object.entries(openings || {})) {
                if (op.wall_id === wId) {
                    const opx = op.position[0], opz = op.position[1];
                    const proj = ((opx - x1) * dx + (opz - z1) * dz) / length;
                    if (proj >= 0 && proj <= length) {
                        wallOpenings.push({ ...op, offset: proj });
                    }
                }
            }
            const baseY = wall.base_elevation || wall.elevation || 0;
            const wallGroup = new THREE.Group();
            wallGroup.position.set(x1, baseY, z1);
            wallGroup.rotation.y = -angle;

            if (wallOpenings.length === 0) {
                // جدار صامت مصمت بدون فتحات
                const geo = new THREE.BoxGeometry(length, wallH, wallT);
                const mesh = new THREE.Mesh(geo, wallMaterial);
                mesh.position.set(length / 2, wallH / 2, 0);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                wallGroup.add(mesh);

                const edgeGeo = new THREE.EdgesGeometry(geo);
                const edgeLine = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({
                    color: 0x2e4a70,
                    transparent: true,
                    opacity: 0.6
                }));
                mesh.add(edgeLine);
            } else {
                // جدار مفرغ هندسياً بفتحات أبواب وشبابيك حقيقية
                let currentX = 0;
                for (const op of wallOpenings) {
                    const opW = op.width || 1.2;
                    const opStart = Math.max(currentX, op.offset - opW / 2);
                    const opEnd = Math.min(length, op.offset + opW / 2);

                    // جزء الجدار المصمت قبل الفتحة
                    if (opStart > currentX + 0.1) {
                        const segLen = opStart - currentX;
                        const segGeo = new THREE.BoxGeometry(segLen, wallH, wallT);
                        const segMesh = new THREE.Mesh(segGeo, wallMaterial);
                        segMesh.position.set(currentX + segLen / 2, wallH / 2, 0);
                        segMesh.castShadow = true;
                        wallGroup.add(segMesh);
                    }

                    if (op.type === "door") {
                        // 1. فتحة باب: عتبة الجدار العلوية (Wall Header / Lintel)
                        const doorH = op.height || 2.2;
                        const opData = { type: 'opening', openingId: op.id || opId, wallId: wId, openingType: 'door' };
                        if (wallH > doorH) {
                            const lintelH = wallH - doorH;
                            const lintelGeo = new THREE.BoxGeometry(opEnd - opStart, lintelH, wallT);
                            const lintelMesh = new THREE.Mesh(lintelGeo, wallMaterial);
                            lintelMesh.position.set((opStart + opEnd) / 2, doorH + lintelH / 2, 0);
                            lintelMesh.userData = opData;
                            wallGroup.add(lintelMesh);
                            this.trackOpeningMesh(op.id || opId, lintelMesh);

                            // حلية تاج إطار الباب العلوي (Door Frame Header Trim)
                            const headerTrimGeo = new THREE.BoxGeometry(opEnd - opStart + 0.14, 0.08, wallT * 1.22);
                            const headerTrimMesh = new THREE.Mesh(headerTrimGeo, doorFrameMaterial);
                            headerTrimMesh.position.set((opStart + opEnd) / 2, doorH - 0.04, 0);
                            headerTrimMesh.userData = opData;
                            wallGroup.add(headerTrimMesh);
                            this.trackOpeningMesh(op.id || opId, headerTrimMesh);
                        }

                        // 2. عتبة الباب النحاسية الذهبية المضيئة (Golden Brass Threshold)
                        const threshGeo = new THREE.BoxGeometry(opEnd - opStart, 0.045, wallT * 1.35);
                        const threshMesh = new THREE.Mesh(threshGeo, doorThresholdMaterial);
                        threshMesh.position.set((opStart + opEnd) / 2, 0.0225, 0);
                        threshMesh.userData = opData;
                        wallGroup.add(threshMesh);
                        this.trackOpeningMesh(op.id || opId, threshMesh);

                        // 3. قوائم إطار الباب الجانبية البارزة (Side Architrave Posts)
                        const postW = 0.08;
                        const postGeo = new THREE.BoxGeometry(postW, doorH, wallT * 1.22);
                        const leftPost = new THREE.Mesh(postGeo, doorFrameMaterial);
                        leftPost.position.set(opStart + postW / 2, doorH / 2, 0);
                        leftPost.userData = opData;
                        const rightPost = new THREE.Mesh(postGeo, doorFrameMaterial);
                        rightPost.position.set(opEnd - postW / 2, doorH / 2, 0);
                        rightPost.userData = opData;
                        wallGroup.add(leftPost);
                        wallGroup.add(rightPost);
                        this.trackOpeningMesh(op.id || opId, leftPost);
                        this.trackOpeningMesh(op.id || opId, rightPost);

                        // 4. مصراع الباب ثلاثي الأبعاد المفتوح بزاوية معمارية (3D Open Wood Door Leaf)
                        const leafW = Math.max(0.6, (opEnd - opStart) - 0.1);
                        const leafH = Math.max(1.8, doorH - 0.06);
                        const leafT = 0.045;
                        const hingeGroup = new THREE.Group();
                        hingeGroup.position.set(opStart + postW, 0, 0);
                        hingeGroup.rotation.y = -Math.PI * 0.35; // زاوية فتح ~63 درجة
                        hingeGroup.userData = opData;

                        const leafGeo = new THREE.BoxGeometry(leafW, leafH, leafT);
                        const leafMesh = new THREE.Mesh(leafGeo, doorLeafMaterial);
                        leafMesh.position.set(leafW / 2, leafH / 2 + 0.03, 0);
                        leafMesh.castShadow = true;
                        leafMesh.userData = opData;
                        hingeGroup.add(leafMesh);

                        // مقبض الباب الكرومي الفضي (Door Lever Handle)
                        const handlePlateGeo = new THREE.BoxGeometry(0.04, 0.18, leafT + 0.02);
                        const handlePlate = new THREE.Mesh(handlePlateGeo, doorHandleMaterial);
                        handlePlate.position.set(leafW - 0.09, 1.05, 0);
                        handlePlate.userData = opData;
                        hingeGroup.add(handlePlate);

                        const handleLeverGeo = new THREE.BoxGeometry(0.12, 0.025, 0.025);
                        const handleLever = new THREE.Mesh(handleLeverGeo, doorHandleMaterial);
                        handleLever.position.set(leafW - 0.13, 1.05, leafT / 2 + 0.03);
                        handleLever.userData = opData;
                        hingeGroup.add(handleLever);

                        wallGroup.add(hingeGroup);
                        this.trackOpeningMesh(op.id || opId, hingeGroup);

                        // 5. قوس فتحة الباب المعماري المتوهج على الأرضية (Luminous Amber Door Swing Arc)
                        const swingRadius = leafW;
                        const swingCurve = new THREE.EllipseCurve(0, 0, swingRadius, swingRadius, 0, Math.PI * 0.35, false);
                        const points = swingCurve.getPoints(16);
                        const swingGeo = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p.x, 0.03, p.y)));
                        const swingLine = new THREE.Line(swingGeo, new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.9 }));
                        swingLine.position.set(opStart + postW, 0, 0);
                        swingLine.userData = opData;
                        wallGroup.add(swingLine);
                        this.trackOpeningMesh(op.id || opId, swingLine);

                    } else if (op.type === "window") {
                        // فتحة شباك: جلسة سفلية وزجاج وإطار ألمنيوم وعتبة علوية
                        const sillH = op.sill_height || 0.9;
                        const winH = op.height || 1.4;
                        const topH = Math.min(wallH, sillH + winH);
                        const winData = { type: 'opening', openingId: op.id || opId, wallId: wId, openingType: 'window' };

                        // جلسة الجدار أسفل الشباك
                        if (sillH > 0.1) {
                            const sillGeo = new THREE.BoxGeometry(opEnd - opStart, sillH, wallT);
                            const sillMesh = new THREE.Mesh(sillGeo, wallMaterial);
                            sillMesh.position.set((opStart + opEnd) / 2, sillH / 2, 0);
                            sillMesh.userData = winData;
                            wallGroup.add(sillMesh);
                            this.trackOpeningMesh(op.id || opId, sillMesh);

                            // جلسة رخامية/حجرية معمارية بارزة للشباك
                            const sillTrimGeo = new THREE.BoxGeometry(opEnd - opStart + 0.12, 0.06, wallT * 1.35);
                            const sillTrimMesh = new THREE.Mesh(sillTrimGeo, windowSillMaterial);
                            sillTrimMesh.position.set((opStart + opEnd) / 2, sillH - 0.03, 0);
                            sillTrimMesh.userData = winData;
                            wallGroup.add(sillTrimMesh);
                            this.trackOpeningMesh(op.id || opId, sillTrimMesh);
                        }

                        // إطار الألمنيوم المحيط بالنافذة
                        const postW = 0.05;
                        const frameGeo = new THREE.BoxGeometry(postW, winH, wallT * 1.15);
                        const leftFrame = new THREE.Mesh(frameGeo, windowFrameMaterial);
                        leftFrame.position.set(opStart + postW / 2, sillH + winH / 2, 0);
                        leftFrame.userData = winData;
                        const rightFrame = new THREE.Mesh(frameGeo, windowFrameMaterial);
                        rightFrame.position.set(opEnd - postW / 2, sillH + winH / 2, 0);
                        rightFrame.userData = winData;
                        wallGroup.add(leftFrame);
                        wallGroup.add(rightFrame);
                        this.trackOpeningMesh(op.id || opId, leftFrame);
                        this.trackOpeningMesh(op.id || opId, rightFrame);

                        // اللوح الزجاجي الشفاف العاكس
                        const glassGeo = new THREE.BoxGeometry(opEnd - opStart - 0.08, winH - 0.04, wallT * 0.25);
                        const glassMesh = new THREE.Mesh(glassGeo, glassMaterial);
                        glassMesh.position.set((opStart + opEnd) / 2, sillH + winH / 2, 0);
                        glassMesh.userData = winData;
                        wallGroup.add(glassMesh);
                        this.trackOpeningMesh(op.id || opId, glassMesh);

                        // عتبة الجدار أعلى الشباك
                        if (wallH > topH) {
                            const lintelH = wallH - topH;
                            const lintelGeo = new THREE.BoxGeometry(opEnd - opStart, lintelH, wallT);
                            const lintelMesh = new THREE.Mesh(lintelGeo, wallMaterial);
                            lintelMesh.position.set((opStart + opEnd) / 2, topH + lintelH / 2, 0);
                            lintelMesh.userData = winData;
                            wallGroup.add(lintelMesh);
                            this.trackOpeningMesh(op.id || opId, lintelMesh);

                            // حلية علوية لإطار النافذة
                            const winTopGeo = new THREE.BoxGeometry(opEnd - opStart + 0.12, 0.05, wallT * 1.15);
                            const winTopMesh = new THREE.Mesh(winTopGeo, windowFrameMaterial);
                            winTopMesh.position.set((opStart + opEnd) / 2, topH - 0.025, 0);
                            winTopMesh.userData = winData;
                            wallGroup.add(winTopMesh);
                            this.trackOpeningMesh(op.id || opId, winTopMesh);
                        }
                    } else if (op.type === "passage" || op.type === "opening") {
                        // فتحة عبور / ممر مفتوح بدون مصراع بكتلة زمردية نيون فائقة الوضوح
                        const passH = op.height || 2.4;
                        const passData = { type: 'opening', openingId: op.id || opId, wallId: wId, openingType: 'passage' };
                        if (wallH > passH) {
                            const lintelH = wallH - passH;
                            const lintelGeo = new THREE.BoxGeometry(opEnd - opStart, lintelH, wallT);
                            const lintelMesh = new THREE.Mesh(lintelGeo, wallMaterial);
                            lintelMesh.position.set((opStart + opEnd) / 2, passH + lintelH / 2, 0);
                            lintelMesh.userData = passData;
                            wallGroup.add(lintelMesh);
                            this.trackOpeningMesh(op.id || opId, lintelMesh);

                            // حلية العضادة العلوية لبوابة الممر (Portal Top Architrave)
                            const passTopGeo = new THREE.BoxGeometry(opEnd - opStart + 0.16, 0.09, wallT * 1.28);
                            const passTopMesh = new THREE.Mesh(passTopGeo, passageArchitraveMaterial);
                            passTopMesh.position.set((opStart + opEnd) / 2, passH - 0.045, 0);
                            passTopMesh.userData = passData;
                            wallGroup.add(passTopMesh);
                            this.trackOpeningMesh(op.id || opId, passTopMesh);
                        }

                        // قوائم بوابة الممر الزمردية العريضة (Emerald Portal Posts)
                        const postW = 0.09;
                        const postGeo = new THREE.BoxGeometry(postW, passH, wallT * 1.28);
                        const leftPost = new THREE.Mesh(postGeo, passageArchitraveMaterial);
                        leftPost.position.set(opStart + postW / 2, passH / 2, 0);
                        leftPost.userData = passData;
                        const rightPost = new THREE.Mesh(postGeo, passageArchitraveMaterial);
                        rightPost.position.set(opEnd - postW / 2, passH / 2, 0);
                        rightPost.userData = passData;
                        wallGroup.add(leftPost);
                        wallGroup.add(rightPost);
                        this.trackOpeningMesh(op.id || opId, leftPost);
                        this.trackOpeningMesh(op.id || opId, rightPost);

                        // شريط الانتقال الأرضي المضيء لبوابة العبور (Luminous Emerald Passage Threshold)
                        const passThreshGeo = new THREE.BoxGeometry(opEnd - opStart, 0.035, wallT * 1.4);
                        const passThreshMesh = new THREE.Mesh(passThreshGeo, passageThresholdMaterial);
                        passThreshMesh.position.set((opStart + opEnd) / 2, 0.018, 0);
                        passThreshMesh.userData = passData;
                        wallGroup.add(passThreshMesh);
                        this.trackOpeningMesh(op.id || opId, passThreshMesh);
                    }

                    currentX = opEnd;
                }

                // الجزء المتبقي من الجدار بعد آخر فتحة
                if (length > currentX + 0.1) {
                    const segLen = length - currentX;
                    const segGeo = new THREE.BoxGeometry(segLen, wallH, wallT);
                    const segMesh = new THREE.Mesh(segGeo, wallMaterial);
                    segMesh.position.set(currentX + segLen / 2, wallH / 2, 0);
                    segMesh.castShadow = true;
                    wallGroup.add(segMesh);
                }
            }

            wallGroup.userData = { type: 'wall', wallId: wId, storeyId: wall.storey_id, baseY: baseY };
            wallGroup.traverse((child) => {
                if (child.isMesh && (!child.userData || !child.userData.openingId)) {
                    child.userData = { type: 'wall', wallId: wId, storeyId: wall.storey_id, baseY: baseY };
                }
            });

            wallGroup.visible = this.wallsVisible;
            const wallParent = (wall.storey_id && this.storeyGroups[wall.storey_id]) || this.buildingGroup;
            wallParent.add(wallGroup);
            this.wallMeshes[wId] = wallGroup;
        }

        // 4. توليد وصلات وأعمدة ربط التقاطعات والزوايا النظيفة (فقط للمخططات الصغيرة والمتوسطة لمنع التعليق)
        if (!isHugeModel) {
            const cornerMap = new Map();
            for (const [wId, wall] of Object.entries(walls)) {
                const s = wall.start, e = wall.end;
                const keyS = `${Math.round(s[0] * 5) / 5},${Math.round(s[1] * 5) / 5}`;
                const keyE = `${Math.round(e[0] * 5) / 5},${Math.round(e[1] * 5) / 5}`;
                cornerMap.set(keyS, (cornerMap.get(keyS) || 0) + 1);
                cornerMap.set(keyE, (cornerMap.get(keyE) || 0) + 1);
            }

            const renderedJoints = new Set();
            for (const [wId, wall] of Object.entries(walls)) {
                const wallH = wall.height || 2.8;
                const wallT = wall.thickness || 0.25;
                const baseY = wall.base_elevation || wall.elevation || 0;
                const s = wall.start, e = wall.end;

                // أ. وصلات الزوايا بين نهايات الجدران (Corner Miters)
                for (const pt of [s, e]) {
                    const key = `${Math.round(pt[0] * 5) / 5},${Math.round(pt[1] * 5) / 5}`;
                    if ((cornerMap.get(key) || 0) >= 2 && !renderedJoints.has(key)) {
                        renderedJoints.add(key);
                        const jointRadius = Math.max(0.13, wallT * 0.52);
                        const cornerGeo = new THREE.CylinderGeometry(jointRadius, jointRadius, wallH, 18);
                        const cornerMesh = new THREE.Mesh(cornerGeo, wallMaterial);
                        cornerMesh.position.set(pt[0], baseY + wallH / 2, pt[1]);
                        cornerMesh.castShadow = true;
                        cornerMesh.receiveShadow = true;
                        cornerMesh.userData = { type: 'wall_joint', wallId: wId, storeyId: wall.storey_id, baseY: baseY + wallH / 2 };

                        const cEdges = new THREE.EdgesGeometry(cornerGeo);
                        const cLine = new THREE.LineSegments(cEdges, new THREE.LineBasicMaterial({
                            color: 0x2e4a70,
                            transparent: true,
                            opacity: 0.6
                        }));
                        cornerMesh.add(cLine);
                        const jointParent = (wall.storey_id && this.storeyGroups[wall.storey_id]) || this.jointCapsGroup;
                        jointParent.add(cornerMesh);
                    }
                }

                // ب. وصلات التقاطعات المتعامدة والمتقاطعة (T-Junctions & Intersections)
                const ptsA = [wall.start, wall.end];
                for (const [idB, wB] of Object.entries(walls)) {
                    if (wId === idB) continue;
                    const x1 = wB.start[0], z1 = wB.start[1];
                    const x2 = wB.end[0], z2 = wB.end[1];
                    const dx = x2 - x1, dz = z2 - z1;
                    const lenSq = dx * dx + dz * dz;
                    if (lenSq < 0.2) continue;

                    for (const pt of ptsA) {
                        const u = ((pt[0] - x1) * dx + (pt[1] - z1) * dz) / lenSq;
                        if (u > 0.05 && u < 0.95) {
                            const projX = x1 + u * dx;
                            const projZ = z1 + u * dz;
                            const dist = Math.hypot(pt[0] - projX, pt[1] - projZ);
                            const key = `t_${Math.round(projX * 5) / 5},${Math.round(projZ * 5) / 5}`;

                            if (dist <= wallT * 0.85 && !renderedJoints.has(key)) {
                                renderedJoints.add(key);
                                const tRadius = Math.max(0.14, Math.max(wallT, wB.thickness || 0.25) * 0.52);
                                const tGeo = new THREE.CylinderGeometry(tRadius, tRadius, wallH, 18);
                                const tMesh = new THREE.Mesh(tGeo, wallMaterial);
                                tMesh.position.set(projX, baseY + wallH / 2, projZ);
                                tMesh.castShadow = true;
                                tMesh.receiveShadow = true;
                                tMesh.userData = { type: 'wall_joint', wallId: wId, storeyId: wall.storey_id, baseY: baseY + wallH / 2 };

                                const tEdges = new THREE.EdgesGeometry(tGeo);
                                const tLine = new THREE.LineSegments(tEdges, new THREE.LineBasicMaterial({
                                    color: 0x2e4a70,
                                    transparent: true,
                                    opacity: 0.6
                                }));
                                tMesh.add(tLine);
                                const jointParent = (wall.storey_id && this.storeyGroups[wall.storey_id]) || this.jointCapsGroup;
                                jointParent.add(tMesh);
                            }
                        }
                    }
                }
            }
        }

        // 5. مزامنة وتحديث شبكة وجسيمات التدفق الحركي المعماري فورياً لتعكس أي تغييرات في الجدران والفتحات
        if (typeof this.setupCirculationParticles === 'function') {
            this.setupCirculationParticles(this.buildingData);
        }
    }

    setStoreyFilter(storeyId) {
        this.activeStoreyFilter = storeyId;
        const hasStoreyGroups = Object.keys(this.storeyGroups).length > 0;
        
        if (storeyId === 'all') {
            if (hasStoreyGroups) {
                for (const grp of Object.values(this.storeyGroups)) {
                    grp.visible = true;
                }
            }
            this.buildingGroup.traverse(child => {
                if (child.userData && child.userData.storeyId) {
                    child.visible = true;
                }
            });
            for (const sp of Object.values(this.labelSprites)) {
                if (sp.sprite) sp.sprite.visible = this.labelsVisible !== false;
            }
            for (const sp of Object.values(this.stairBadges || {})) {
                sp.visible = this.labelsVisible !== false;
            }
        } else {
            if (hasStoreyGroups) {
                for (const [sId, grp] of Object.entries(this.storeyGroups)) {
                    grp.visible = (sId === storeyId);
                }
            }
            this.buildingGroup.traverse(child => {
                if (child.userData && child.userData.storeyId) {
                    child.visible = (child.userData.storeyId === storeyId);
                }
            });
            for (const [id, sp] of Object.entries(this.labelSprites)) {
                const space = sp.space;
                if (space && sp.sprite) {
                    const match = !space.storey_id || space.storey_id === storeyId;
                    sp.sprite.visible = (this.labelsVisible !== false) && match;
                }
            }
        }
    }

    setExplodedView(enabled) {
        this.isExplodedView = Boolean(enabled);
        const storeys = this.buildingData?.storeys || {};
        const sortedStoreys = Object.entries(storeys).sort((a, b) => (a[1].elevation || 0) - (b[1].elevation || 0));
        const explodeOffsetStep = 6.5;

        sortedStoreys.forEach(([sId, st], index) => {
            const extraY = this.isExplodedView ? index * explodeOffsetStep : 0.0;
            const grp = this.storeyGroups[sId];
            if (grp) {
                grp.position.y = extraY;
            }
        });

        // تحريك العناصر التابعة للطوابق إن وجدت خارج المجموعات
        this.buildingGroup.traverse(child => {
            if (child.userData && child.userData.storeyId && !child.parent?.userData?.isStoreyGroup) {
                const storeyIndex = sortedStoreys.findIndex(([id]) => id === child.userData.storeyId);
                if (storeyIndex !== -1) {
                    const extraY = this.isExplodedView ? storeyIndex * explodeOffsetStep : 0.0;
                    if (child.userData.baseY !== undefined) {
                        child.position.y = child.userData.baseY + extraY;
                    }
                }
            }
        });
    }

    highlightWall(wId, color = 0xff3838) {
        if (!this.wallHighlightMeshes) this.wallHighlightMeshes = {};

        // 1. إذا كان الجدار يملك مجسم Group مستقل (Standard Wall Mesh)
        const wallGroup = this.wallMeshes ? this.wallMeshes[wId] : null;
        if (wallGroup) {
            const isAmber = (color === 0xf59e0b || color === 0xf39c12 || color === 0xffd166);
            const emissiveColor = isAmber ? 0x553300 : 0x550000;
            wallGroup.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (!child._origMaterial) {
                        child._origMaterial = child.material;
                        child.material = child.material.clone();
                    }
                    if (child.material.color) {
                        child.material.color.setHex(color);
                    }
                    if (child.material.emissive) {
                        child.material.emissive.setHex(emissiveColor);
                    }
                }
            });
            return;
        }

        // 2. إذا كان الجدار مدمجاً في نموذج IFC ضخم (Batched IFC Wall)
        const wallData = this.buildingData?.walls?.[wId] || (this.batchedWallBoxes && this.batchedWallBoxes[wId]);
        if (wallData && this.buildingGroup) {
            this.clearWallHighlight(wId);

            let x, y, z, rotY, w, h, d;
            if (wallData.start && wallData.end) {
                const x1 = wallData.start[0], z1 = wallData.start[1];
                const x2 = wallData.end[0], z2 = wallData.end[1];
                const dx = x2 - x1, dz = z2 - z1;
                w = Math.max(0.2, Math.hypot(dx, dz));
                h = (wallData.height || 2.8) + 0.08;
                d = (wallData.thickness || 0.25) + 0.12;
                rotY = -Math.atan2(dz, dx);
                x = (x1 + x2) / 2;
                z = (z1 + z2) / 2;
                const baseY = wallData.base_elevation || wallData.elevation || 0;
                y = baseY + (wallData.height || 2.8) / 2;
            } else if (wallData.w !== undefined) {
                x = wallData.x; y = wallData.y; z = wallData.z;
                rotY = wallData.rotY;
                w = wallData.w + 0.05; h = wallData.h + 0.08; d = wallData.d + 0.12;
            } else {
                return;
            }

            const geo = new THREE.BoxGeometry(w, h, d);
            const mat = new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.75,
                transparent: true,
                opacity: 0.88,
                roughness: 0.2,
                metalness: 0.1,
                depthTest: true
            });
            const hlMesh = new THREE.Mesh(geo, mat);
            hlMesh.position.set(x, y, z);
            hlMesh.rotation.y = rotY;
            hlMesh.renderOrder = 999;
            this.buildingGroup.add(hlMesh);
            this.wallHighlightMeshes[wId] = hlMesh;
        }
    }

    clearWallHighlight(wId) {
        // 1. تنظيف المجسم المستقل
        const wallGroup = this.wallMeshes ? this.wallMeshes[wId] : null;
        if (wallGroup) {
            wallGroup.traverse((child) => {
                if (child.isMesh && child._origMaterial) {
                    if (child.material) child.material.dispose();
                    child.material = child._origMaterial;
                    delete child._origMaterial;
                }
            });
        }

        // 2. تنظيف مجسم التمييز المخصص لجدران IFC المدمجة
        if (this.wallHighlightMeshes && this.wallHighlightMeshes[wId]) {
            const mesh = this.wallHighlightMeshes[wId];
            if (this.buildingGroup) this.buildingGroup.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
            delete this.wallHighlightMeshes[wId];
        }
    }

    trackOpeningMesh(opId, mesh) {
        if (!this.openingMeshes) this.openingMeshes = {};
        if (!this.openingMeshes[opId]) this.openingMeshes[opId] = [];
        this.openingMeshes[opId].push(mesh);
    }

    highlightOpening(opId, color = 0xff3838) {
        const meshes = this.openingMeshes?.[opId];
        if (!meshes) return;
        for (const m of meshes) {
            if (!m) continue;
            m.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (!child._origMaterial) {
                        child._origMaterial = child.material;
                        child.material = child.material.clone();
                    }
                    if (child.material.color) child.material.color.setHex(color);
                    if (child.material.emissive) child.material.emissive.setHex(0x660000);
                }
            });
        }
    }

    clearOpeningHighlight(opId) {
        const meshes = this.openingMeshes?.[opId];
        if (!meshes) return;
        for (const m of meshes) {
            if (!m) continue;
            m.traverse((child) => {
                if (child.isMesh && child._origMaterial) {
                    if (child.material) child.material.dispose();
                    child.material = child._origMaterial;
                    delete child._origMaterial;
                }
            });
        }
    }

    deleteSpaceMesh(spaceId) {
        // 1. حذف وتفريغ بلاطة الأرضية الملونة للفضاء
        const floorMesh = this.roomMeshes[spaceId];
        if (floorMesh && this.buildingGroup) {
            this.buildingGroup.remove(floorMesh);
            floorMesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            });
            delete this.roomMeshes[spaceId];
        }

        // 2. حذف الإطار السلكي المحيط بالفضاء
        const wireLine = this.spaceWireframes?.[spaceId];
        if (wireLine && this.buildingGroup) {
            this.buildingGroup.remove(wireLine);
            if (wireLine.geometry) wireLine.geometry.dispose();
            if (wireLine.material) wireLine.material.dispose();
            delete this.spaceWireframes[spaceId];
        }

        // 3. حذف الشارة واللوحة النصية العائمة
        const badge = this.labelSprites[spaceId];
        if (badge && badge.sprite && this.buildingGroup) {
            this.buildingGroup.remove(badge.sprite);
            if (badge.sprite.material) {
                if (badge.sprite.material.map) badge.sprite.material.map.dispose();
                badge.sprite.material.dispose();
            }
            delete this.labelSprites[spaceId];
        }

        if (this.buildingData?.spaces?.[spaceId]) {
            delete this.buildingData.spaces[spaceId];
            this.setupCirculationParticles(this.buildingData);
        }
    }

    highlightSpace(spaceId, color = 0xff3838) {
        const floorMesh = this.roomMeshes[spaceId];
        if (!floorMesh || !floorMesh.material) return;
        if (floorMesh._origColor === undefined) {
            floorMesh._origColor = floorMesh.material.color.getHex();
            floorMesh.material.color.setHex(color);
        }
    }

    clearSpaceHighlight(spaceId) {
        const floorMesh = this.roomMeshes[spaceId];
        if (!floorMesh || !floorMesh.material) return;
        if (floorMesh._origColor !== undefined) {
            floorMesh.material.color.setHex(floorMesh._origColor);
            delete floorMesh._origColor;
        }
    }

    deleteStairMesh(stairId) {
        this.clearStairHighlight(stairId);
        const grp = this.stairMeshes?.[stairId];
        if (grp) {
            if (grp.parent) grp.parent.remove(grp);
            grp.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            });
            delete this.stairMeshes[stairId];
        }

        const badge = this.stairBadges?.[stairId];
        if (badge) {
            if (badge.parent) badge.parent.remove(badge);
            if (badge.material) {
                if (badge.material.map) badge.material.map.dispose();
                badge.material.dispose();
            }
            delete this.stairBadges[stairId];
        }

        if (this.buildingData?.stairs?.[stairId]) {
            delete this.buildingData.stairs[stairId];
            this.setupCirculationParticles(this.buildingData);
        }
    }

    highlightStair(stairId, color = 0xf59e0b) {
        const grp = this.stairMeshes?.[stairId];
        if (!grp) return;
        this.clearStairHighlight(stairId);

        // 1. صندوق تحديد مضيء وواضح ثلاثي الأبعاد
        const bBox = new THREE.Box3().setFromObject(grp);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        bBox.getSize(size);
        bBox.getCenter(center);

        const boxGeo = new THREE.BoxGeometry(Math.max(size.x + 0.3, 2.7), Math.max(size.y + 0.3, 3.2), Math.max(size.z + 0.3, 4.8));
        const boxMat = new THREE.MeshBasicMaterial({
            color: color,
            wireframe: true,
            transparent: true,
            opacity: 0.95,
            depthTest: false
        });
        const boxMesh = new THREE.Mesh(boxGeo, boxMat);
        boxMesh.position.copy(center);
        boxMesh.name = `stair_selection_box_${stairId}`;
        boxMesh.userData = { type: 'stair', stairId: stairId };
        const parent = grp.parent || this.buildingGroup;
        parent.add(boxMesh);
        grp.userData.selectionBox = boxMesh;

        // 2. إضاءة خامات أجزاء السلم باللون المحدد مع حفظ الخامات الأصلية
        grp.traverse((child) => {
            if (child.isMesh && child.material) {
                if (!child._origMaterial) {
                    child._origMaterial = child.material;
                    child.material = child.material.clone();
                }
                if (child.material.color) {
                    child.material.color.setHex(color);
                }
                if (child.material.emissive) {
                    child.material.emissive.setHex(0x553300);
                }
            }
        });
    }

    clearStairHighlight(stairId) {
        const grp = this.stairMeshes?.[stairId];
        if (grp?.userData?.selectionBox) {
            const sb = grp.userData.selectionBox;
            if (sb.parent) sb.parent.remove(sb);
            if (sb.geometry) sb.geometry.dispose();
            if (sb.material) sb.material.dispose();
            delete grp.userData.selectionBox;
        }
        // البحث عن أي صندوق تحديد في المشهد ومجموعات الطوابق
        const oldBox = this.buildingGroup?.getObjectByName(`stair_selection_box_${stairId}`);
        if (oldBox) {
            if (oldBox.parent) oldBox.parent.remove(oldBox);
            if (oldBox.geometry) oldBox.geometry.dispose();
            if (oldBox.material) oldBox.material.dispose();
        }
        if (this.storeyGroups) {
            for (const sg of Object.values(this.storeyGroups)) {
                const b = sg.getObjectByName(`stair_selection_box_${stairId}`);
                if (b) {
                    if (b.parent) b.parent.remove(b);
                    if (b.geometry) b.geometry.dispose();
                    if (b.material) b.material.dispose();
                }
            }
        }
        if (grp) {
            grp.traverse((child) => {
                if (child.isMesh && child._origMaterial) {
                    if (child.material) child.material.dispose();
                    child.material = child._origMaterial;
                    delete child._origMaterial;
                }
            });
        }
    }

    setWallsVisible(visible) {
        this.wallsVisible = visible;
        for (const wallGroup of Object.values(this.wallMeshes)) {
            if (wallGroup) wallGroup.visible = visible;
        }
        if (this.jointCapsGroup) {
            this.jointCapsGroup.visible = visible;
        }
    }

    toggleWallsVisibility() {
        this.setWallsVisible(!this.wallsVisible);
    }

    setBlueprintOpacity(val) {
        this.blueprintOpacity = val;
        if (this.blueprintMesh && this.blueprintMesh.material) {
            this.blueprintMesh.material.opacity = val;
            this.blueprintMesh.material.needsUpdate = true;
        }
    }

    setSpacesOpacity(val) {
        this.spacesOpacity = val;
        for (const mesh of Object.values(this.roomMeshes)) {
            if (mesh && mesh.material) {
                mesh.material.opacity = val;
                mesh.material.needsUpdate = true;
            }
        }
    }

    setBlueprintVisible(visible) {
        this.blueprintVisible = visible;
        if (this.blueprintMesh) {
            this.blueprintMesh.visible = visible;
        }
    }

    updateBlueprintCanvas(newCanvas) {
        if (this.blueprintMesh && this.blueprintMesh.material) {
            if (this.blueprintMesh.material.map) this.blueprintMesh.material.map.dispose();
            const newTexture = new THREE.CanvasTexture(newCanvas);
            newTexture.minFilter = THREE.LinearFilter;
            newTexture.magFilter = THREE.LinearFilter;
            newTexture.anisotropy = 16;
            this.blueprintMesh.material.map = newTexture;
            this.blueprintMesh.material.needsUpdate = true;
        }
    }

    getBlueprintTransform() {
        if (!this.blueprintMesh) return null;
        const geo = this.blueprintMesh.geometry;
        const w = geo?.parameters?.width || (this.buildingData?.blueprintBounds?.width) || 60;
        const d = geo?.parameters?.height || (this.buildingData?.blueprintBounds?.depth) || 45;
        const bBounds = this.buildingData?.blueprintBounds || {};
        return {
            width: w,
            depth: d,
            offsetX: this.blueprintMesh.position.x,
            offsetZ: this.blueprintMesh.position.z,
            aspect: w / (d || 1),
            scaleFactor: (typeof bBounds.scaleFactor === 'number') ? bBounds.scaleFactor : 1.0,
            baseWidth: (typeof bBounds.baseWidth === 'number') ? bBounds.baseWidth : w,
            baseDepth: (typeof bBounds.baseDepth === 'number') ? bBounds.baseDepth : d
        };
    }

    setBlueprintScaleAndOffset(width, depth, offsetX = 0, offsetZ = 0, scaleFactor = null) {
        if (!this.blueprintMesh) return;
        width = Math.max(0.5, parseFloat(width) || 60);
        depth = Math.max(0.5, parseFloat(depth) || 45);
        offsetX = parseFloat(offsetX) || 0;
        offsetZ = parseFloat(offsetZ) || 0;

        if (this.blueprintMesh.geometry) {
            this.blueprintMesh.geometry.dispose();
        }
        this.blueprintMesh.geometry = new THREE.PlaneGeometry(width, depth);
        this.blueprintMesh.position.set(offsetX, 0.02, offsetZ);

        if (this.buildingData) {
            if (!this.buildingData.blueprintBounds) {
                this.buildingData.blueprintBounds = {};
            }
            const b = this.buildingData.blueprintBounds;
            if (typeof b.baseWidth !== 'number' || b.baseWidth <= 0) {
                b.baseWidth = width / (scaleFactor || 1);
                b.baseDepth = depth / (scaleFactor || 1);
            }
            b.width = width;
            b.depth = depth;
            b.offsetX = offsetX;
            b.offsetZ = offsetZ;
            if (scaleFactor !== null) {
                b.scaleFactor = scaleFactor;
            }
        }
    }

    rescaleSceneElements(scaleFactor, anchorX = 0, anchorZ = 0) {
        if (!this.buildingData || !scaleFactor || scaleFactor === 1) return;

        // 1. تحجيم الجدران
        if (this.buildingData.walls) {
            for (const wall of Object.values(this.buildingData.walls)) {
                if (wall.start && wall.start.length >= 2) {
                    wall.start[0] = Math.round((anchorX + (wall.start[0] - anchorX) * scaleFactor) * 100) / 100;
                    wall.start[1] = Math.round((anchorZ + (wall.start[1] - anchorZ) * scaleFactor) * 100) / 100;
                }
                if (wall.end && wall.end.length >= 2) {
                    wall.end[0] = Math.round((anchorX + (wall.end[0] - anchorX) * scaleFactor) * 100) / 100;
                    wall.end[1] = Math.round((anchorZ + (wall.end[1] - anchorZ) * scaleFactor) * 100) / 100;
                }
            }
        }

        // 2. تحجيم فتحات الأبواب والشبابيك
        if (this.buildingData.openings) {
            for (const op of Object.values(this.buildingData.openings)) {
                if (typeof op.offset === 'number') {
                    op.offset = Math.round(op.offset * scaleFactor * 100) / 100;
                }
                if (op.position && op.position.length >= 2) {
                    op.position[0] = Math.round((anchorX + (op.position[0] - anchorX) * scaleFactor) * 100) / 100;
                    op.position[1] = Math.round((anchorZ + (op.position[1] - anchorZ) * scaleFactor) * 100) / 100;
                }
            }
        }

        // 3. تحجيم الفضاءات المعمارية
        if (this.buildingData.spaces) {
            for (const sp of Object.values(this.buildingData.spaces)) {
                if (sp.bounds) {
                    sp.bounds.x = Math.round((anchorX + (sp.bounds.x - anchorX) * scaleFactor) * 100) / 100;
                    sp.bounds.z = Math.round((anchorZ + (sp.bounds.z - anchorZ) * scaleFactor) * 100) / 100;
                    sp.bounds.width = Math.round((sp.bounds.width || 5) * scaleFactor * 100) / 100;
                    sp.bounds.depth = Math.round((sp.bounds.depth || 5) * scaleFactor * 100) / 100;
                }
                if (Array.isArray(sp.polygon)) {
                    sp.polygon = sp.polygon.map(pt => [
                        Math.round((anchorX + (pt[0] - anchorX) * scaleFactor) * 100) / 100,
                        Math.round((anchorZ + (pt[1] - anchorZ) * scaleFactor) * 100) / 100
                    ]);
                }
                if (Array.isArray(sp.polygonPoints)) {
                    sp.polygonPoints = sp.polygonPoints.map(pt => [
                        Math.round((anchorX + (pt[0] - anchorX) * scaleFactor) * 100) / 100,
                        Math.round((anchorZ + (pt[1] - anchorZ) * scaleFactor) * 100) / 100
                    ]);
                }
                if (sp.circleCenter && sp.circleCenter.length >= 2) {
                    sp.circleCenter[0] = Math.round((anchorX + (sp.circleCenter[0] - anchorX) * scaleFactor) * 100) / 100;
                    sp.circleCenter[1] = Math.round((anchorZ + (sp.circleCenter[1] - anchorZ) * scaleFactor) * 100) / 100;
                    if (typeof sp.circleRadius === 'number') {
                        sp.circleRadius = Math.round(sp.circleRadius * scaleFactor * 100) / 100;
                    }
                }
                if (typeof sp.area_m2 === 'number') {
                    sp.area_m2 = Math.round(sp.area_m2 * scaleFactor * scaleFactor * 10) / 10;
                }
            }
        }

        // 4. تحجيم السلالم المعمارية
        if (this.buildingData.stairs) {
            for (const st of Object.values(this.buildingData.stairs)) {
                if (st.position && st.position.length >= 2) {
                    st.position[0] = Math.round((anchorX + (st.position[0] - anchorX) * scaleFactor) * 100) / 100;
                    st.position[1] = Math.round((anchorZ + (st.position[1] - anchorZ) * scaleFactor) * 100) / 100;
                }
                if (st.landing_pos && st.landing_pos.length >= 2) {
                    st.landing_pos[0] = Math.round((anchorX + (st.landing_pos[0] - anchorX) * scaleFactor) * 100) / 100;
                    st.landing_pos[1] = Math.round((anchorZ + (st.landing_pos[1] - anchorZ) * scaleFactor) * 100) / 100;
                }
            }
        }

        // 5. تحجيم مواقع مستشعرات الـ IoT
        if (this.buildingData.iotSensors) {
            for (const s of Object.values(this.buildingData.iotSensors)) {
                if (typeof s.x === 'number') s.x = Math.round((anchorX + (s.x - anchorX) * scaleFactor) * 100) / 100;
                if (typeof s.z === 'number') s.z = Math.round((anchorZ + (s.z - anchorZ) * scaleFactor) * 100) / 100;
            }
        }

        // 6. إعادة بناء وتجسيم المشهد ثلاثي الأبعاد
        this.buildWallsAndOpenings(this.buildingData.walls, this.buildingData.openings, this.buildingData.spaces);
        if (this.buildingData.stairs) {
            this.buildStaircases(this.buildingData.stairs);
        }
        this.loadBuildingModel(this.buildingData);
    }

    // ==========================================
    // أداة عارض وتفكيك عناصر IFC (IFC Viewer Tool Engine)
    // ==========================================

    setupRaycasterSelection() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        let pointerDownPos = { x: 0, y: 0 };

        if (!this.renderer || !this.renderer.domElement) return;

        this.renderer.domElement.addEventListener('pointerdown', (e) => {
            pointerDownPos = { x: e.clientX, y: e.clientY };
        });

        this.renderer.domElement.addEventListener('pointerup', (e) => {
            const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
            if (dist > 6) return; // المستخدم يسحب الكاميرا (Orbit Drag)

            // عدم التدخل عند تفعيل أدوات التحديد والمعايرة المعمارية فوق المخطط (Tracer Mode)
            const tracerBar = document.getElementById('blueprint-tracer-bar');
            if (tracerBar && tracerBar.style.display !== 'none') return;

            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.buildingGroup.children, true);

            let selectedHit = null;
            for (const hit of intersects) {
                if (hit.object.isLine || hit.object.isSprite || hit.object === this.blueprintMesh) continue;
                if (hit.object === this.selectionHighlight) continue;

                // دعم المجسمات المجمعة للجدران الضخمة (wall_batch)
                if (hit.object.userData && hit.object.userData.type === 'wall_batch') {
                    const boxIdx = Math.floor(hit.faceIndex / 12);
                    const wallId = hit.object.userData.wallIds[boxIdx];
                    const boxData = hit.object.userData.boxList[boxIdx];
                    const uData = {
                        type: 'wall',
                        wallId: wallId,
                        storeyId: hit.object.userData.storeyId,
                        boxData: boxData
                    };
                    selectedHit = { mesh: hit.object, targetObj: hit.object, userData: uData, point: hit.point, boxData: boxData };
                    break;
                }

                let curr = hit.object;
                let uData = null;
                while (curr && curr !== this.buildingGroup) {
                    if (curr.userData && (curr.userData.type || curr.userData.wallId || curr.userData.slabId || curr.userData.columnId || curr.userData.beamId || curr.userData.stairId || curr.userData.openingId || curr.userData.spaceId || curr.userData.isBIMElement)) {
                        uData = curr.userData;
                        break;
                    }
                    curr = curr.parent;
                }

                if (uData) {
                    selectedHit = { mesh: hit.object, targetObj: curr, userData: uData, point: hit.point };
                    break;
                }
            }

            if (selectedHit) {
                this.selectElement(selectedHit);
            } else {
                this.clearSelection();
            }
        });
    }

    selectElement(hit) {
        this.clearSelection();
        const obj = hit.targetObj || hit.mesh;
        this.selectedElement = hit;

        if (hit.boxData) {
            const b = hit.boxData;
            const highlightGeo = new THREE.BoxGeometry(b.w + 0.1, b.h + 0.1, b.d + 0.1);
            const highlightMat = new THREE.MeshBasicMaterial({
                color: 0x38bdf8,
                wireframe: true,
                transparent: true,
                opacity: 0.95
            });
            this.selectionHighlight = new THREE.Mesh(highlightGeo, highlightMat);
            this.selectionHighlight.position.set(b.x, b.y, b.z);
            this.selectionHighlight.rotation.set(0, b.rotY, 0);
            this.scene.add(this.selectionHighlight);
        } else {
            try {
                const box = new THREE.Box3().setFromObject(obj);
                const boxSize = new THREE.Vector3();
                box.getSize(boxSize);
                const boxCenter = new THREE.Vector3();
                box.getCenter(boxCenter);

                const highlightGeo = new THREE.BoxGeometry(
                    Math.max(0.2, boxSize.x + 0.12),
                    Math.max(0.2, boxSize.y + 0.12),
                    Math.max(0.2, boxSize.z + 0.12)
                );
                const highlightMat = new THREE.MeshBasicMaterial({
                    color: 0x38bdf8,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.95
                });
                this.selectionHighlight = new THREE.Mesh(highlightGeo, highlightMat);
                this.selectionHighlight.position.copy(boxCenter);
                this.scene.add(this.selectionHighlight);
            } catch (e) {
                console.warn("Could not generate selection highlight box:", e);
            }
        }

        const details = this.getElementBimDetails(hit.userData, hit.targetObj || hit.mesh);
        if (typeof this.onElementSelected === 'function') {
            this.onElementSelected(details);
        }
    }

    clearSelection() {
        if (this.selectionHighlight) {
            this.scene.remove(this.selectionHighlight);
            if (this.selectionHighlight.geometry) this.selectionHighlight.geometry.dispose();
            if (this.selectionHighlight.material) this.selectionHighlight.material.dispose();
            this.selectionHighlight = null;
        }
        this.selectedElement = null;
        if (typeof this.onElementSelected === 'function') {
            this.onElementSelected(null);
        }
    }

    getElementBimDetails(uData, mesh) {
        const type = uData.type || 'unknown';
        const model = this.buildingData || {};
        const storeys = model.storeys || {};
        const storeyId = uData.storeyId || 'st_g';
        const storeyName = (storeys[storeyId] && (storeys[storeyId].name_ar || storeys[storeyId].name_en)) || storeyId;

        const info = {
            type: type,
            ifcType: uData.ifcType || 'IfcProduct',
            id: '',
            name_ar: '',
            name_en: '',
            storey_id: storeyId,
            storeyName: storeyName,
            dimensions: {},
            raw: uData
        };

        if (type === 'wall' || uData.wallId) {
            const wId = uData.wallId;
            const w = (model.walls && model.walls[wId]) || uData.wallData || {};
            info.id = wId;
            info.ifcType = w.ifc_type || 'IfcWallStandardCase';
            info.name_ar = w.name_ar || `جدار معماري (${wId})`;
            info.name_en = w.name_en || wId;
            const len = (w.start && w.end) ? Math.hypot(w.end[0] - w.start[0], w.end[1] - w.start[1]).toFixed(2) : 0;
            info.dimensions = {
                "الطول (Length)": `${len} م`,
                "السماكة (Thickness)": `${w.thickness || 0.25} م`,
                "الارتفاع (Height)": `${w.height || 2.8} م`,
                "المنسوب (Elevation)": `${w.base_elevation || 0} م`,
                "التصنيف (Type)": w.type === 'exterior' ? 'جدار خارجي' : 'جدار داخلي'
            };
        } else if (type === 'slab' || uData.slabId) {
            const sId = uData.slabId;
            const s = (model.slabs && model.slabs[sId]) || uData.slabData || {};
            info.id = sId;
            info.ifcType = s.type === 'roof' ? 'IfcRoof / IfcSlab' : (s.type === 'site' ? 'IfcSite / Terrain' : 'IfcSlab');
            info.name_ar = s.name_ar || `بلاطة (${sId})`;
            info.name_en = s.name_en || sId;
            const b = s.bounds || {};
            info.dimensions = {
                "العرض (Width)": `${b.width || 0} م`,
                "العمق (Depth)": `${b.depth || 0} م`,
                "المساحة التقديرية (Area)": `${((b.width || 0) * (b.depth || 0)).toFixed(1)} م²`,
                "السماكة (Thickness)": `${s.thickness || 0.25} م`,
                "المنسوب (Elevation)": `${s.base_elevation || 0} م`,
                "التصنيف (Type)": s.type === 'roof' ? 'بلاطة السطح' : (s.type === 'site' ? 'موقع عام / أرضية' : 'بلاطة طابق')
            };
        } else if (type === 'column' || uData.columnId) {
            const cId = uData.columnId;
            const c = (model.columns && model.columns[cId]) || uData.columnData || {};
            info.id = cId;
            info.ifcType = 'IfcColumn';
            info.name_ar = c.name_ar || `عمود إنشائي (${cId})`;
            info.name_en = c.name_en || cId;
            info.dimensions = {
                "المقطع (Profile)": `${c.width || 0.45} × ${c.depth || 0.45} م`,
                "الارتفاع (Height)": `${c.height || 3.5} م`,
                "المنسوب (Elevation)": `${c.base_elevation || 0} م`
            };
        } else if (type === 'beam' || uData.beamId) {
            const bId = uData.beamId;
            const b = (model.beams && model.beams[bId]) || uData.beamData || {};
            info.id = bId;
            info.ifcType = 'IfcBeam';
            info.name_ar = b.name_ar || `جسر إنشائي (${bId})`;
            info.name_en = b.name_en || bId;
            info.dimensions = {
                "العرض (Width)": `${b.width || 0.4} م`,
                "العمق / السقوط (Depth)": `${b.depth || b.height || 0.6} م`,
                "المنسوب (Elevation)": `${b.base_elevation || 3.0} م`
            };
        } else if (type === 'opening' || uData.openingId) {
            const opId = uData.openingId;
            const op = (model.openings && model.openings[opId]) || uData.openingData || {};
            const isDoor = op.type === 'door';
            info.id = opId;
            info.ifcType = isDoor ? 'IfcDoor' : 'IfcWindow';
            info.name_ar = isDoor ? `باب معماري (${op.name_ar || opId})` : `نافذة معمارية (${op.name_ar || opId})`;
            info.name_en = op.name_en || opId;
            info.dimensions = {
                "العرض (Width)": `${op.width || 1.2} م`,
                "الارتفاع (Height)": `${op.height || 2.1} م`,
                "جلسة الشباك (Sill)": `${op.sill_height || 0.9} م`,
                "الجدار الحاضن (Host Wall)": op.wall_id || '-'
            };
        } else if (type === 'stair' || uData.stairId) {
            const stId = uData.stairId;
            const st = (model.stairs && model.stairs[stId]) || uData.stairData || {};
            info.id = stId;
            info.ifcType = 'IfcStair';
            info.name_ar = st.name_ar || `درج إنشائي (${stId})`;
            info.name_en = st.name_en || stId;
            info.dimensions = {
                "عدد الدرجات (Risers)": `${st.steps_count || 18} درجة`,
                "عرض الدرج (Width)": `${st.width || 1.8} م`,
                "ارتفاع الطابق (Height)": `${st.height || 3.5} م`
            };
        } else if (type === 'space' || uData.spaceId) {
            const spId = uData.spaceId;
            const sp = (model.spaces && model.spaces[spId]) || uData.spaceData || {};
            info.id = spId;
            info.ifcType = 'IfcSpace';
            info.name_ar = sp.name_ar || `فضاء (${spId})`;
            info.name_en = sp.name_en || spId;
            info.dimensions = {
                "المساحة (Area)": `${sp.area_m2 || 0} م²`,
                "السعة الاستيعابية (Capacity)": `${sp.capacity || 0} شخص`,
                "النوع الوظيفي (Function)": sp.type || 'workspace',
                "المنسوب (Base Elev)": `${sp.base_elevation || 0} م`
            };
        } else if (uData.isBIMElement) {
            info.id = `#${uData.expressID}`;
            info.ifcType = uData.ifcType || 'IfcBuildingElement';
            info.name_ar = uData.name || uData.ifcType;
            info.name_en = uData.name || uData.ifcType;
            info.category = uData.category;
            
            const obj = hit.targetObj || hit.mesh;
            let dims = {
                "معرّف العنصر (ExpressID)": `#${uData.expressID}`,
                "نوع الـ BIM (Type)": uData.ifcType,
                "الفئة المعمارية (Category)": uData.category,
                "الطابق التابع له (Storey)": uData.storeyId || '-'
            };
            if (obj) {
                const b = new THREE.Box3().setFromObject(obj);
                const size = new THREE.Vector3();
                b.getSize(size);
                dims["العرض (X)"] = `${size.x.toFixed(2)} م`;
                dims["الارتفاع (Y)"] = `${size.y.toFixed(2)} م`;
                dims["العمق (Z)"] = `${size.z.toFixed(2)} م`;
                dims["المنسوب (Elevation)"] = `${b.min.y.toFixed(2)} م`;
            }
            info.dimensions = dims;
        }

        return info;
    }

    setIfcCategoryVisible(category, isVisible) {
        if (this.ifcCategoryVisibility) {
            this.ifcCategoryVisibility[category] = isVisible;
        }

        if (this.ifcCategoryMeshes && this.ifcCategoryMeshes[category]) {
            for (const mesh of this.ifcCategoryMeshes[category]) {
                if (mesh) mesh.visible = isVisible;
            }
        }

        if (category === 'walls') {
            for (const group of Object.values(this.wallMeshes || {})) {
                if (group) group.visible = isVisible;
            }
            if (this.jointCapsGroup) this.jointCapsGroup.visible = isVisible;
        } else if (category === 'slabs_floor') {
            for (const [id, mesh] of Object.entries(this.slabMeshes || {})) {
                const sData = (this.buildingData && this.buildingData.slabs && this.buildingData.slabs[id]) || (mesh.userData && mesh.userData.slabData) || {};
                if (sData.type !== 'roof' && sData.type !== 'site' && !sData.is_site) {
                    if (mesh) mesh.visible = isVisible;
                }
            }
        } else if (category === 'slabs_roof') {
            for (const [id, mesh] of Object.entries(this.slabMeshes || {})) {
                const sData = (this.buildingData && this.buildingData.slabs && this.buildingData.slabs[id]) || (mesh.userData && mesh.userData.slabData) || {};
                if (sData.type === 'roof') {
                    if (mesh) mesh.visible = isVisible;
                }
            }
        } else if (category === 'slabs_site') {
            for (const [id, mesh] of Object.entries(this.slabMeshes || {})) {
                const sData = (this.buildingData && this.buildingData.slabs && this.buildingData.slabs[id]) || (mesh.userData && mesh.userData.slabData) || {};
                if (sData.type === 'site' || sData.is_site) {
                    if (mesh) mesh.visible = isVisible;
                }
            }
        } else if (category === 'columns') {
            for (const mesh of Object.values(this.columnMeshes || {})) {
                if (mesh) mesh.visible = isVisible;
            }
        } else if (category === 'beams') {
            for (const mesh of Object.values(this.beamMeshes || {})) {
                if (mesh) mesh.visible = isVisible;
            }
        } else if (category === 'doors') {
            for (const [id, grp] of Object.entries(this.openingMeshes || {})) {
                const op = (this.buildingData && this.buildingData.openings && this.buildingData.openings[id]) || {};
                if (op.type === 'door' || !op.type) {
                    if (grp) grp.visible = isVisible;
                }
            }
        } else if (category === 'windows') {
            for (const [id, grp] of Object.entries(this.openingMeshes || {})) {
                const op = (this.buildingData && this.buildingData.openings && this.buildingData.openings[id]) || {};
                if (op.type === 'window') {
                    if (grp) grp.visible = isVisible;
                }
            }
        } else if (category === 'stairs') {
            for (const grp of Object.values(this.stairMeshes || {})) {
                if (grp) grp.visible = isVisible;
            }
        } else if (category === 'spaces') {
            for (const mesh of Object.values(this.roomMeshes || {})) {
                if (mesh) mesh.visible = isVisible;
            }
        }
    }

    cleanGhostElements() {
        let ghostSlabsCount = 0;
        let fallbackSpacesCount = 0;

        for (const [id, mesh] of Object.entries(this.slabMeshes || {})) {
            const s = (this.buildingData && this.buildingData.slabs && this.buildingData.slabs[id]) || (mesh.userData && mesh.userData.slabData) || {};
            const b = s.bounds || {};
            const area = (b.width || 0) * (b.depth || 0);
            if (s.type === 'site' || s.is_site || area > 2500) {
                mesh.visible = false;
                ghostSlabsCount++;
            }
        }

        for (const [id, mesh] of Object.entries(this.roomMeshes || {})) {
            const sp = (this.buildingData && this.buildingData.spaces && this.buildingData.spaces[id]) || (mesh.userData && mesh.userData.spaceData) || {};
            if (sp.is_fallback || (this.buildingData && this.buildingData.building_type === 'imported_bim')) {
                mesh.visible = false;
                fallbackSpacesCount++;
            }
        }

        return {
            ghostSlabs: ghostSlabsCount,
            fallbackSpaces: fallbackSpacesCount
        };
    }

    getIfcStats() {
        const model = this.buildingData || {};
        if (model.is_wasm_ifc && model.stats) {
            const s = model.stats;
            return {
                walls: s.walls || 0,
                slabs_floor: s.slabs_floor || 0,
                slabs_roof: s.slabs_roof || 0,
                slabs_site: s.slabs_site || 0,
                columns: s.columns || 0,
                beams: s.beams || 0,
                doors: s.doors || 0,
                windows: s.windows || 0,
                stairs: s.stairs || 0,
                spaces: s.spaces || Object.keys(model.spaces || {}).length
            };
        }

        let wallCount = Object.keys(this.wallMeshes || {}).length || Object.keys(model.walls || {}).length;
        let floorSlabCount = 0;
        let roofSlabCount = 0;
        let siteSlabCount = 0;
        for (const s of Object.values(model.slabs || {})) {
            if (s.type === 'roof') roofSlabCount++;
            else if (s.type === 'site' || s.is_site) siteSlabCount++;
            else floorSlabCount++;
        }
        let colCount = Object.keys(this.columnMeshes || {}).length || Object.keys(model.columns || {}).length;
        let beamCount = Object.keys(this.beamMeshes || {}).length || Object.keys(model.beams || {}).length;
        let doorCount = 0;
        let windowCount = 0;
        for (const op of Object.values(model.openings || {})) {
            if (op.type === 'window') windowCount++;
            else doorCount++;
        }
        let stairCount = Object.keys(this.stairMeshes || {}).length || Object.keys(model.stairs || {}).length;
        let spaceCount = Object.keys(model.spaces || {}).length;

        return {
            walls: wallCount,
            slabs_floor: floorSlabCount,
            slabs_roof: roofSlabCount,
            slabs_site: siteSlabCount,
            columns: colCount,
            beams: beamCount,
            doors: doorCount,
            windows: windowCount,
            stairs: stairCount,
            spaces: spaceCount
        };
    }

    isolateElement(type, id) {
        if (this.bimMeshes && this.bimMeshes.length > 0) {
            for (const mesh of this.bimMeshes) {
                const mId = mesh.userData?.expressID;
                const match = (id === `#${mId}` || id == mId);
                mesh.visible = match;
            }
        }
        for (const [wId, mesh] of Object.entries(this.wallMeshes || {})) {
            mesh.visible = (type === 'wall' && wId === id);
        }
        for (const [sId, mesh] of Object.entries(this.slabMeshes || {})) {
            mesh.visible = (type === 'slab' && sId === id);
        }
        for (const [cId, mesh] of Object.entries(this.columnMeshes || {})) {
            mesh.visible = (type === 'column' && cId === id);
        }
        for (const [bId, mesh] of Object.entries(this.beamMeshes || {})) {
            mesh.visible = (type === 'beam' && bId === id);
        }
        for (const [stId, mesh] of Object.entries(this.stairMeshes || {})) {
            mesh.visible = (type === 'stair' && stId === id);
        }
        for (const [opId, mesh] of Object.entries(this.openingMeshes || {})) {
            mesh.visible = (type === 'opening' && opId === id);
        }
    }

    setElementVisible(type, id, isVisible) {
        if (this.bimMeshes && this.bimMeshes.length > 0) {
            for (const mesh of this.bimMeshes) {
                const mId = mesh.userData?.expressID;
                if (id === `#${mId}` || id == mId) {
                    mesh.visible = isVisible;
                }
            }
        }
        if (type === 'wall' && this.wallMeshes[id]) this.wallMeshes[id].visible = isVisible;
        if (type === 'slab' && this.slabMeshes[id]) this.slabMeshes[id].visible = isVisible;
        if (type === 'column' && this.columnMeshes[id]) this.columnMeshes[id].visible = isVisible;
        if (type === 'beam' && this.beamMeshes[id]) this.beamMeshes[id].visible = isVisible;
        if (type === 'stair' && this.stairMeshes[id]) this.stairMeshes[id].visible = isVisible;
        if (type === 'opening' && this.openingMeshes[id]) this.openingMeshes[id].visible = isVisible;
        if (type === 'space' && this.roomMeshes[id]) this.roomMeshes[id].visible = isVisible;
    }

    resetAllElementVisibility() {
        this.setIfcCategoryVisible('walls', true);
        this.setIfcCategoryVisible('slabs_floor', true);
        this.setIfcCategoryVisible('slabs_roof', true);
        this.setIfcCategoryVisible('slabs_site', false);
        this.setIfcCategoryVisible('columns', true);
        this.setIfcCategoryVisible('beams', true);
        this.setIfcCategoryVisible('doors', true);
        this.setIfcCategoryVisible('windows', true);
        this.setIfcCategoryVisible('stairs', true);
        const isBim = (this.buildingData && this.buildingData.building_type === 'imported_bim');
        this.setIfcCategoryVisible('spaces', !isBim);
        this.clearSelection();
    }

    focusOnElement(mesh) {
        if (!mesh) return;
        try {
            const box = new THREE.Box3().setFromObject(mesh);
            const center = new THREE.Vector3();
            box.getCenter(center);
            if (this.controls) {
                this.controls.target.copy(center);
                this.controls.update();
            }
        } catch (e) {
            console.warn("Could not focus on element:", e);
        }
    }

    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
}

// تصدير الكائن عالمياً لضمان التوافقية الكاملة ومنع أي أخطاء مراجع
window.Twin3DViewer = Twin3DViewer;
window.Viewer3D = Twin3DViewer;
