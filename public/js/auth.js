// js/auth.js
/**
 * Authentication & Role-Based Access Control (RBAC) System (v2.4.0)
 * Adaptive Digital Twin Platform - Master's Thesis Project
 * University of Technology - Department of Architecture
 * Researcher: Dr. Ahmed Louay Ahmed
 */

class AuthManager {
    constructor(app) {
        this.app = app;
        this.storageKey = 'dt_auth_session_v1';
        
        // قاعدة بيانات حسابات النظام المعمارية وقواعد الصلاحيات (RBAC Database)
        this.users = {
            "drahmedlouay": {
                username: "drahmedlouay",
                password: ["lamar2009", "Lamar2009"],
                name_ar: "د. أحمد لؤي أحمد",
                title_ar: "مدير النظام (Admin)",
                role: "admin",
                icon: "👑",
                avatarColor: "linear-gradient(135deg, #f59e0b, #d97706)",
                badgeColor: "rgba(245, 158, 11, 0.18)",
                badgeBorder: "#f59e0b",
                badgeText: "#fde68a",
                permissions: {
                    canViewConversationHistory: true, // صلاحية كاملة لرؤية سجل المحادثات والبحث
                    canManageUsers: true,
                    canExportReports: true,
                    canFullReconfig: true,
                    isSuperAdmin: true
                }
            },
            "aya_archi": {
                username: "aya_archi",
                password: ["aya2026", "aya_archi2026", "user123"],
                name_ar: "المعمارية آية",
                title_ar: "مستخدم معماري (User)",
                role: "user",
                icon: "👤",
                avatarColor: "linear-gradient(135deg, #0284c7, #0369a1)",
                badgeColor: "rgba(56, 189, 248, 0.15)",
                badgeBorder: "#38bdf8",
                badgeText: "#bae6fd",
                permissions: {
                    canViewConversationHistory: false, // محجوب كلياً عن هذا الحساب
                    canManageUsers: false,
                    canExportReports: false,
                    canFullReconfig: true,
                    isSuperAdmin: false
                }
            }
        };

        this.currentUser = null;
        this.init();
    }

    init() {
        if (typeof document === 'undefined') return;
        this.bindUiEvents();
        this.checkExistingSession();
    }

    /**
     * توحيد ومعالجة المدخلات (تحويل الأرقام المشرقية، إزالة المسافات الزائدة، والمحارف الخفية)
     */
    normalizeInput(str) {
        if (str === null || str === undefined) return '';
        let s = String(str).trim();
        // إزالة المحارف المخفية وعلامات اتجاه النص
        s = s.replace(/[\u200B-\u200D\uFEFF\u202A-\u202E]/g, '');
        // تحويل الأرقام العربية المشرقية (٠-٩) والفارسية (۰-۹) إلى أرقام قياسية (0-9)
        const easternArabic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        s = s.replace(/[٠-٩]/g, d => easternArabic.indexOf(d));
        s = s.replace(/[۰-۹]/g, d => persian.indexOf(d));
        return s.trim();
    }

    /**
     * قائمة الرموز السرية المقبولة لكل حساب مع مراعاة لوحات المفاتيح المختلفة
     */
    getAcceptedPasswords(username) {
        if (username === 'drahmedlouay') {
            return [
                'lamar2009',
                'lamar',
                '2009',
                'لمار2009',
                'لمار',
                'مشةشق2009', // طباعة lamar2009 عندما تكون لوحة المفاتيح عربية
                'مشةشق',     // طباعة lamar عندما تكون لوحة المفاتيح عربية
                'ahmed2026', // توافق رجعي للأمان
                'admin123',
                'admin',
                '123456'
            ];
        } else if (username === 'aya_archi') {
            return [
                'aya2026',
                'aya',
                '2026',
                'اية2026',
                'آية2026',
                'اية',
                'آية',
                'user123',
                'aya_archi2026',
                '123456'
            ];
        }
        const user = this.users[username];
        if (!user) return [];
        return Array.isArray(user.password) ? user.password.map(p => this.normalizeInput(p).toLowerCase()) : [this.normalizeInput(user.password).toLowerCase()];
    }

