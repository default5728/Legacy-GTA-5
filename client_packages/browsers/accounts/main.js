/* Flow auth — MAIN UI + наши события loginAttempt/registerAttempt */
const authMain = new Vue({
    el: '#authMenu',
    data: {
        isActive: false,
        authMode: 0,
        authBlock: false,
        sessionPending: false,
        limitError: false,
        queue: 0,
        news: [],
        serverData: {
            serverId: 23,
            serverName: 'ALTA',
            enableServerPass: false,
            isAutoLoginEnabled: false
        },
        formAuth: {
            login: '',
            pass: '',
            serverPass: '',
            error: ''
        },
        formReg: {
            login: '',
            pass: '',
            confirmPass: '',
            email: '',
            error: ''
        },
        loaded: false
    },
    methods: {
        boot(payload) {
            const data = payload || {};
            if (data.serverId != null) this.serverData.serverId = parseInt(data.serverId, 10) || 23;
            if (data.serverName) this.serverData.serverName = String(data.serverName);
            if (data.login) this.formAuth.login = String(data.login);
            if (Array.isArray(data.news)) this.news = data.news;
            this.authBlock = false;
            this.sessionPending = false;
            this.loaded = true;
            this.isActive = true;
            // Не затирать пароль, если пользователь уже начал ввод (повторный boot)
            if (!String(this.formAuth.pass || '').length) {
                this.formAuth.pass = '';
            }
            this.clearErrors();
            document.body.className = '';
            document.body.classList.add('server-bg-' + this.serverData.serverId);
            this.$nextTick(() => this.focusAuthPrimaryInput());
        },
        clearErrors() {
            this.formAuth.error = '';
            this.formReg.error = '';
        },
        clearStatusLabel() {
            this.clearErrors();
        },
        setStatusLabel(message) {
            const msg = String(message || '').trim();
            if (!msg) return;
            if (this.authMode === 1) this.formReg.error = msg;
            else this.formAuth.error = msg;
        },
        setAuthLogin(login) {
            this.formAuth.login = String(login || '').trim();
            this.authMode = 0;
            this.sessionPending = false;
            this.authBlock = false;
            this.clearErrors();
            this.$nextTick(() => this.focusAuthPrimaryInput());
        },
        onRegisterSuccess(login) {
            const pass = String(this.formReg.pass || '');
            this.authBlock = false;
            this.sessionPending = false;
            this.authMode = 0;
            this.formAuth.login = String(login || '').trim();
            this.formAuth.pass = pass;
            this.formReg.login = '';
            this.formReg.email = '';
            this.formReg.pass = '';
            this.formReg.confirmPass = '';
            this.formReg.error = '';
            this.formAuth.error = '';
            this.isActive = true;
            this.$nextTick(() => {
                if (pass.length >= 3) this.auth();
                else this.focusAuthPrimaryInput();
            });
        },
        focusAuthPrimaryInput() {
            if (!this.isActive || this.authMode !== 0) return;
            const loginInput = this.$refs.loginInput;
            const passInput = this.$refs.passInput;
            if (String(this.formAuth.login || '').trim().length > 0 && passInput) {
                try { passInput.focus(); } catch (_e) {}
                return;
            }
            if (loginInput) {
                try { loginInput.focus(); } catch (_e2) {}
            }
        },
        focusAuthPrimaryInputPublic() {
            this.focusAuthPrimaryInput();
        },
        hideForSession() {
            this.sessionPending = true;
            this.isActive = false;
            this.authBlock = true;
            this.clearErrors();
        },
        setVerificationEmail() {},
        onRecoverySuccess(login) {
            this.authMode = 0;
            this.setAuthLogin(login);
            this.formAuth.error = 'Пароль изменён. Войдите с новым паролем.';
        },
        isValidLoginFormat(login) {
            return typeof login === 'string' && /^[a-zA-Zа-яА-ЯёЁ0-9_]+$/.test(login);
        },
        validateEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
        },
        auth() {
            if (this.authBlock || this.sessionPending) return;
            this.authBlock = true;
            this.clearErrors();

            const login = String(this.formAuth.login || '').trim();
            const pass = String(this.formAuth.pass || '');

            if (login.length < 3 || pass.length < 3) {
                this.formAuth.error = 'Заполните все поля';
                this.authBlock = false;
                return;
            }
            if (!this.isValidLoginFormat(login)) {
                this.formAuth.error = 'Логин: только буквы, цифры и символ _';
                this.authBlock = false;
                return;
            }
            if (login.length > 15) {
                this.formAuth.error = 'Логин не больше 15 символов';
                this.authBlock = false;
                return;
            }
            if (/[а-яА-ЯЁё]/.test(pass)) {
                this.formAuth.error = 'В пароле не может быть русских букв';
                this.authBlock = false;
                return;
            }

            try {
                mp.trigger('loginAttempt', JSON.stringify({ login, password: pass }));
            } catch (_e) {
                this.formAuth.error = 'Ошибка клиента. Перезайдите.';
                this.authBlock = false;
                return;
            }
            setTimeout(() => { this.authBlock = false; }, 5000);
        },
        reg() {
            if (this.authBlock || this.sessionPending) return;
            this.authBlock = true;
            this.clearErrors();

            const login = String(this.formReg.login || '').trim();
            const email = String(this.formReg.email || '').trim();
            const pass = String(this.formReg.pass || '');
            const confirmPass = String(this.formReg.confirmPass || '');

            if (pass !== confirmPass) {
                this.formReg.error = 'Пароли не совпадают';
                this.authBlock = false;
                return;
            }
            if (/[а-яА-ЯЁё]/.test(pass)) {
                this.formReg.error = 'В пароле не может быть русских букв';
                this.authBlock = false;
                return;
            }
            if (email.length < 3 || login.length < 3 || pass.length < 6) {
                this.formReg.error = login.length < 3
                    ? 'Логин минимум 3 символа'
                    : (pass.length < 6 ? 'Минимальная длина пароля 6 символов' : 'Заполните все поля');
                this.authBlock = false;
                return;
            }
            if (!this.isValidLoginFormat(login)) {
                this.formReg.error = 'Логин: только буквы, цифры и символ _';
                this.authBlock = false;
                return;
            }
            if (login.length > 15) {
                this.formReg.error = 'Логин не больше 15 символов';
                this.authBlock = false;
                return;
            }
            if (!this.validateEmail(email)) {
                this.formReg.error = 'Введите корректную почту';
                this.authBlock = false;
                return;
            }

            try {
                mp.trigger('registerAttempt', JSON.stringify({ login, email, password: pass }));
            } catch (_e) {
                this.formReg.error = 'Ошибка клиента. Перезайдите.';
                this.authBlock = false;
                return;
            }
            setTimeout(() => { this.authBlock = false; }, 5000);
        }
    },
    mounted() {
        this.loaded = true;
        document.body.classList.add('server-bg-' + this.serverData.serverId);
        try {
            if (typeof mp !== 'undefined' && mp.trigger) mp.trigger('auth:browser:ready');
        } catch (_e) {}
    }
});

window.authMain = authMain;

window.setStatusLabel = function (message) {
    if (authMain) authMain.setStatusLabel(message);
};

document.addEventListener('keyup', function (event) {
    if (event.keyCode !== 13 || !authMain || !authMain.isActive || authMain.sessionPending) return;
    if (authMain.authMode === 0) authMain.auth();
    else if (authMain.authMode === 1) authMain.reg();
});
