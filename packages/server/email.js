const nodemailer = require('nodemailer');



const CODE_TTL_MS = 15 * 60 * 1000;

const webRecoveryStore = new Map();



class EmailRestore {

    static senderEmail = "moon-dm@mail.ru";

    static senderPassword = process.env.SMTP_PASSWORD || "";

    static smtpHost = "smtp.mail.ru";

    static smtpPort = 587;



    static normalizeEmail(email) {

        return String(email || '').trim().toLowerCase();

    }



    static storeRecoveryCode(player, email, code, login) {

        player._recoveryVerification = {

            code: String(code),

            email: this.normalizeEmail(email),

            login: login ? String(login) : null,

            expiresAt: Date.now() + CODE_TTL_MS,

        };

    }



    static clearRecoveryCode(player) {

        delete player._recoveryVerification;

        if (player.getVariable && player.getVariable('verificationCode')) {

            player.setVariable('verificationCode', null);

        }

    }



    static storeWebRecoveryCode(email, code, login) {

        const normalizedEmail = this.normalizeEmail(email);

        webRecoveryStore.set(normalizedEmail, {

            code: String(code),

            email: normalizedEmail,

            login: login ? String(login) : null,

            expiresAt: Date.now() + CODE_TTL_MS,

        });

    }



    static clearWebRecoveryCode(email) {

        webRecoveryStore.delete(this.normalizeEmail(email));

    }



    static verifyWebRecoveryCode(email, code) {

        const normalizedEmail = this.normalizeEmail(email);

        const stored = webRecoveryStore.get(normalizedEmail);

        if (!stored) {

            return { ok: false, reason: 'Код не найден. Запросите новый код на почту' };

        }

        if (Date.now() > stored.expiresAt) {

            this.clearWebRecoveryCode(normalizedEmail);

            return { ok: false, reason: 'Срок действия кода истёк. Запросите новый код' };

        }



        const inputCode = String(code || '').trim();

        if (!/^\d{6}$/.test(inputCode)) {

            return { ok: false, reason: 'Неверный код' };

        }

        if (stored.code !== inputCode) {

            return { ok: false, reason: 'Неверный код' };

        }



        return { ok: true, login: stored.login };

    }



    static async sendWebVerificationCode(recipientEmail, login) {

        const normalizedEmail = this.normalizeEmail(recipientEmail);

        const verificationCode = String(this.generateVerificationCode());

        const transporter = nodemailer.createTransport({

            host: this.smtpHost,

            port: this.smtpPort,

            secure: false,

            auth: {

                user: this.senderEmail,

                pass: this.senderPassword,

            },

            tls: {

                rejectUnauthorized: false,

            },

        });



        const message = {

            from: this.senderEmail,

            to: normalizedEmail,

            subject: 'Сброс пароля | FLOW DM',

            html: `Ваш код подтверждения для сброса пароля: <b>${verificationCode}</b><br>С любовью, команда FLOW DM!`,

        };



        try {

            await transporter.sendMail(message);

            this.storeWebRecoveryCode(normalizedEmail, verificationCode, login);

            return { success: true };

        } catch (ex) {

            this.clearWebRecoveryCode(normalizedEmail);

            console.log(`Error sending email: ${ex.message}`);

            return { success: false, error: ex.message };

        }

    }



    static verifyRecoveryCode(player, email, code) {

        const stored = player._recoveryVerification;

        if (!stored) {

            return { ok: false, reason: 'Код не найден. Запросите новый код на почту' };

        }

        if (Date.now() > stored.expiresAt) {

            this.clearRecoveryCode(player);

            return { ok: false, reason: 'Срок действия кода истёк. Запросите новый код' };

        }



        const normalizedEmail = this.normalizeEmail(email);

        const inputCode = String(code || '').trim();



        if (stored.email !== normalizedEmail) {

            return { ok: false, reason: 'Неверный код' };

        }

        if (!/^\d{6}$/.test(inputCode)) {

            return { ok: false, reason: 'Неверный код' };

        }

        if (stored.code !== inputCode) {

            return { ok: false, reason: 'Неверный код' };

        }



        return { ok: true };

    }



    static async sendVerificationCode(player, recipientEmail, login) {

        const normalizedEmail = this.normalizeEmail(recipientEmail);

        const verificationCode = String(this.generateVerificationCode());



        const transporter = nodemailer.createTransport({

            host: this.smtpHost,

            port: this.smtpPort,

            secure: false,

            auth: {

                user: this.senderEmail,

                pass: this.senderPassword,

            },

            tls: {

                rejectUnauthorized: false,

            },

        });



        const message = {

            from: this.senderEmail,

            to: normalizedEmail,

            subject: "Сброс пароля | FLOW DM",

            html: `Ваш код подтверждения для сброса пароля: ${verificationCode}<br>С любовью, команда FLOW DM!`,

        };



        try {

            await transporter.sendMail(message);

            this.storeRecoveryCode(player, normalizedEmail, verificationCode, login);

            return { success: true };

        } catch (ex) {

            this.clearRecoveryCode(player);

            console.log(`Error sending email: ${ex.message}`);

            return { success: false, error: ex.message };

        }

    }



    static generateVerificationCode() {

        return Math.floor(100000 + Math.random() * 900000);

    }

}



module.exports = EmailRestore;