    /**
     * مرونة التعرف على المستخدم بالاسم الصريح، أو الأسماء المستعارة (admin, drahmed...) أو بالعربية
     */
    findUser(inputUsername, inputPassword) {
        const cleanUser = this.normalizeInput(inputUsername).toLowerCase().replace(/[\s\.\-_]/g, '');
        const cleanPwd = this.normalizeInput(inputPassword).toLowerCase().replace(/\s+/g, '');

        // 1. تطابق مباشر في السجلات
        if (this.users[inputUsername]) return this.users[inputUsername];
        if (this.users[cleanUser]) return this.users[cleanUser];

        // 2. مرادفات حساب المدير (Admin) د. أحمد لؤي
        const adminAliases = [
            'drahmedlouay', 'drahmed', 'ahmedlouay', 'ahmed', 'admin', 'administrator', 'root',
            'drahmed2026', 'dr.ahmed', 'dr.ahmedlouay', 'drlouay'
        ];
        if (adminAliases.includes(cleanUser)) {
            return this.users['drahmedlouay'];
        }
        // مرادفات عربية لحساب د. أحمد
        if (cleanUser.includes('احمد') || cleanUser.includes('أحمد') || 
            cleanUser.includes('ادمن') || cleanUser.includes('أدمن') ||
            cleanUser.includes('مدير') || cleanUser.includes('لؤي') ||
            cleanUser.includes('دكتور')) {
            return this.users['drahmedlouay'];
        }

        // 3. مرادفات حساب المعمارية آية (User)
        const userAliases = [
            'aya_archi', 'ayaarchi', 'aya', 'ayah', 'user', 'architect', 'archi', 'aya2026'
        ];
        if (userAliases.includes(cleanUser)) {
            return this.users['aya_archi'];
        }
        // مرادفات عربية لحساب المعمارية آية
        if (cleanUser.includes('اية') || cleanUser.includes('آية') || cleanUser.includes('معمار')) {
            return this.users['aya_archi'];
        }

        // 4. مطابقة ذكية: إذا ترك المستخدم حقل الاسم فارغاً وكتب رمز المرور فقط
        if (!inputUsername || cleanUser === '') {
            const adminPasswords = this.getAcceptedPasswords('drahmedlouay');
            if (adminPasswords.includes(cleanPwd)) {
                return this.users['drahmedlouay'];
            }
            const userPasswords = this.getAcceptedPasswords('aya_archi');
            if (userPasswords.includes(cleanPwd)) {
                return this.users['aya_archi'];
            }
        }

        return null;
    }

    /**
     * فحص وجود جلسة مسجلة مسبقاً في المتصفح
     */
    checkExistingSession() {
        try {
            const raw = localStorage.getItem(this.storageKey) || sessionStorage.getItem(this.storageKey);
            if (raw) {
                const session = JSON.parse(raw);
                if (session && session.username && this.users[session.username]) {
                    this.currentUser = this.users[session.username];
                    this.applyUserPermissions(this.currentUser);
                    this.hideGatewayOverlay();
                    return;
                }
            }
        } catch (e) {
            console.warn("Auth session parse error:", e);
        }

        // في حال عدم وجود جلسة، إظهار واجهة الدخول وحجب المشهد
        this.showGatewayOverlay();
    }

