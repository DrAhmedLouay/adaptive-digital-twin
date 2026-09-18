// js/auth.js
/**
 * Authentication & Role-Based Access Control (RBAC) System
 * Adaptive Digital Twin Platform - Master's Thesis Project
 * University of Technology - Department of Architecture
 * Researcher: Dr. Ahmed Louay Ahmed
 */

class AuthManager {
    constructor(app) {
        this.app = app;
        this.storageKey = 'dt_auth_session_v1';
        
        // حسابات النظام المعمارية وقواعد الصلاحيات (RBAC Database)
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
        this.bindUiEvents();
        this.checkExistingSession();
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
                const u = (usernameInput?.value || '').trim();
                const p = (passwordInput?.value || '').trim();
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

        const user = this.users[username];
        const validPasswords = user ? (Array.isArray(user.password) ? user.password : [user.password]) : [];
        if (!user || !validPasswords.includes(password)) {
            this.showError("⚠️ اسم المستخدم أو رمز المرور غير صحيح. يرجى التحقق من صحة بيانات الدخول.");
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
        window.__CURRENT_AUTH_USER__ = {
            username: user.username,
            name_ar: user.name_ar,
            role: user.role,
            canViewConversationHistory: user.permissions.canViewConversationHistory
        };
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
