'use strict';

const MIN_RUB_AFTER_PROMO = 50;

const PROMO_CODES = {
  FLOWDM100: {
    type: 'fixed',
    amount: 100,
    label: 'Скидка 100 ₽',
    oncePerStatic: true
  }
};

function normalizePromoCode(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '');
}

function lookupPromo(raw) {
  const code = normalizePromoCode(raw);
  if (!code || !PROMO_CODES[code]) return null;
  return Object.assign({ code: code }, PROMO_CODES[code]);
}

function isOncePerStatic(raw) {
  const promo = lookupPromo(raw);
  return !!(promo && promo.oncePerStatic);
}

function applyPromoDiscount(baseRub, promoRaw) {
  const base = Math.max(0, Math.round(Number(baseRub) || 0));
  const promo = lookupPromo(promoRaw);
  if (!promo || base < 1) {
    return {
      ok: !promoRaw || !String(promoRaw).trim(),
      base_rub: base,
      final_rub: base,
      discount_rub: 0,
      promo: null
    };
  }
  let discount = 0;
  if (promo.type === 'percent') {
    discount = Math.floor((base * (Number(promo.amount) || 0)) / 100);
  } else {
    discount = Math.round(Number(promo.amount) || 0);
  }
  discount = Math.min(discount, Math.max(0, base - MIN_RUB_AFTER_PROMO));
  const finalRub = Math.max(MIN_RUB_AFTER_PROMO, base - discount);
  return {
    ok: true,
    base_rub: base,
    final_rub: finalRub,
    discount_rub: base - finalRub,
    promo: promo.code,
    label: promo.label,
    once_per_static: !!promo.oncePerStatic
  };
}

module.exports = {
  PROMO_CODES,
  MIN_RUB_AFTER_PROMO,
  normalizePromoCode,
  lookupPromo,
  isOncePerStatic,
  applyPromoDiscount
};