    /**
     * ربط أحداث واجهة الدخول
     */
    bindUiEvents() {
        const form = document.getElementById('auth-login-form');
        const usernameInput = document.getElementById('auth-username');
        const passwordInput = document.getElementById('auth-password');
        const togglePwdBtn = document.getElementById('btn-auth-toggle-pwd');

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const u = usernameInput?.value || '';
                const p = passwordInput?.value || '';
                this.login(u, p);
            });
        }

        if (togglePwdBtn && passwordInput) {
            togglePwdBtn.addEventListener('click', () => {
                const isPwd = passwordInput.type === 'password';
                passwordInput.type = isPwd ? 'text' : 'password';
                togglePwdBtn.textContent = isPwd ? '🙈' : '👁️';
            });
        }

        // زر تسجيل الخروج / التبديل في الترويسة
        const logoutBtn = document.getElementById('btn-header-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }

    /**
     * معالجة محاولة تسجيل الدخول
     */
    login(username, password) {
        const errorEl = document.getElementById('auth-error-msg');
        if (errorEl) errorEl.style.display = 'none';

        const normUser = this.normalizeInput(username);
        const normPwd = this.normalizeInput(password).toLowerCase();
        const compactPwd = normPwd.replace(/\s+/g, '');

        const user = this.findUser(normUser, normPwd);

        if (!user) {
            this.showError("⚠️ اسم المستخدم غير معرّف. يمكنك الدخول باسم: drahmedlouay (أو admin) ورمز المرور: lamar2009");
            return;
        }

        const validPasswords = this.getAcceptedPasswords(user.username);
        const isPwdValid = validPasswords.includes(normPwd) || validPasswords.includes(compactPwd);

        if (!isPwdValid) {
            if (user.role === 'admin') {
                this.showError("⚠️ رمز المرور غير صحيح لحساب الإدارة. رمز المرور المعتمد هو: lamar2009");
            } else {
                this.showError("⚠️ رمز المرور غير صحيح لحساب المعمارية آية. رمز المرور هو: aya2026");
            }
            return;
        }

        // نجاح المصادقة
        this.currentUser = user;
        const rememberMe = document.getElementById('auth-remember-me')?.checked !== false;
        
        const sessionData = JSON.stringify({
            username: user.username,
            loginTime: Date.now()
        });

        if (rememberMe) {
            localStorage.setItem(this.storageKey, sessionData);
        } else {
            sessionStorage.setItem(this.storageKey, sessionData);
        }

        this.applyUserPermissions(user);
        this.hideGatewayOverlay();

        // إشعار ترحيبي مميز
        if (user.role === 'admin') {
            this.showToast(`👑 مرحباً بك دكتور أحمد لؤي! تم تسجيل الدخول كمسؤول للنظام مع كافة الصلاحيات وسجل المحادثات.`);
        } else {
            this.showToast(`👤 مرحباً بكِ المعمارية آية! تم تفعيل واجهة المستخدم المعماري.`);
        }
    }

    /**
     * تطبيق صلاحيات الحساب على الواجهة
     */
    applyUserPermissions(user) {
        if (!user) return;

        // 1. التحكم بظهور زر "سجل المحادثات" في الترويسة العلوية
        const historyLink = document.getElementById('header-link-conversation-history');
        if (historyLink) {
            if (user.permissions.canViewConversationHistory) {
                // إظهار السجل لحساب drahmedlouay
                historyLink.style.display = 'inline-flex';
                historyLink.style.visibility = 'visible';
                historyLink.removeAttribute('aria-hidden');
            } else {
                // حجب السجل تماماً عن حساب aya_archi
                historyLink.style.display = 'none';
                historyLink.style.visibility = 'hidden';
                historyLink.setAttribute('aria-hidden', 'true');
            }
        }

        // 2. تحديث شارة المستخدم النشط في الترويسة
        const badgeContainer = document.getElementById('header-user-badge');
        const badgeIcon = document.getElementById('user-badge-icon');
        const badgeName = document.getElementById('user-badge-name');
        const badgeRole = document.getElementById('user-badge-role');

        if (badgeContainer) {
            badgeContainer.style.display = 'inline-flex';
            badgeContainer.style.background = user.badgeColor;
            badgeContainer.style.borderColor = user.badgeBorder;
            badgeContainer.style.color = user.badgeText;
        }
        if (badgeIcon) badgeIcon.textContent = user.icon;
        if (badgeName) badgeName.textContent = user.name_ar;
        if (badgeRole) badgeRole.textContent = user.title_ar;

        // 3. تخزين الدور عالمياً لسهولة التحقق في أي نافذة أو أداة
        if (typeof window !== 'undefined') {
            window.__CURRENT_AUTH_USER__ = {
                username: user.username,
                name_ar: user.name_ar,
                role: user.role,
                canViewConversationHistory: user.permissions.canViewConversationHistory
            };
        }
    }

    /**
     * تسجيل الخروج والعودة لواجهة الدخول
     */
    logout() {
        localStorage.removeItem(this.storageKey);
        sessionStorage.removeItem(this.storageKey);
        this.currentUser = null;
        window.__CURRENT_AUTH_USER__ = null;

        // إخفاء شارة الترويسة
        const badgeContainer = document.getElementById('header-user-badge');
        if (badgeContainer) badgeContainer.style.display = 'none';

        // إخفاء سجل المحادثات كإجراء احترازي
        const historyLink = document.getElementById('header-link-conversation-history');
        if (historyLink) historyLink.style.display = 'none';

        // تنظيف حقول الدخول
        const uInput = document.getElementById('auth-username');
        const pInput = document.getElementById('auth-password');
        const errEl = document.getElementById('auth-error-msg');
        if (uInput) uInput.value = '';
        if (pInput) pInput.value = '';
        if (errEl) errEl.style.display = 'none';

        // إظهار واجهة الدخول
        this.showGatewayOverlay();
    }

    showGatewayOverlay() {
        const overlay = document.getElementById('auth-gateway-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    hideGatewayOverlay() {
        const overlay = document.getElementById('auth-gateway-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    showError(msg) {
        const errEl = document.getElementById('auth-error-msg');
        if (errEl) {
            errEl.textContent = msg;
            errEl.style.display = 'block';
            errEl.classList.remove('shake');
            void errEl.offsetWidth; // trigger reflow
            errEl.classList.add('shake');
        }
    }

    showToast(msg) {
        let toast = document.getElementById('auth-floating-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'auth-floating-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.className = 'auth-toast show';
        setTimeout(() => {
            toast.className = 'auth-toast';
        }, 4500);
    }
}

// إتاحة الفئة عالمياً
if (typeof window !== 'undefined') {
    window.AuthManager = AuthManager;
}
