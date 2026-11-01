/**
 * Spectrumi — каталог одежды за DP.
 * Price хранит legacy-оценку Bloody; магазин конвертирует её в DP по курсу 10:1.
 */
global.SpectrumClothesItemsSell = (function buildSpectrumCatalog() {
    const PR = { tops: 4500, masks: 3000, bags: 5500, pants: 3500, shoes: 2500, hats: 3000, glasses: 2500, charm: 3000 };
    const out = [];
    let iid = 91001;

    function spectrumItemImgFor(cid, drawable, texture, extra) {
        const ex = extra || {};
        if (ex.spectrumCharmOnly) return 'spectrum/p/charm/ladydy.png';
        return `spectrum/p/${Number(cid)}/${Number(drawable)}/${Number(texture)}.png`;
    }

    function push(cid, name, drawable, texMax, price, torso, extra) {
        const comp = { 1: 0, 2: 1, 3: 11, 4: 4, 5: 6, 7: 1, 8: 5, 9: 10 }[cid];
        const id = iid++;
        const ex = extra || {};
        for (let t = 0; t <= texMax; t++) {
            out.push({
                ClothID: cid,
                ItemID: id,
                ItemName: name,
                Price: price,
                Drawable: drawable,
                ItemImg: spectrumItemImgFor(cid, drawable, t, ex),
                Textures: null,
                TopTexture: t,
                Component: comp,
                Torso: torso != null ? torso : null,
                Frac: 1,
                slotBonus: ex.slotBonus != null ? ex.slotBonus : null,
                toggleAlt: ex.toggleAlt != null ? ex.toggleAlt : null,
                spectrumCharm: ex.spectrumCharm === true,
                spectrumCharmOnly: ex.spectrumCharmOnly === true,
                spectrumLddBase: ex.spectrumLddBase === true,
                webPait: ex.webPait === true
            });
        }
    }

    function pushDonatePaints() {
        const price = 3990;
        const names = [
            'Бордовый',
            'Жёлтый',
            'Белый',
            'Чёрно-белый',
            'Розово-белый',
            'Розовый',
            'Зелёный',
            'Синий',
            'Чёрный'
        ];
        const id = iid++;
        for (let t = 0; t <= 8; t++) {
            out.push({
                ClothID: 5,
                ItemID: id,
                ItemName: 'Пеинты · ' + names[t],
                Price: price,
                Drawable: 173,
                ItemImg: 'ItemsMale/Shoes/173_' + t + '.jpg',
                Textures: null,
                TopTexture: t,
                Component: 6,
                Torso: null,
                Frac: 1,
                webPait: true,
                spectrumExclusive: true
            });
        }
    }

    function pushDonatePatrontazh() {
        const price = 8000;
        const names = ['Чёрный', 'Белый', 'Коричневый'];
        const id = iid++;
        for (let t = 0; t <= 2; t++) {
            out.push({
                ClothID: 9,
                ItemID: id,
                ItemName: 'Патронтаж · ' + names[t],
                Price: price,
                Drawable: 305,
                ItemImg: 'patrontazh_' + (t + 1) + '.png',
                Textures: null,
                TopTexture: t,
                Component: 10,
                Torso: null,
                Frac: 1,
                spectrumExclusive: true
            });
        }
    }

    // Верхняя
    push(3, 'Худи летнее с принтами', 677, 19, PR.tops, 0);
    push(3, 'Свитшот-поло', 678, 14, PR.tops, 6);
    push(3, 'Майка легкая летняя', 679, 13, PR.tops, 5);
    push(3, 'Футболка двухслойная Plum Angels', 680, 9, PR.tops, 0);
    push(3, 'Футболка с рубашкой с принтами', 681, 24, PR.tops, 0);
    push(3, 'Худи S.P. x North Park', 682, 10, PR.tops, 0);
    push(3, 'Свитшот с заклепками Balenciara', 683, 1, PR.tops, 0);
    push(3, 'Футболка Nice Airy Plus T', 684, 8, PR.tops, 0);
    push(3, 'Зип худи Double sided soul', 685, 9, PR.tops, 14);
    push(3, 'Пиджак с бронированным плечом', 686, 6, PR.tops, 2);
    push(3, 'Свитер Sup Blurred', 687, 7, PR.tops, 0);
    push(3, 'Худи MW9 Mason Margela', 688, 9, PR.tops, 0);
    push(3, 'Толстовка Project Y Street Relic', 689, 13, PR.tops, 0);

    // Маски
    push(2, 'Балаклава с рогами', 253, 23, PR.masks, null);
    push(2, 'Маска с капюшоном Y8', 254, 9, PR.masks, null);
    push(2, 'Маска с козырьком Vr Tetryx', 255, 9, PR.masks, null);
    push(2, 'Балаклава Nice Pro', 256, 9, PR.masks, null);
    push(2, 'Маска Metalful Liquid', 257, 7, PR.masks, null);
    push(2, 'Маска Крик Glitter', 258, 13, PR.masks, null, { toggleAlt: 259 });

    // Сумки
    push(8, 'Рюкзак Ladudu', 145, 6, PR.bags, null, { slotBonus: 10 });
    push(8, 'Рюкзак Balenciara Be kind', 146, 7, PR.bags, null, { slotBonus: 20 });
    push(8, 'Сумка нагрудная CK', 147, 8, PR.bags, null, { slotBonus: 5 });
    push(8, 'Сумка Nice Airy Plus T', 148, 8, PR.bags, null, { slotBonus: 15 });
    push(8, 'Сумка LW LDD без брелков', 149, 7, PR.bags, null, { slotBonus: 20, spectrumLddBase: true });
    push(8, 'Рюкзак Китти Чаки', 157, 11, PR.bags, null, { slotBonus: 15 });
    push(8, 'Сумка Сердце в костях', 158, 13, PR.bags, null, { slotBonus: 10 });
    push(8, 'Рюкзак Pika Skeleton', 159, 0, PR.bags, null, { slotBonus: 15 });
    push(8, 'Сумка Masackre Stressed', 160, 7, PR.bags, null, { slotBonus: 15 });
    push(8, 'Брелок Ladydy', 149, 0, PR.charm, null, { spectrumCharmOnly: true });

    // Брюки
    push(4, 'Бриджи легкие летние', 257, 14, PR.pants, null);
    push(4, 'Шорты в полоску Stone Islet x Sup', 258, 8, PR.pants, null);
    push(4, 'Шорты легкие Double sided soul', 259, 9, PR.pants, null);
    push(4, 'Шорты Plum Angels', 260, 9, PR.pants, null);
    push(4, 'Штаны со значками Swaggy pins', 261, 9, PR.pants, null);
    push(4, 'Джинсы бананы с подворотами', 262, 11, PR.pants, null);
    push(4, 'Шорты Stone Islet Mona Lisa', 263, 4, PR.pants, null);
    push(4, 'Штаны Rik Ovens Prisoner', 264, 7, PR.pants, null);

    // Обувь
    push(5, 'Ботинки Slouch', 175, 19, PR.shoes, null);

    // Шляпы
    push(1, 'Кепка Project Y', 253, 8, PR.hats, null, { toggleAlt: 252 });
    push(1, 'Кепка Nice Airy', 254, 8, PR.hats, null);

    // Очки
    push(7, 'Очки Neotribal', 67, 19, PR.glasses, null);
    push(7, 'Очки Token x Rough Beauty', 68, 3, PR.glasses, null);

    // Эксклюзив (пеинты, патронтаж)
    pushDonatePaints();
    pushDonatePatrontazh();

    return out;
})();

global.SPECTRUM_LDD_BASE_DRAWABLE = 149;
global.SPECTRUM_LDD_MAX_CHARMS = 7;

/** Превью Spectrum в инвентаре/маркете: spectrum/p/{cid}/{drawable}/{texture}.png */
global.spectrumPreviewImg = function (cid, drawable, texture) {
    const c = Number(cid);
    let sd = Number(drawable);
    const t = Number.isFinite(Number(texture)) ? Number(texture) : 0;
    if (!Number.isFinite(c) || !Number.isFinite(sd)) return '';
    if (c === 8 && sd >= 149 && sd <= 156) sd = 149;
    if (c === 1 && (sd === 252 || sd === 253)) sd = 253;
    if (c === 2 && (sd === 258 || sd === 259)) sd = 258;
    return `spectrum/p/${c}/${sd}/${t}.png`;
};
