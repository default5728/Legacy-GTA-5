/**
 * Только webhook Platega (без HTML-сайта).
 * URL для кабинета: http(s)://IP:8788/api/donate/platega/callback
 */
'use strict';

const path = require('path');
const express = require('express');
const { getDonatePort } = require('./config/donate_config.js');

const DONATE_MODULE = path.join(__dirname, 'discord_donate.js');
const PORT = getDonatePort();
const app = express();
app.use(express.json({ limit: '64kb' }));

function loadDonateModule() {
    return require(DONATE_MODULE);
}

app.post('/api/donate/platega/callback', (req, res) => {
    try {
        loadDonateModule().handlePlategaCallback(req, res);
    } catch (e) {
        console.log('[platega_webhook] callback:', e.message || e);
        res.status(200).json({ ok: true });
    }
});

app.post('/donate/validate-promo', (req, res) => {
    try {
        loadDonateModule().handleWebValidatePromo(req, res);
    } catch (e) {
        console.log('[platega_webhook] validate-promo:', e.message || e);
        res.status(500).json({ ok: false, error: 'server_error', message: 'Ошибка сервера' });
    }
});

app.post('/donate/admin-quote', (req, res) => {
    try {
        loadDonateModule().handleWebAdminQuote(req, res);
    } catch (e) {
        console.log('[platega_webhook] admin-quote:', e.message || e);
        res.status(500).json({ ok: false, error: 'server_error', message: 'Ошибка сервера' });
    }
});

app.post('/donate/create-order', (req, res) => {
    try {
        loadDonateModule().handleWebCreateOrder(req, res);
    } catch (e) {
        console.log('[platega_webhook] create-order:', e.message || e);
        res.status(500).json({ ok: false, error: 'server_error', message: 'Ошибка сервера' });
    }
});

app.post('/donate/manual-paid', (req, res) => {
    try {
        loadDonateModule().handleWebManualConfirm(req, res);
    } catch (e) {
        console.log('[platega_webhook] manual-paid:', e.message || e);
        res.status(500).json({ ok: false, error: 'server_error', message: 'Ошибка сервера' });
    }
});

app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'platega_webhook', manual_card: true });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[platega_webhook] http://0.0.0.0:${PORT}/api/donate/platega/callback`);
    console.log(`[platega_webhook] http://0.0.0.0:${PORT}/donate/validate-promo`);
    console.log(`[platega_webhook] http://0.0.0.0:${PORT}/donate/admin-quote`);
    console.log(`[platega_webhook] http://0.0.0.0:${PORT}/donate/create-order`);
});

module.exports = { app, PORT };

