let targetMenu = new Vue({
  el: '#targetMenuRoot',
  data: {
    active: false,
    panel: 'hub',
    hubStatusTitle: 'Закрыть меню',
    hubStatusDesc: '',
    balance: '1.000',
    login: 'whait',
    static: 1,
    moneySend: '',
    diceSend: '',
    coburaSellId: null,
    coburaSellName: '',
    coburaPrice: '',
    tradeActive: false,
    tradePartnerLogin: '',
    tradePartnerStatic: 0,
    tradeInventorySnapshot: [],
    myOfferItems: [],
    myOfferMoney: 0,
    partnerOfferItems: [],
    partnerOfferMoney: 0,
    iAmReady: false,
    partnerReady: false,
    tradeMoneyInput: '',
    tradeOfferDebounce: null,
    stackSpankQty: '',
    stackAlcoQty: '',
    tradeStackSpankAvail: 0,
    tradeStackAlcoAvail: 0,
    tradeMansionOfferable: false,
    fractionInviteAvailable: false,
    menuMode: 'player',
    vehicleRemoteId: 0,
    vehicleSeated: false,
    vehicleTuning: null,
    tuningRows: [{key:'steering',label:'Управляемость',min:70,max:140,unit:'%'},{key:'grip',label:'Сцепление с асфальтом',min:80,max:160,unit:'%'},{key:'height',label:'Высота подвески',min:-8,max:8,unit:'см'},{key:'roll',label:'Наклон в поворотах',min:40,max:160,unit:'%'}],
    vehicleName: '',
    vehicleLocked: false,
    vehicleCanSell: false,
    vehicleSellPrice: 0,
    vehicleHasTrunk: true,
    vehicleSellModel: '',
    vehicleSellPriceFmt: '',
    hubRing: [
      { id: 'money', label: 'Деньги', sub: 'Передача', panel: 'money', ico: 'give-money.svg' },
      { id: 'dice', label: 'Кости', sub: 'Ставка', panel: 'dice', ico: 'coin-toss.svg' },
      { id: 'trade', label: 'Обмен', sub: 'Предметы', action: 'trade', ico: 'exchange.svg' },
      { id: 'handshake', label: 'Пожать руку', sub: 'Запрос', kind: 'handshake', ico: 'handshake.svg' }
    ]
  },
  watch: {
    active() {
      this.syncHubWheel();
    },
    panel() {
      this.syncHubWheel();
    },
    fractionInviteAvailable() {
      this.syncHubWheel();
    },
    menuMode() {
      this.syncHubWheel();
    },
    vehicleLocked() {
      this.syncHubWheel();
    },
    vehicleCanSell() {
      this.syncHubWheel();
    },
    vehicleHasTrunk() {
      this.syncHubWheel();
    }
  },
  mounted() {
    this.syncHubWheel();
  },
  computed: {
    radialItems() {
      if (this.menuMode === 'vehicle') return this.vehicleHubRingFiltered;
      if (this.panel !== 'hub' || !this.fractionInviteAvailable) return this.hubRing;
      return this.hubRing.concat([
        { id: 'fracinv', label: 'Фракция', sub: 'Пригласить', action: 'fracInvite', ico: 'work-invite.svg' }
      ]);
    },
    vehicleHubRingFiltered() {
      const items = this.buildVehicleHubRing();
      return items.filter(function (it) { return !it.hidden; });
    },
    tradeableInventoryRows() {
      const inv = Array.isArray(this.tradeInventorySnapshot) ? [...this.tradeInventorySnapshot] : [];
      for (const o of this.myOfferItems) {
        const ix = inv.indexOf(o);
        if (ix >= 0) inv.splice(ix, 1);
      }
      const out = [];
      for (let i = 0; i < inv.length; i++) {
        if (this.clientTradeableItem(inv[i])) {
          out.push({ item: inv[i], key: inv[i] + ':' + i });
        }
      }
      return out;
    }
  },
  methods: {
    clientTradeableItem(item) {
      if (!item || typeof item !== 'string') return false;
      if(item.startsWith('kpl.')){try{return !!JSON.parse(decodeURIComponent(escape(atob(item.slice(4))))).id;}catch(_){return false;}}
      if (/^trade_donate:car:/.test(item)) return false;
      if (/^trade_family:mansion:/.test(item)) return false;
      if (item.indexOf('trade_donate:') === 0) return true;
      if (item.indexOf('ic1.') === 0) return true;
      if (item.indexOf('ivhol:') === 0 || item.indexOf('ivbag:') === 0) return true;
      if (item === 'weapon_revolver') return false;
      const base = item.split('(')[0].trim();
      if (base === 'item_spank' || base === 'item_alco') return false;
      if (item === 'Бронежилет' || base === 'Бронежилет') return false;
      if (!base.startsWith('weapon_')) return false;
      return true;
    },
    displayItem(item) {
      if (!item) return '';
      if(String(item).startsWith('kpl.')){try{const old=JSON.parse(decodeURIComponent(escape(atob(item.slice(4)))));return (old.name||old.type||'Предмет')+' × '+(old.count||1);}catch(_){return 'Предмет';}}
      const st = /^trade_stack:(item_spank|item_alco):(\d+)$/.exec(String(item));
      if (st) {
        const label = st[1] === 'item_spank' ? 'Спанк' : 'Медовуха';
        return label + ' × ' + st[2];
      }
      const hol = /^trade_donate:holster:(cobura|coburaw):(\d+)$/.exec(String(item));
      if (hol) {
        const map = { cobura: 'Чёрная Кобура', coburaw: 'Белая Кобура' };
        return (map[hol[1]] || hol[1]) + ' (донат)';
      }
      const bag = /^trade_donate:bag:(bag_\w+)$/.exec(String(item));
      if (bag) {
        const short = bag[1].replace(/^bag_/, '');
        return 'Сумка / рюкзак: ' + short + ' (донат)';
      }
      const car = /^trade_donate:car:(\d+)(?::([a-zA-Z0-9_-]+))?$/.exec(String(item));
      if (car) {
        const slot = parseInt(car[1], 10) + 1;
        const raw = car[2];
        if (raw) {
          const pretty = raw
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
          return pretty + ' (слот ' + slot + ', донат)';
        }
        return 'Транспорт (слот ' + slot + ', донат)';
      }
      const famMan = /^trade_family:mansion:(\d+)$/.exec(String(item));
      if (famMan) {
        const n = parseInt(famMan[1], 10);
        const pad = String(n).length >= 2 ? String(n) : '0' + String(n);
        return 'Особняк ' + pad + ' (семья)';
      }
      if (String(item).indexOf('ic1.') === 0) {
        try {
          const b64 = String(item).split('(')[0].trim().slice(4);
          const json = decodeURIComponent(escape(atob(b64)));
          const o = JSON.parse(json);
          if (o && o.nm) return String(o.nm) + ' (одежда)';
        } catch (e) {}
        return 'Одежда';
      }
      if (String(item).indexOf('ivhol:') === 0) {
        const k = String(item).split('(')[0].trim().slice(6);
        const hm = { cobura: 'Чёрная Кобура', coburaw: 'Белая Кобура' };
        return (hm[k] || k) + ' (кабура)';
      }
      if (String(item).indexOf('ivbag:') === 0) {
        const k = String(item).split('(')[0].trim().slice(6).replace(/^bag_/, '');
        return 'Сумка / рюкзак: ' + k;
      }
      const map = {
        weapon_heavyshotgun: 'Heavy Shotgun',
        weapon_carbinerifle: 'Carbine Rifle',
        weapon_assaultrifle: 'Assault Rifle',
        weapon_combatmg: 'Combat MG',
        weapon_combatmg_mk2: 'Combat MG MKII',
        weapon_minismg: 'Mini SMG',
        weapon_militaryrifle: 'Military Rifle',
        weapon_sniperrifle: 'Sniper Rifle',
        weapon_heavysniper: 'Heavy Sniper MK1',
        weapon_heavysniper_mk2: 'Heavy Sniper MKII',
        weapon_marksmanrifle: 'Marksman Rifle',
        weapon_specialcarbine: 'Special Carbine',
        weapon_precisionrifle: 'Precision Rifle',
        weapon_revolver_mk2: 'Revolver MKII',
        weapon_navyrevolver: 'Navy Revolver',
        weapon_gadgetpistol: 'Gadget Pistol',
        item_spank: 'Спанк',
        item_alco: 'Медовуха'
      };
      const base = String(item).split('(')[0].trim();
      const suf = String(item).includes('(') ? ' ' + String(item).substring(String(item).indexOf('(')) : '';
      return (map[base] || base) + suf;
    },
    formatOfferMoney(n) {
      const x = parseInt(n, 10) || 0;
      return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    },
    showCoburaSell(coburaId, coburaName) {
      this.coburaSellId = coburaId;
      this.coburaSellName = coburaName;
      this.coburaPrice = '';
      this.panel = 'cobura';
      this.active = true;
    },
    SellCobura() {
      if (this.coburaSellId) {
        mp.trigger('target:coburaSell:c', this.static, this.coburaSellId, this.coburaPrice);
      }
    },
    formatNum(number) {
      return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    },
    changeBalance(value) {
      this.balance = this.formatNum(value);
    },
    changeTarget(targetLogin, targetStatic) {
      this.menuMode = 'player';
      this.login = targetLogin;
      this.static = targetStatic;
      this.moneySend = '';
      this.diceSend = '';
      this.fractionInviteAvailable = false;
      this.resetHubStatus();
    },
    openVehicleMenu(remoteId, seated = false) {
      this.vehicleSeated = !!seated;
      this.vehicleTuning = null;
      this.menuMode = 'vehicle';
      this.vehicleRemoteId = Number(remoteId) || 0;
      this.panel = 'hub';
      this.vehicleName = 'Транспорт';
      this.vehicleLocked = false;
      this.vehicleCanSell = false;
      this.vehicleSellPrice = 0;
      this.vehicleHasTrunk = true;
      this.vehicleSellModel = '';
      this.vehicleSellPriceFmt = '';
      this.resetHubStatus();
    },
    applyVehicleMenuState(remoteId, vehName, locked, canSell, sellPrice, hasTrunk) {
      this.menuMode = 'vehicle';
      this.vehicleRemoteId = Number(remoteId) || 0;
      this.vehicleName = String(vehName || 'Транспорт');
      this.vehicleLocked = !!locked;
      this.vehicleCanSell = !!canSell;
      this.vehicleSellPrice = Number(sellPrice) || 0;
      this.vehicleHasTrunk = !!hasTrunk;
      this.resetHubStatus();
      this.syncHubWheel();
    },
    setVehicleLocked(locked) {
      this.vehicleLocked = !!locked;
      this.syncHubWheel();
    },
    applyVehicleTuning(remoteId, value) {
      if(this.menuMode !== 'vehicle' || this.vehicleRemoteId !== Number(remoteId))return;
      this.vehicleTuning = value;
      this.panel = 'vehicleTuning';
    },
    saveVehicleTuning(reset = false) {
      if(!this.vehicleTuning)return;
      const value = reset ? {steering:100,grip:100,height:0,roll:100} : this.vehicleTuning;
      if(typeof mp !== 'undefined')mp.trigger('legacy:vehicle:tuning:save:c',this.vehicleRemoteId,JSON.stringify(value));
    },
    buildVehicleHubRing() {
      return [
        {id:'vtuning',label:'Настройки',sub:'Ходовая часть',action:'vehicleTuning',ico:'car-other.svg',hidden:!this.vehicleSeated},
        {id:'vplates',label:'Номера',sub:'Установка / снятие',action:'vehiclePlate',ico:'lic-plate-on.svg'},
        {
          id: 'vlock',
          label: this.vehicleLocked ? 'Открыть' : 'Закрыть',
          sub: 'Транспорт',
          action: 'vehicleLock',
          ico: this.vehicleLocked ? 'trunk-open.svg' : 'trunk-close.svg'
        },
        {
          id: 'vsit',
          label: 'Сесть',
          sub: 'В авто',
          action: 'vehicleSit',
          ico: 'seat-car.svg'
        },
        {
          id: 'vsell',
          label: 'Продать',
          sub: 'Государству',
          action: 'vehicleSell',
          ico: 'sell_car.svg',
          hidden: !this.vehicleCanSell
        },
        {
          id: 'vtrunk',
          label: 'Багажник',
          sub: 'Инвентарь',
          action: 'vehicleTrunk',
          ico: 'trunk-open.svg',
          hidden: !this.vehicleHasTrunk
        }
      ];
    },
    openVehicleSellConfirm(model, priceFmt) {
      this.vehicleSellModel = String(model || '');
      this.vehicleSellPriceFmt = String(priceFmt || '');
      this.panel = 'vehicleSell';
    },
    confirmVehicleSell() {
      try {
        if (typeof mp !== 'undefined' && mp.trigger) mp.trigger('target:vehicle:action:c', 'sellYes');
      } catch (_e) {}
    },
    cancelVehicleSell() {
      this.panel = 'hub';
      this.resetHubStatus();
    },
    setFractionInviteAvailable(on) {
      this.fractionInviteAvailable = !!on;
    },
    inviteToFraction() {
      try {
        if (typeof mp !== 'undefined' && mp.trigger) {
          mp.trigger('target:fractionInvite:c', this.static);
        }
      } catch (_e) {}
    },
    resetPanelHub() {
      this.panel = 'hub';
    },
    onRadialPick(item) {
      if (!item) return;
      if (item.action === 'vehicleLock') {
        try { if (typeof mp !== 'undefined' && mp.trigger) mp.trigger('target:vehicle:action:c', 'lock'); } catch (_e) {}
        return;
      }
      if (item.action === 'vehicleTrunk') {
        try { if (typeof mp !== 'undefined' && mp.trigger) mp.trigger('target:vehicle:action:c', 'trunk'); } catch (_e2) {}
        return;
      }
      if (item.action === 'vehicleSit') {
        try { if (typeof mp !== 'undefined' && mp.trigger) mp.trigger('target:vehicle:action:c', 'sit'); } catch (_e3) {}
        return;
      }
      if (item.action === 'vehicleSell') {
        try { if (typeof mp !== 'undefined' && mp.trigger) mp.trigger('target:vehicle:action:c', 'sell'); } catch (_e4) {}
        return;
      }
      if (item.action === 'vehicleTuning') {
        if(typeof mp !== 'undefined')mp.trigger('target:vehicle:action:c','tuning');
        return;
      }
      if (item.action === 'vehiclePlate') {
        if(typeof mp!=='undefined')mp.trigger('target:vehicle:action:c','plates');
        return;
      }
      if (item.panel) {
        this.panel = item.panel;
        return;
      }
      if (item.action === 'trade') {
        this.startTrade();
        return;
      }
      if (item.action === 'fracInvite') {
        this.inviteToFraction();
        return;
      }
      if (item.kind) {
        this.requestPair(item.kind);
      }
    },
    requestPair(kind) {
      const k = String(kind || '').trim();
      if (!k) return;
      try {
        if (typeof mp !== 'undefined' && mp.trigger) mp.trigger('target:pair:c', k);
      } catch (_e) {}
    },
    TransferMoney() {
      mp.trigger('target:transfer:c', this.static, this.moneySend);
    },
    PlayKost() {
      mp.trigger('target:kost:c', this.static, this.diceSend);
    },
    setUiVisible(on) {
      clearTimeout(this._keplerCloseTimer);document.body.classList.remove('kepler-closing');
      this.active = !!on;
      if (!this.active) {
        this.syncHubWheel();
        return;
      }
      if (!this.panel) this.panel = 'hub';
      this.syncHubWheel();
    },
    shutdownUi() {
      this.resetTradeUi();
      this.panel = 'hub';
      this.menuMode = 'player';
      this.moneySend = '';
      this.diceSend = '';
      document.body.classList.add('kepler-closing');
      clearTimeout(this._keplerCloseTimer);this._keplerCloseTimer=setTimeout(()=>{this.active=false;this.syncHubWheel();document.body.classList.remove('kepler-closing');},250);
    },
    emitClose() {
      mp.trigger('target:close');
    },
    openTradePrep() {
      this.panel = 'trade';
    },
    backMenu() {
      this.panel = 'hub';
    },
    openTradeTab() {
      this.panel = 'trade';
    },
    backFromTrade() {
      if (this.tradeActive) {
        mp.trigger('trade:cancel:c');
      }
      this.backMenu();
    },
    resetTradeUi() {
      this.tradeActive = false;
      this.tradePartnerLogin = '';
      this.tradePartnerStatic = 0;
      this.tradeInventorySnapshot = [];
      this.myOfferItems = [];
      this.myOfferMoney = 0;
      this.partnerOfferItems = [];
      this.partnerOfferMoney = 0;
      this.iAmReady = false;
      this.partnerReady = false;
      this.tradeMoneyInput = '';
      if (this.tradeOfferDebounce) {
        clearTimeout(this.tradeOfferDebounce);
        this.tradeOfferDebounce = null;
      }
      this.stackSpankQty = '';
      this.stackAlcoQty = '';
      this.tradeStackSpankAvail = 0;
      this.tradeStackAlcoAvail = 0;
      this.tradeMansionOfferable = false;
      this.panel = 'hub';
    },
    beginTrade(partnerLogin, partnerStatic, invJson) {
      let inv = [];
      try {
        inv = typeof invJson === 'string' ? JSON.parse(invJson) : invJson;
      } catch (e) {
        inv = [];
      }
      if (!Array.isArray(inv)) inv = [];
      this.tradePartnerLogin = partnerLogin;
      this.tradePartnerStatic = partnerStatic;
      this.tradeInventorySnapshot = inv;
      this.myOfferItems = [];
      this.myOfferMoney = 0;
      this.partnerOfferItems = [];
      this.partnerOfferMoney = 0;
      this.iAmReady = false;
      this.partnerReady = false;
      this.tradeMoneyInput = '';
      this.stackSpankQty = '';
      this.stackAlcoQty = '';
      this.tradeStackSpankAvail = 0;
      this.tradeStackAlcoAvail = 0;
      this.tradeMansionOfferable = false;
      this.tradeActive = true;
      this.panel = 'trade';
      this.active = true;
    },
    applyTradeSync(payloadStr) {
      let d;
      try {
        d = typeof payloadStr === 'string' ? JSON.parse(payloadStr) : payloadStr;
      } catch (e) {
        return;
      }
      if (!d) return;
      this.myOfferItems = Array.isArray(d.myItems) ? d.myItems.slice() : [];
      this.myOfferMoney = parseInt(d.myMoney, 10) || 0;
      this.partnerOfferItems = Array.isArray(d.partnerItems) ? d.partnerItems.slice() : [];
      this.partnerOfferMoney = parseInt(d.partnerMoney, 10) || 0;
      this.iAmReady = !!d.myReady;
      this.partnerReady = !!d.partnerReady;
      this.tradeMoneyInput = this.myOfferMoney > 0 ? String(this.myOfferMoney) : '';
      if (d.stackTradeable && typeof d.stackTradeable === 'object') {
        this.tradeStackSpankAvail = parseInt(d.stackTradeable.item_spank, 10) || 0;
        this.tradeStackAlcoAvail = parseInt(d.stackTradeable.item_alco, 10) || 0;
      } else {
        this.tradeStackSpankAvail = 0;
        this.tradeStackAlcoAvail = 0;
      }
      this.tradeMansionOfferable = false;
      if (Array.isArray(d.invSnapshot)) {
        this.tradeInventorySnapshot = d.invSnapshot.slice();
      }
      if (this.tradeActive) {
        this.active = true;
        this.openTradeTab();
      }
    },
    startTrade() {
      const sid = parseInt(this.static, 10);
      if (isNaN(sid)) return;
      mp.trigger('trade:start:c', sid);
      mp.trigger('target:close');
    },
    addOfferItem(item) {
      if (!this.tradeActive || !item) return;
      mp.trigger('trade:addItem:c', item);
    },
    removeOfferItem(idx) {
      if (!this.tradeActive) return;
      mp.trigger('trade:removeItem:c', idx);
    },
    onTradeMoneyInput() {
      if (!this.tradeActive) return;
      const raw = String(this.tradeMoneyInput || '').replace(/\D/g, '');
      this.tradeMoneyInput = raw;
      const self = this;
      if (this.tradeOfferDebounce) clearTimeout(this.tradeOfferDebounce);
      this.tradeOfferDebounce = setTimeout(function () {
        const v = parseInt(raw, 10) || 0;
        mp.trigger('trade:setMoney:c', v);
      }, 400);
    },
    toggleReady() {
      if (!this.tradeActive) return;
      const next = !this.iAmReady;
      mp.trigger('trade:ready:c', next);
    },
    cancelTrade() {
      mp.trigger('trade:cancel:c');
    },
    addStackOffer(base) {
      if (!this.tradeActive) return;
      const raw = base === 'item_spank' ? this.stackSpankQty : this.stackAlcoQty;
      const q = parseInt(String(raw || '').replace(/\D/g, ''), 10) || 0;
      if (q < 1) return;
      mp.trigger('trade:addStack:c', base, q);
    },
    addMansionToTrade() {
      if (!this.tradeActive) return;
      mp.trigger('trade:addMansion:c');
    },
    resetHubStatus() {
      if (this.menuMode === 'vehicle') {
        this.hubStatusTitle = this.vehicleName || 'Транспорт';
        this.hubStatusDesc = this.vehicleLocked ? 'Закрыто' : 'Открыто';
        return;
      }
      if (this.panel === 'pair') {
        this.hubStatusTitle = 'Парные действия';
        this.hubStatusDesc = '#' + this.static + ' · ' + this.login;
        return;
      }
      this.hubStatusTitle = 'Закрыть меню';
      this.hubStatusDesc = '';
    },
    syncHubWheel() {
      const wheel = typeof window !== 'undefined' ? window.tgtHubWheel : null;
      if (!wheel) return;
      if (!this.active || (this.panel !== 'hub' && this.panel !== 'pair')) {
        wheel.destroy();
        return;
      }
      this.resetHubStatus();
      const self = this;
      this.$nextTick(function () {
        wheel.build(self.radialItems, {
          onPick(item) {
            self.onRadialPick(item);
          },
          onHover(title, desc) {
            if (title == null) {
              self.resetHubStatus();
              return;
            }
            self.hubStatusTitle = title;
            self.hubStatusDesc = desc || '';
          },
          onClose() {
            self.emitClose();
          }
        });
      });
    }
  }
});
if (typeof window !== 'undefined') window.targetMenu = targetMenu;
