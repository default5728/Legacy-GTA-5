/**
 * Логика редактора /tsc (порт Calamity clothesEditor/index.svelte).
 */
(function () {
  const clothesData = [
    { name: 'Маски', type: 'masks', props: false, id: 1 },
    { name: 'Прически', type: 'hair', props: false, id: 2 },
    { name: 'Аксессуары', type: 'accessories', props: false, id: 7 },
    { name: 'Браслеты', type: 'bracelets', props: true, id: 7 },
    { name: 'На уши', type: 'ears', props: true, id: 2 },
    { name: 'На глаза', type: 'glasses', props: true, id: 1 },
    { name: 'На голову', type: 'hats', props: true, id: 0 },
    { name: 'На ноги', type: 'legs', props: false, id: 4 },
    { name: 'Ботинки', type: 'shoes', props: false, id: 6 },
    { name: 'Верх', type: 'tops', props: false, id: 11 },
    { name: 'Часы', type: 'watches', props: true, id: 6 },
    { name: 'На спину', type: 'bags', props: false, id: 5 },
    { name: 'Undershirts', type: 'undershirts', props: false, id: 8 },
    { name: 'Броники', type: 'bodyarmors', props: false, id: 9 },
    { name: 'Декали', type: 'decals', props: false, id: 10 },
  ];

  const clothesDataToName = {
    undershirts: { props: false, id: 8 },
    torsos: { props: false, id: 3 },
  };

  const MaxMale = {
      bracelets: 8,
      ears: 40,
      glasses: 33,
      watches: 40,
      bags: 99,
      /** Ванильный предел ~154 (+1 для расчёта cvariation в SQL); DLC шапки часто с drawable 155…255+. */
      hats: 155,
      hair: 74,
      torsos: 183,
      legs: 137,
      shoes: 101,
      accessories: 151,
      bodyarmors: 55,
      tops: 381,
      undershirts: 183,
      masks: 194,
      decals: 119,
    };

  const UndershortData = [15, 15, 0, 2];

  const UndershortName = [
    'Не может быть вверхом',
    'полностью закрыта',
    'Полностью растегнута',
    'растегнута на половину',
  ];

  const TorsosData = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 112, 113, 114];

  const state = {
    componentId: 0,
    drawable: 0,
    texture: 0,
    torsos: 0,
    undershirts: 0,
    export: false,
  };

  function ce(name) {
    return document.getElementById(name);
  }

  function numStr(v) {
    return String(v).replace(/\D/g, '');
  }

  function pushUpdate() {
    const c = clothesData[state.componentId];
    if (!c) return;
    if (typeof mp !== 'undefined' && mp.trigger) {
      mp.trigger(
        'client.clothesEditor.update',
        c.id,
        c.props,
        state.drawable,
        state.texture
      );
    }
  }

  function pushUndershirt() {
    const drawable = UndershortData[state.undershirts];
    const u = clothesDataToName.undershirts;
    if (typeof mp !== 'undefined' && mp.trigger) {
      mp.trigger('client.clothesEditor.update', u.id, u.props, drawable, 0);
    }
  }

  function pushTorso() {
    const t = clothesDataToName.torsos;
    const v = TorsosData[state.torsos];
    if (typeof mp !== 'undefined' && mp.trigger) {
      mp.trigger('client.clothesEditor.update', t.id, t.props, v, 0);
    }
  }

  function syncFromState(changed) {
    const c = clothesData[state.componentId];
    ce('compName').textContent = c ? c.name : '—';
    ce('inpDr').value = state.drawable;
    ce('inpTx').value = state.texture;
    ce('unName').textContent = UndershortName[state.undershirts] || '—';
    ce('inpTor').value = TorsosData[state.torsos];

    const tops = c && c.type === 'tops';
    ce('topsExtra').classList.toggle('hidden', !tops);

    if (changed === 'undershirts') pushUndershirt();
    else if (changed === 'torsos') pushTorso();
    else if (tops) {
      pushUpdate();
      pushUndershirt();
      pushTorso();
    } else pushUpdate();
  }

  function buildExportSql() {
    const textures = [];
    for (let i = 0; i <= state.texture; i++) {
      textures.push([String(i), '']);
    }
    const c = clothesData[state.componentId];
    if (c.type !== 'tops') {
      return (
        'INSERT INTO clothes_male_' +
        c.type +
        "(id, cvariation, textures, category, can_buy, price) VALUES ('" +
        state.drawable +
        "', '" +
        (state.drawable - MaxMale[c.type]) +
        "', '" +
        JSON.stringify(textures) +
        "', '', '0', '0');"
      );
    }
    return (
      'INSERT INTO clothes_male_' +
      c.type +
      "(id, cvariation, torso, textures, type, category, can_buy, price) VALUES ('" +
      state.drawable +
      "', '" +
      (state.drawable - MaxMale[c.type]) +
      "', '" +
      TorsosData[state.torsos] +
      "', '" +
      JSON.stringify(textures) +
      "', '" +
      (state.undershirts - 1) +
      "', '', '0', '0');"
    );
  }

  function onLeft(array) {
    if (array === 'componentId') {
      state.componentId--;
      if (state.componentId < 0) state.componentId = clothesData.length - 1;
      state.drawable = 0;
      state.texture = 0;
      syncFromState(array);
      return;
    }

    state[array]--;
    if (array === 'undershirts' && state[array] < 0)
      state[array] = UndershortData.length - 1;
    else if (array === 'torsos' && state[array] < 0)
      state[array] = TorsosData.length - 1;
    else if (array === 'texture' || array === 'drawable') {
      if (state[array] < 0) state[array] = 0;
    }

    if (array === 'drawable') state.texture = 0;
    syncFromState(array);
  }

  function onRight(array) {
    if (array === 'componentId') {
      state.componentId++;
      if (state.componentId >= clothesData.length) state.componentId = 0;
      state.drawable = 0;
      state.texture = 0;
      syncFromState(array);
      return;
    }

    state[array]++;
    if (array === 'undershirts') {
      if (state[array] >= UndershortData.length) state[array] = 0;
    } else if (array === 'torsos') {
      if (state[array] >= TorsosData.length) state[array] = 0;
    }

    if (array === 'drawable') state.texture = 0;
    syncFromState(array);
  }

  function attach() {
    ce('compL').onclick = () => onLeft('componentId');
    ce('compR').onclick = () => onRight('componentId');
    ce('drL').onclick = () => onLeft('drawable');
    ce('drR').onclick = () => onRight('drawable');
    ce('txL').onclick = () => onLeft('texture');
    ce('txR').onclick = () => onRight('texture');
    ce('unL').onclick = () => onLeft('undershirts');
    ce('unR').onclick = () => onRight('undershirts');
    ce('torL').onclick = () => onLeft('torsos');
    ce('torR').onclick = () => onRight('torsos');

    ce('inpDr').oninput = function (e) {
      const n = numStr(e.target.value);
      if (n !== '') {
        state.drawable = Number(n);
        pushUpdate();
      }
    };

    ce('inpTx').oninput = function (e) {
      const n = numStr(e.target.value);
      if (n !== '') {
        state.texture = Number(n);
        pushUpdate();
      }
    };

    ce('inpTor').oninput = function (e) {
      const raw = numStr(e.target.value);
      if (raw === '' && raw !== '0') return;
      const idx = Number(raw);
      if (TorsosData[idx] !== undefined) {
        state.torsos = idx;
        pushTorso();
      }
    };

    ce('btnExport').onclick = function () {
      if (state.export !== false) {
        state.export = false;
        ce('mainPanel').classList.remove('hidden');
        ce('exportPanel').classList.add('hidden');
        ce('btnExit').textContent = 'Выйти';
        return;
      }
      state.export = buildExportSql();
      ce('exportTa').value = state.export;
      ce('mainPanel').classList.add('hidden');
      ce('exportPanel').classList.remove('hidden');
      ce('btnExit').textContent = 'Назад';
    };

    ce('btnExit').onclick = function () {
      if (state.export !== false) {
        state.export = false;
        ce('mainPanel').classList.remove('hidden');
        ce('exportPanel').classList.add('hidden');
        ce('btnExit').textContent = 'Выйти';
        return;
      }
      if (typeof mp !== 'undefined' && mp.trigger) {
        mp.trigger('client.clothesEditor.close');
      }
    };

    var panel = ce('cePanel');
    panel.onmouseenter = function () {
      if (typeof mp !== 'undefined' && mp.trigger) {
        mp.trigger('client.camera.toggled', false);
      }
    };
    panel.onmouseleave = function () {
      if (typeof mp !== 'undefined' && mp.trigger) {
        mp.trigger('client.camera.toggled', true);
      }
    };

    syncFromState('_init');
  }

  window.TscUi = {
    refresh: function () {
      state.export = false;
      ce('mainPanel').classList.remove('hidden');
      ce('exportPanel').classList.add('hidden');
      ce('btnExit').textContent = 'Выйти';
      syncFromState('_init');
    },
  };

  document.addEventListener('DOMContentLoaded', attach);
})();
