function show() {
    document.querySelector('.accept').style.display = 'flex';
    mp.gui.cursor.show(true, true);
}

function hide() {
    document.querySelector('.accept').style.display = 'none';
    mp.gui.cursor.show(false, false);
}

function setData(sellerLogin, coburaName, price) {
    const loginEl = document.getElementById('sellerLogin');
    const nameEl = document.getElementById('coburaName');
    const priceEl = document.getElementById('coburaPrice');
    if (loginEl) loginEl.innerText = sellerLogin || '';
    if (nameEl) nameEl.innerText = coburaName || '';
    if (priceEl) priceEl.innerText = price || '0';
}
