function SetHUDParams(_0x149C3, _0x147D5, _0x14669, _0x15335) {
  document.getElementById("ServerOnline").innerText = `${_0x149C3}`;
  document.getElementById("PlayerID").innerText = `${_0x147D5}`;
  document.getElementById("PlayerStaticID").innerText = `${_0x14669}`;
  document.getElementById("user-name").innerHTML = `${_0x15335} <b>На проекте с ${RegistrationDate}</b>`;
}
function SetHUDDate(_0x16223) {
  document.getElementById("ServerCurrentDate").innerText = `${_0x16223}`;
}
function ChangeHUDKeysDivDisplay(_0x14683) {
  switch (_0x14683) {
    case "open":
      document.getElementById("HUDKeysDiv").style.display = "flex";
      break;
    case "hide":
      document.getElementById("HUDKeysDiv").style.display = "none";
      break;
  }
}
function ChangeHUDRaitingDisplay(_0x14683) {
  switch (_0x14683) {
    case "open":
      document.getElementById("GameRaiting").style.display = "block";
      break;
    case "hide":
      document.getElementById("GameRaiting").style.display = "none";
      break;
  }
}
function showphone() {}
function hidephone() {}
let bizwarActiveStatus = false;
function ChangeHUDFreeCaseDivDisplay(_0x14683) {
  switch (_0x14683) {
    case "open":
      document.getElementById("FreeCaseTimerDiv").style.display = "flex";
      document.getElementById("GPTimerDiv").style.display = "flex";
      if (bizwarActiveStatus == true) {
        document.getElementById("bizwarNotify").style.display = "block";
      }
      if (newyearcase.showny != 0) {
        document.getElementById("FreeVehFullBlockTimerDiv").style.display = "flex";
      }
      break;
    case "hide":
      document.getElementById("FreeCaseTimerDiv").style.display = "none";
      document.getElementById("GPTimerDiv").style.display = "none";
      document.getElementById("bizwarNotify").style.display = "none";
      if (newyearcase.showny != 0) {
        document.getElementById("FreeVehFullBlockTimerDiv").style.display = "none";
      }
      break;
  }
}
function changeBizwarActiveStatus(_0x13F19) {
  switch (_0x13F19) {
    case "open":
      bizwarActiveStatus = true;
      document.getElementById("bizwarNotify").style.display = "block";
      break;
    default:
      bizwarActiveStatus = false;
      document.getElementById("bizwarNotify").style.display = "none";
      break;
  }
}
function ChangeBonusCaseTime(_0x15265, _0x14FC1) {
  switch (_0x15265) {
    case "finish":
      document.getElementById("BonusCaseTimerDiv").style.display = "none";
      document.getElementById("BonusCaseTimerFinish").style.display = "block";
      break;
    case "change":
      document.getElementById("BonusCaseTimerDiv").style.display = "flex";
      document.getElementById("BonusCaseTimerFinish").style.display = "none";
      document.getElementById("BonusCaseTimer").innerText = `${_0x14FC1}`;
      break;
  }
}
function ChangeChangeGPBonus(_0x15265, _0x14FC1) {
  switch (_0x15265) {
    case "finish":
      document.getElementById("BonusGPTimerDiv").style.display = "none";
      document.getElementById("BonusGPTimerFinish").style.display = "block";
      break;
    case "change":
      document.getElementById("BonusGPTimerDiv").style.display = "flex";
      document.getElementById("BonusGPTimerFinish").style.display = "none";
      document.getElementById("BonusGPTimer").innerText = `${_0x14FC1}`;
      break;
  }
}
function ChangeFreeVehTime(_0x15265, _0x14FC1) {
  switch (_0x15265) {
    case "finish":
      document.getElementById("FreeVehTimerDiv").style.display = "none";
      document.getElementById("freeVehResultFinish").style.display = "block";
      break;
    case "change":
      document.getElementById("FreeVehTimerDiv").style.display = "flex";
      document.getElementById("freeVehResultFinish").style.display = "none";
      document.getElementById("FreeVehTimer").innerText = `${_0x14FC1}`;
      break;
  }
}
function changeHBPrizeTime(_0x15265, _0x14FC1) {
  switch (_0x15265) {
    case "finish":
      document.getElementById("HBPrizeTimeDiv").innerHTML = `<p>Приз получен.</p>`;
      document.getElementById("GlxyHBTimerDiv").style.display = "none";
      document.getElementById("GlxyHBResultFinish").style.display = "block";
      break;
    case "change":
      let _0x154BB = GetHBPrizeTime(_0x14FC1);
      document.getElementById("HBLeftHours").innerText = _0x154BB[0];
      document.getElementById("HBLeftMins").innerText = _0x154BB[1];
      let _0x154D5 = GetCaseTime(_0x14FC1);
      document.getElementById("GlxyHBTimerDiv").style.display = "flex";
      document.getElementById("GlxyHBResultFinish").style.display = "none";
      document.getElementById("GlxyHBTimerDef").innerText = `${_0x154D5}`;
      break;
  }
}
function GetCaseTime(_0x14FC1) {
  let _0x159CF = "0";
  let _0x159E9 = `${_0x14FC1}`;
  let _0x1599B;
  let _0x159B5;
  let _0x15967 = _0x159E9 / 60 | 0;
  let _0x15981 = _0x159E9 % 60;
  if (_0x159E9 >= 60) {
    _0x1599B = _0x15967;
    if (_0x15981 <= 9) {
      _0x159B5 = "0" + _0x15981;
    } else {
      _0x159B5 = _0x15981;
    }
    _0x159CF = _0x1599B + ":" + _0x159B5;
  } else {
    if (_0x15981 <= 9) {
      _0x159B5 = "0" + _0x15981;
    } else {
      _0x159B5 = _0x15981;
    }
    _0x159CF = "0:" + _0x159B5;
  }
  return _0x159CF;
}
function GetHBPrizeTime(_0x14FC1) {
  let _0x159CF = "0";
  let _0x15A9F = "0";
  let _0x159E9 = `${_0x14FC1}`;
  let _0x1599B;
  let _0x159B5;
  let _0x15967 = _0x159E9 / 60 | 0;
  let _0x15981 = _0x159E9 % 60;
  if (_0x159E9 >= 60) {
    _0x1599B = _0x15967;
    if (_0x15981 <= 9) {
      _0x159B5 = "0" + _0x15981;
    } else {
      _0x159B5 = _0x15981;
    }
    _0x159CF = _0x1599B;
    _0x15A9F = _0x159B5;
  } else {
    if (_0x15981 <= 9) {
      _0x159B5 = "0" + _0x15981;
    } else {
      _0x159B5 = _0x15981;
    }
    _0x159CF = "0";
    _0x15A9F = _0x159B5;
  }
  return [parseInt(_0x159CF), parseInt(_0x15A9F)];
}
var AllPlayerAmmo = 0;
function UpdateAmmo(_0x16B13, _0x16AF9) {
  AllPlayerAmmo = parseInt(_0x16AF9);
  document.getElementById("WeaponAmmoCount").innerText = `${_0x16B13} / ${_0x16AF9}`;
}
function UpdateAmmoInClip(_0x16B13) {
  document.getElementById("WeaponAmmoCount").innerText = `${_0x16B13} / ${AllPlayerAmmo}`;
}
function changeAmmoDisplay(_0x13F19) {
  switch (_0x13F19) {
    case "open":
      document.getElementById("WeaponAmmoCountDiv").style.display = "flex";
      break;
    case "close":
      document.getElementById("WeaponAmmoCountDiv").style.display = "none";
      break;
  }
}
function OpenGangwarDeathDiv(_0x14FC1) {
  document.getElementById("SpawnAfterDeathBtn").style.display = "none";
  document.getElementById("SpawnAfterDeathBtn").disabled = true;
  document.getElementById("SpawnAfterDeathBtnEMS").style.display = "none";
  document.getElementById("SpawnAfterDeathBtnEMS").disabled = true;
  document.getElementById("GangwarDeathTimerText").innerText = _0x14FC1;
  document.getElementById("GangwarDeathTimer").style.display = "flex";
  document.getElementById("GangwarDeathTimerTextEMS").innerText = _0x14FC1;
  document.getElementById("GangwarDeathTimerEMS").style.display = "flex";
  startGangwarDeathTimer(_0x14FC1);
  document.getElementById("PlayerDeathDiv").style.display = "block";
}
function CloseGangwarDeathDiv() {
  if (deathtimer != null) {
    clearInterval(deathtimer);
    deathtimer = null;
  }
  document.getElementById("PlayerDeathDiv").style.display = "none";
}
var deathtimer = null;
function startGangwarDeathTimer(_0x14FC1) {
  if (deathtimer != null) {
    clearInterval(deathtimer);
    deathtimer = null;
  }
  let _0x169DB = parseInt(_0x14FC1) - 2;
  let _0x169C1 = parseInt(_0x14FC1);
  document.getElementById("GangwarDeathTimerText").innerText = _0x169C1;
  document.getElementById("GangwarDeathTimerTextEMS").innerText = _0x169DB;
  deathtimer = setInterval(() => {
    if (_0x169DB > 1) {
      _0x169DB--;
      document.getElementById("GangwarDeathTimerTextEMS").innerText = _0x169DB;
    } else {
      document.getElementById("GangwarDeathTimerEMS").style.display = "none";
      document.getElementById("SpawnAfterDeathBtnEMS").style.display = "block";
      document.getElementById("SpawnAfterDeathBtnEMS").disabled = false;
    }
    if (_0x169C1 > 1) {
      _0x169C1--;
      document.getElementById("GangwarDeathTimerText").innerText = _0x169C1;
    } else {
      document.getElementById("GangwarDeathTimer").style.display = "none";
      document.getElementById("SpawnAfterDeathBtn").style.display = "block";
      document.getElementById("SpawnAfterDeathBtn").disabled = false;
      clearInterval(deathtimer);
      deathtimer = null;
    }
  }, 1000);
}
function insertGameTop(_0x15D43, _0x15D77, _0x15D91) {
  var _0x15D5D = document.getElementById("GameRaiting");
  _0x15D5D.innerHTML = `
    <h3>Stats</h3>
    <p>${_0x15D43}</p>
    <p>${_0x15D77}</p>
    <p>${_0x15D91}</p>`;
}
function ChangeMenuDisplay(_0x13F19) {
  switch (_0x13F19) {
    case "Open":
      document.getElementById("main-tab-content").style.display = "block";
      break;
    case "Close":
      document.getElementById("main-tab-content").style.display = "none";
      break;
  }
}
function SetDPBalance(_0x144E3) {
  for (let _0x14377 = 1; _0x14377 < 17; _0x14377++) {
    document.getElementById(`DPBalance${_0x14377}`).innerText = `${parseInt(_0x144E3).toDivideNum()}`;
  }
}
function SetNumberOfPlayersInModes(_0x16751, _0x1676B, _0x16785, _0x16737, _0x166CF, _0x1671D, _0x16703, _0x166E9, _0x1669B, _0x166B5) {
  document.getElementById("RevDM1Count").innerText = `${_0x16751}`;
  document.getElementById("RevDM2Count").innerText = `${_0x1676B}`;
  document.getElementById("RevDM3Count").innerText = `${_0x16785}`;
  document.getElementById("PdwDMCount").innerText = `${_0x16737}`;
  document.getElementById("CarbineDMCount").innerText = `${_0x166CF}`;
  document.getElementById("MinigamesCount").innerText = `${_0x1671D}`;
  document.getElementById("GunGameCount").innerText = `${_0x16703}`;
  document.getElementById("GhettoWarCount").innerText = `${_0x166E9}`;
  document.getElementById("AFKZoneCount").innerText = `${_0x1669B}`;
  document.getElementById("BattleRoyaleCount").innerText = `${_0x166B5}`;
}
var FractionData = [{
  Name: "Нет фракции (Перейдите в раздел Фракции и выберите фракцию)",
  Img: "img/FracNonfrac.png"
}, {
  Name: "Ballas Gang",
  Img: "img/FracBallas.png"
}, {
  Name: "The Families",
  Img: "img/FracTheFamilies.png"
}, {
  Name: "Bloods Gang",
  Img: "img/FracBloodsGang.png"
}, {
  Name: "LS Vagos",
  Img: "img/FracLSVagos.png"
}, {
  Name: "Marabunta",
  Img: "img/FracMarabunta.png"
}, {
  Name: "FIB",
  Img: "img/capture/FIB.svg"
}];
function MenuTabSetFraction(_0x1524B) {
  var _idx = parseInt(_0x1524B, 10);
  if (isNaN(_idx) || _idx < 0) {
    _idx = 0;
  }
  if (_idx >= FractionData.length) {
    _idx = FractionData.length - 1;
  }
  for (let _0x137C9 = 1; _0x137C9 < FractionData.length; _0x137C9++) {
    var _pickBtn = document.getElementById(`FractionPickBtn${_0x137C9}`);
    if (!_pickBtn) {
      continue;
    }
    if (_0x137C9 == _idx) {
      _pickBtn.innerText = "Текущая";
      _pickBtn.disabled = true;
    } else {
      _pickBtn.innerText = "Вступить";
      _pickBtn.disabled = false;
    }
  }
  var _fd = FractionData[_idx];
  if (!_fd) {
    return;
  }
  var _el = document.getElementById("CurrentGangwarFraction");
  if (!_el) {
    return;
  }
  var _playMode = _idx === 6 ? "fib" : "crime";
  _el.innerHTML = `<img src="${_fd.Img}" alt="">
    <hr>
    <p>${_fd.Name}</p>
    <button type="button" name="button" onclick="mp.trigger('PlayGangwar', '${_playMode}');">Играть</button>`;
}
var GangwarWeaponShopItems = [{
  Name: "Heavy Sniper MKII",
  BuyFormIndex: 7,
  Type: "Оружие",
  ImgBG: "img/boxes/weapon_heavysniper_mk2.png",
  ImgMain: "img/boxes/weapon_heavysniper_mk2.png",
  Price: "2000",
  HrefTab: "#product-info"
}];
var GangwarClothesShopItems = [];
var VEHICLE_PREVIEW_BASE = 'package://browsers/vehicle_previews/';
var GangwarVehicleShopItems = [{
  Name: "BMW i8",
  BuyFormIndex: 11,
  Type: "Транспорт",
  ImgBG: VEHICLE_PREVIEW_BASE + "i8.png",
  ImgMain: VEHICLE_PREVIEW_BASE + "i8.png",
  Price: "350",
  HrefTab: "#product-info"
}, {
  Name: "812 Superfast",
  BuyFormIndex: 12,
  Type: "Транспорт",
  ImgBG: VEHICLE_PREVIEW_BASE + "812superfast.png",
  ImgMain: VEHICLE_PREVIEW_BASE + "812superfast.png",
  Price: "550",
  HrefTab: "#product-info"
}, {
  Name: "BMW M5",
  BuyFormIndex: 13,
  Type: "Транспорт",
  ImgBG: VEHICLE_PREVIEW_BASE + "2019m5.png",
  ImgMain: VEHICLE_PREVIEW_BASE + "2019m5.png",
  Price: "450",
  HrefTab: "#product-info"
}, {
  Name: "Agera RS",
  BuyFormIndex: 14,
  Type: "Транспорт",
  ImgBG: VEHICLE_PREVIEW_BASE + "agerars.png",
  ImgMain: VEHICLE_PREVIEW_BASE + "agerars.png",
  Price: "800",
  HrefTab: "#product-info"
}, {
  Name: "Бусик ТЦ",
  BuyFormIndex: 15,
  Type: "Транспорт",
  ImgBG: VEHICLE_PREVIEW_BASE + "alphard.png",
  ImgMain: VEHICLE_PREVIEW_BASE + "alphard.png",
  Price: "200",
  HrefTab: "#product-info"
}, {
  Name: "AMG ONE",
  BuyFormIndex: 16,
  Type: "Транспорт",
  ImgBG: VEHICLE_PREVIEW_BASE + "amgone1.png",
  ImgMain: VEHICLE_PREVIEW_BASE + "amgone1.png",
  Price: "600",
  HrefTab: "#product-info"
}, {
  Name: "Aston DB11",
  BuyFormIndex: 17,
  Type: "Транспорт",
  ImgBG: VEHICLE_PREVIEW_BASE + "astondb11.png",
  ImgMain: VEHICLE_PREVIEW_BASE + "astondb11.png",
  Price: "500",
  HrefTab: "#product-info"
}, {
  Name: "Battista",
  BuyFormIndex: 18,
  Type: "Транспорт",
  ImgBG: VEHICLE_PREVIEW_BASE + "battista.png",
  ImgMain: VEHICLE_PREVIEW_BASE + "battista.png",
  Price: "575",
  HrefTab: "#product-info"
}, {
  Name: "BMW iX",
  BuyFormIndex: 19,
  Type: "Транспорт",
  ImgBG: VEHICLE_PREVIEW_BASE + "bmwix.png",
  ImgMain: VEHICLE_PREVIEW_BASE + "bmwix.png",
  Price: "350",
  HrefTab: "#product-info"
}, {
  Name: "Ferrari 458",
  BuyFormIndex: 20,
  Type: "Транспорт",
  ImgBG: VEHICLE_PREVIEW_BASE + "fera458.png",
  ImgMain: VEHICLE_PREVIEW_BASE + "fera458.png",
  Price: "520",
  HrefTab: "#product-info"
}, {
  Name: "Koenigsegg Gemera",
  BuyFormIndex: 21,
  Type: "Транспорт",
  ImgBG: VEHICLE_PREVIEW_BASE + "gemera.png",
  ImgMain: VEHICLE_PREVIEW_BASE + "gemera.png",
  Price: "700",
  HrefTab: "#product-info"
}, {
  Name: "Lada Raven 2021",
  BuyFormIndex: 22,
  Type: "Транспорт",
  ImgBG: "img/car/2021ladaraven.png",
  ImgMain: "img/car/2021ladaraven.png",
  Price: "600",
  HrefTab: "#product-info"
}];
// Транспорт перенесён в обычный автосалон. Не рендерим F2-каталог.
GangwarVehicleShopItems = [];
var PrivilegeShopItems = [{
  Name: "VIP-PLATINUM",
  BuyFormIndex: 0,
  Type: "Привилегия",
  ImgBG: "img/vip_platinum.png",
  ImgMain: "img/vip_platinum.png",
  Price: "199",
  HrefTab: "#product-info"
}, {
  Name: "VIP-SILVER",
  BuyFormIndex: 1,
  Type: "Привилегия",
  ImgBG: "img/vip_silver.png",
  ImgMain: "img/vip_silver.png",
  Price: "99",
  HrefTab: "#product-info"
}, {
  Name: "VIP-BRONZE",
  BuyFormIndex: 2,
  Type: "Привилегия",
  ImgBG: "img/vip_bronze.png",
  ImgMain: "img/vip_bronze.png",
  Price: "49",
  HrefTab: "#product-info"
}, {
  Name: "Личный префикс",
  BuyFormIndex: null,
  Type: "Привилегия",
  ImgBG: "img/shop-prefix.svg",
  ImgMain: "img/shop-prefix.svg",
  Price: "399",
  HrefTab: "#product-info5"
}, {
  Name: "Смена логина",
  BuyFormIndex: null,
  Type: "Привилегия",
  ImgBG: "img/shop-identity.svg",
  ImgMain: "img/shop-identity.svg",
  Price: "199",
  HrefTab: "#product-info6"
}];
var GangwarOtherShopItems = [{
  Name: "Игровая валюта",
  BuyFormIndex: null,
  Type: "Валюта",
  ImgBG: "img/productMoney1.png",
  ImgMain: "img/productMoney2.png",
  Price: "1",
  HrefTab: "#product-info3"
}, {
  Name: "Скейтборд",
  BuyFormIndex: 24,
  Type: "Предмет",
  ImgBG: "img/skateborde.png",
  ImgMain: "img/skateborde.png",
  Price: "400",
  HrefTab: "#product-info"
}, {
  Name: "Трубка Bong",
  BuyFormIndex: 22,
  Type: "Предмет",
  ImgBG: "img/bong.png",
  ImgMain: "img/bong.png",
  Price: "200",
  HrefTab: "#product-info"
}, {
  Name: "Дрон",
  BuyFormIndex: 23,
  Type: "Предмет",
  ImgBG: "img/drone.png",
  ImgMain: "img/drone.png",
  Price: "500",
  HrefTab: "#product-info"
}, {
  Name: "Термокружка",
  BuyFormIndex: 25,
  Type: "Алко-резист 240 сек",
  ImgBG: "img/thermos.png",
  ImgMain: "img/thermos.png",
  Price: "300",
  HrefTab: "#product-info"
}];
var ItemsBuyForm = [{
  Name: "PLATINUM VIP",
  isVeh: false,
  isDonateClothes: false,
  Description: "VIP статус действует 31 день со дня покупки.|Преимущества:|-Возможность зайти на FIB|-Респавн после смерти 5 секунд|-Возрождение на месте смерти|-спавн транспорта вне территории фракции|-возможность одевать 100% бронежилет|-X2$ за убийства|-X2$ к дропу|-X2$ к payday|VIP - в чате перед ником",
  ImgBG: "img/vip_platinum.png",
  Price: "199",
  DonateCategory: "Privilege",
  BuyTrigger: "PlatinumVIP",
  vehModel: null
}, {
  Name: "SILVER VIP",
  isVeh: false,
  isDonateClothes: false,
  Description: "VIP статус действует 31 день со дня покупки.|Преимущества:|-Возможность зайти на FIB|-Респавн после смерти 10 секунд|-спавн транспорта вне территории фракции|-X1.5$ за убийства|-X1.5$ к дропу|-X1.5$ к payday|VIP - в чате перед ником",
  ImgBG: "img/vip_silver.png",
  Price: "99",
  DonateCategory: "Privilege",
  BuyTrigger: "SilverVIP",
  vehModel: null
}, {
  Name: "BRONZE VIP",
  isVeh: false,
  isDonateClothes: false,
  Description: "VIP статус действует 31 день со дня покупки.|Преимущества:|-Возможность зайти на FIB|-Респавн после смерти 15 секунд|-X1.25$ за убийства|-X1.25$ к дропу|-X1.25$ к payday|VIP - в чате перед ником",
  ImgBG: "img/vip_bronze.png",
  Price: "49",
  DonateCategory: "Privilege",
  BuyTrigger: "BronzeVIP",
  vehModel: null
}, {
  Name: "Черная кобура",
  isVeh: false,
  isDonateClothes: true,
  Description: "Черная кобура для GANGWAR режима.|Описание:|-Покупается навсегда|-После покупки предмет в инвентаре|-Надеть и снять только через инвентарь (I)",
  ImgBG: "img/clothes/cobura.png",
  Price: "2.500",
  DonateCategory: "Clothes",
  BuyTrigger: "cobura",
  vehModel: null
}, {
  Name: "Белая кобура",
  isVeh: false,
  isDonateClothes: true,
  Description: "Белая кобура для GANGWAR режима.|Описание:|-Покупается навсегда|-После покупки предмет в инвентаре|-Надеть и снять только через инвентарь (I)",
  ImgBG: "img/clothes/coburaw.png",
  Price: "2.500",
  DonateCategory: "Clothes",
  BuyTrigger: "coburaw",
  vehModel: null
}, {
  Name: "Sniper Rifle",
  isVeh: false,
  isDonateClothes: false,
  Description: "Снято с продажи.",
  ImgBG: "img/weapon_sniperrifle.png",
  Price: "—",
  DonateCategory: "Weapon",
  BuyTrigger: "weapon_sniperrifle",
  vehModel: null,
  shopDisabled: true
}, {
  Name: "Heavy Sniper MK1 (С тепловизором)",
  isVeh: false,
  isDonateClothes: false,
  Description: "Снято с продажи.",
  ImgBG: "img/svc.png",
  Price: "—",
  DonateCategory: "Weapon",
  BuyTrigger: "weapon_svc",
  vehModel: null,
  shopDisabled: true
}, {
  Name: "Heavy Sniper MKII",
  isVeh: false,
  isDonateClothes: false,
  Description: "Heavy Sniper MKII для GANGWAR режима.|Описание:|-Стоимость: 2000 DP|-После покупки оружие добавляется в инвентарь|-В случае потери оружия оно исчезает|-Можно выбрасывать и продавать",
   ImgBG: "img/boxes/weapon_heavysniper_mk2.png",
   Price: "2000",
   DonateCategory: "Weapon",
   BuyTrigger: "weapon_heavysniper_mk2",
  vehModel: null
}, {
  Name: "Marksman Rifle",
  isVeh: false,
  isDonateClothes: false,
  Description: "Снято с продажи.",
  ImgBG: "img/weapon_marksmanrifle.png",
  Price: "—",
  DonateCategory: "Weapon",
  BuyTrigger: "weapon_marksmanrifle",
  vehModel: null,
  shopDisabled: true
}, {
  Name: "Precision Rifle",
  isVeh: false,
  isDonateClothes: false,
  Description: "Снято с продажи.",
  ImgBG: "../inventory/img/weapon_precisionrifle.png",
  Price: "—",
  DonateCategory: "Weapon",
  BuyTrigger: "weapon_precisionrifle",
  vehModel: null,
  shopDisabled: true
}, {
  Name: "BMW i8",
  isVeh: true,
  isDonateClothes: false,
  Description: "BMW i8 для GANGWAR режима.|Описание:|-Транспорт добавляется в гараж навсегда",
  ImgBG: VEHICLE_PREVIEW_BASE + "i8.png",
  Price: "350",
  DonateCategory: "Vehicles",
  BuyTrigger: "i8",
  vehModel: "i8"
}, {
  Name: "812 Superfast",
  isVeh: true,
  isDonateClothes: false,
  Description: "812 Superfast для GANGWAR режима.|Описание:|-Транспорт добавляется в гараж навсегда",
  ImgBG: VEHICLE_PREVIEW_BASE + "812superfast.png",
  Price: "550",
  DonateCategory: "Vehicles",
  BuyTrigger: "812superfast",
  vehModel: "812superfast"
}, {
  Name: "BMW M5",
  isVeh: true,
  isDonateClothes: false,
  Description: "BMW M5 для GANGWAR режима.|Описание:|-Транспорт добавляется в гараж навсегда",
  ImgBG: VEHICLE_PREVIEW_BASE + "2019m5.png",
  Price: "450",
  DonateCategory: "Vehicles",
  BuyTrigger: "2019m5",
  vehModel: "2019m5"
}, {
  Name: "Agera RS",
  isVeh: true,
  isDonateClothes: false,
  Description: "Agera RS для GANGWAR режима.|Описание:|-Транспорт добавляется в гараж навсегда",
  ImgBG: VEHICLE_PREVIEW_BASE + "agerars.png",
  Price: "800",
  DonateCategory: "Vehicles",
  BuyTrigger: "agerars",
  vehModel: "agerars"
}, {
  Name: "Бусик ТЦ",
  isVeh: true,
  isDonateClothes: false,
  Description: "Toyota Alphard для GANGWAR режима.|Описание:|-Транспорт добавляется в гараж навсегда",
  ImgBG: VEHICLE_PREVIEW_BASE + "alphard.png",
  Price: "200",
  DonateCategory: "Vehicles",
  BuyTrigger: "alphard",
  vehModel: "alphard"
}, {
  Name: "AMG ONE",
  isVeh: true,
  isDonateClothes: false,
  Description: "AMG ONE для GANGWAR режима.|Описание:|-Транспорт добавляется в гараж навсегда",
  ImgBG: VEHICLE_PREVIEW_BASE + "amgone1.png",
  Price: "600",
  DonateCategory: "Vehicles",
  BuyTrigger: "amgone1",
  vehModel: "amgone1"
}, {
  Name: "Aston DB11",
  isVeh: true,
  isDonateClothes: false,
  Description: "Aston Martin DB11 для GANGWAR режима.|Описание:|-Транспорт добавляется в гараж навсегда",
  ImgBG: VEHICLE_PREVIEW_BASE + "astondb11.png",
  Price: "500",
  DonateCategory: "Vehicles",
  BuyTrigger: "astondb11",
  vehModel: "astondb11"
}, {
  Name: "Battista",
  isVeh: true,
  isDonateClothes: false,
  Description: "Pininfarina Battista для GANGWAR режима.|Описание:|-Транспорт добавляется в гараж навсегда",
  ImgBG: VEHICLE_PREVIEW_BASE + "battista.png",
  Price: "575",
  DonateCategory: "Vehicles",
  BuyTrigger: "battista",
  vehModel: "battista"
}, {
  Name: "BMW iX",
  isVeh: true,
  isDonateClothes: false,
  Description: "BMW iX для GANGWAR режима.|Описание:|-Транспорт добавляется в гараж навсегда",
  ImgBG: VEHICLE_PREVIEW_BASE + "bmwix.png",
  Price: "350",
  DonateCategory: "Vehicles",
  BuyTrigger: "bmwix",
  vehModel: "bmwix"
}, {
  Name: "Ferrari 458",
  isVeh: true,
  isDonateClothes: false,
  Description: "Ferrari 458 для GANGWAR режима.|Описание:|-Транспорт добавляется в гараж навсегда",
  ImgBG: VEHICLE_PREVIEW_BASE + "fera458.png",
  Price: "520",
  DonateCategory: "Vehicles",
  BuyTrigger: "fera458",
  vehModel: "fera458"
}, {
  Name: "Koenigsegg Gemera",
  isVeh: true,
  isDonateClothes: false,
  Description: "Koenigsegg Gemera для GANGWAR режима.|Описание:|-Транспорт добавляется в гараж навсегда",
  ImgBG: VEHICLE_PREVIEW_BASE + "gemera.png",
  Price: "700",
  DonateCategory: "Vehicles",
  BuyTrigger: "gemera",
  vehModel: "gemera"
}, {
  Name: "Lada Raven 2021",
  isVeh: true,
  isDonateClothes: false,
  Description: "Lada Raven 2021 для GANGWAR режима.|Описание:|-Транспорт добавляется в гараж навсегда",
  ImgBG: "img/car/2021ladaraven.png",
  Price: "600",
  DonateCategory: "Vehicles",
  BuyTrigger: "2021ladaraven",
  vehModel: "2021ladaraven"
}, {
  Name: "Трубка Bong",
  isVeh: false,
  isDonateClothes: false,
  Description: "Усиливает Spank — резист 240 сек|Трубка навсегда, расходуется только Spank|Нужен Spank в инвентаре|Можно положить на склад семьи/фракции|Можно продать, передать, выкинуть",
  ImgBG: "img/bong.png",
  Price: "200",
  DonateCategory: "GangwarOthers",
  BuyTrigger: "BongPipe",
  vehModel: null
}, {
  Name: "Дрон",
  isVeh: false,
  isDonateClothes: false,
  Description: "Управляемый дрон с камерой|Использовать из инвентаря|WASD — полёт, Space/Ctrl — вверх/вниз|F6/F7 — ночь/тепло, Backspace — выключить|Сессия до 2 мин, КД 30 мин|Можно положить на склад семьи/фракции|Можно продать, передать, выкинуть",
  ImgBG: "img/drone.png",
  Price: "500",
  DonateCategory: "GangwarOthers",
  BuyTrigger: "DroneSystem",
  vehModel: null
}, {
  Name: "Скейтборд",
  isVeh: false,
  isDonateClothes: false,
  Description: "Скейтборд для GANGWAR режима.|Описание:|-Покупается навсегда (400 DP)|-Уникальная раскраска deck (livery 0–10)|-После покупки предмет в инвентаре|-«Использовать» — взять в руки, F — сесть|-W разгон, A/D поворот, Пробел прыжок|-Раскраска сохраняется при обмене и продаже",
  ImgBG: "img/skateborde.png",
  Price: "400",
  DonateCategory: "GangwarOthers",
  BuyTrigger: "skateboard",
  vehModel: null
}, {
  Name: "Термокружка",
  isVeh: false,
  isDonateClothes: false,
   Description: "Пить Медовуху через термокружку — алко-резист 240 сек|Кружка навсегда, расходуется только Медовуха|Нужна Медовуха в инвентаре|Можно положить на склад семьи/фракции|Можно продать, передать, выкинуть",
  ImgBG: "img/thermos.png",
  Price: "300",
  DonateCategory: "GangwarOthers",
  BuyTrigger: "ThermosMug",
  vehModel: null
}];

function isRublesShopItem(item) {
  if (!item || typeof item !== "object") return false;
  if (item.isRublesOnly === true || item.priceCurrency === "RUB") return true;
  const price = String(item.Price || "");
  return /₽|руб/i.test(price);
}

const RUBLES_SHOP_DISCORD_LS = "https://flowdm.fun/donate";
let _rublesShopCopyBtnResetTimer = null;

function fallbackCopyTextToClipboard(str) {
  const ta = document.createElement("textarea");
  ta.value = str;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-2000px";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch (_e) {}
  document.body.removeChild(ta);
}

function copyTextToClipboard(str) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    return navigator.clipboard.writeText(str).catch(function () {
      fallbackCopyTextToClipboard(str);
    });
  }
  fallbackCopyTextToClipboard(str);
  return Promise.resolve();
}

function copyRublesShopDiscord(trigger) {
  copyTextToClipboard(RUBLES_SHOP_DISCORD_LS).then(function () {
    const btn = document.getElementById("rublesShopCopyBtn");
    if (btn) {
      const prev = btn.textContent || "Скопировать Discord";
      btn.textContent = "Ссылка скопирована!";
      btn.disabled = true;
      clearTimeout(_rublesShopCopyBtnResetTimer);
      _rublesShopCopyBtnResetTimer = setTimeout(function () {
        btn.textContent = prev;
        btn.disabled = false;
      }, 2200);
    }
    if (typeof mp !== "undefined" && mp.trigger) {
      mp.trigger("rublesShopDiscordCopied", String(trigger || ""));
    }
  });
}

if (typeof window !== "undefined") {
  window.copyRublesShopDiscord = copyRublesShopDiscord;
  window.copyThermosMugDiscord = function () {
    copyRublesShopDiscord("ThermosMug");
  };
}

function shopItemPriceHtml(item) {
  if (isRublesShopItem(item)) {
    const price = String(item.Price || "").trim();
    return `<h3>${price}</h3>`;
  }
  return `<h3>${item.Price}</h3><p><b> DP</b></p>`;
}

function shopItemBuyButtonHtml(item) {
  const cat = item.DonateCategory;
  const trigger = item.BuyTrigger;
  if (isRublesShopItem(item)) {
    return `<button type="button" onclick="DonateBuyItem('${cat}','${trigger}',null)" name="button" class="buy">Купить за ${String(item.Price || "").trim()} (сайт)</button>`;
  }
  return `<button type="button" onclick="DonateBuyItem('${cat}','${trigger}',null)" name="button" class="buy">Приобрести</button>`;
}

function shopListPriceHtml(item) {
  if (isRublesShopItem(item)) {
    return `<p class="product-price"><b>${item.Price}</b></p>`;
  }
  return `<p class="product-price"><b>${item.Price}</b> DP</p>`;
}

function ShopItemBuyForm(_0x16925) {
  if (_0x16925 == null || _0x16925 == "null" || _0x16925 == undefined) {
    return;
  }
  const shopItem = ItemsBuyForm[parseInt(_0x16925)];
  var _0x1693F = "";
  var _0x1690B = shopItem.Description.split("|");
  for (let _0x137C9 = 0; _0x137C9 < _0x1690B.length; _0x137C9++) {
    _0x1693F = `${_0x1693F}<p>${_0x1690B[_0x137C9]}</p>`;
  }
  let _0x16959 = "";
    if (shopItem.isVeh == true) {
    _0x16959 = `<br><button type="button" name="button" onclick="mp.trigger('DonateVehicleTestDrive','${shopItem.vehModel}')" class="buy">Тест-драйв</button>`;
    if (shopItem.DonateCategory === "Vehicles" && !isRublesShopItem(shopItem)) {
      _0x16959 += `<br><button type="button" name="button" onclick="DonateBuyItem('Vehicles','${shopItem.BuyTrigger}','family')" class="buy" style="margin-top:8px;border-color:#3a4048;background:#26292e;">Купить для семьи</button>`;
    }
  }
  if (shopItem.isDonateClothes == true) {
    _0x16959 =
      '<br><p style="color:rgba(232,232,232,0.62);margin:12px 0 0;font-size:13px;line-height:1.5;max-width:420px;">Купить и экипировать предмет можно через инвентарь (клавиша I), не выходя из игры.</p>';
  }
  if (isRublesShopItem(shopItem)) {
    _0x16959 +=
      '<br><p style="color:rgba(232,232,232,0.62);margin:12px 0 0;font-size:13px;line-height:1.5;max-width:420px;">Оплата только в рублях. Сайт: <b>flowdm.fun/donate</b>. DP не списываются.</p>';
  }
  const _rublesOnlyItem = isRublesShopItem(shopItem);
  document.querySelectorAll("#product-info .balance, #product-info2 .balance, #product-info3 .balance").forEach(function (el) {
    el.style.display = _rublesOnlyItem ? "none" : "";
  });
  const _previewBlock = `<img src="${shopItem.ImgBG}">`;
  document.getElementById("VIPVehicleProductBlock").innerHTML = `
    ${_previewBlock}
    <div class="product-info-left-content">
      <h3>${shopItem.Name}</h3><br>
      ${_0x1693F}
      <div class="product-info-price">
        ${shopItemPriceHtml(shopItem)}
      </div>
      ${shopItemBuyButtonHtml(shopItem)}
      ${_0x16959}
      </div>
    `;
}
function updateCoburaProduct(coburaId, countThis, hasThisType) {
  const el = document.getElementById("coburaCount");
  const btn = document.getElementById("coburaSellBtn");
  const count = (countThis === undefined || countThis === null || isNaN(countThis)) ? 0 : Math.min(Number(countThis), 2);
  const hasIt = (hasThisType === undefined || hasThisType === null || isNaN(hasThisType)) ? 0 : Number(hasThisType);
  if (el) el.innerText = "У вас: " + count + " из 2 шт";
  if (btn) btn.style.display = hasIt > 0 ? "block" : "none";
}
if (typeof window !== 'undefined') window.updateCoburaProduct = updateCoburaProduct;
function DonateBuyItem(_0x15779, _0x15793, _0x14447) {
  if (_0x15779 == undefined || _0x15779 == null || _0x15779 == "null") {
    return;
  }
  if (_0x15793 == undefined || _0x15793 == null || _0x15793 == "null") {
    return;
  }
  mp.trigger("DonateBuyItem", _0x15779, _0x15793, _0x14447);
}
function changeDPtoGGMoney() {
  if (parseInt(document.getElementById(`DPtoMoneyInput`).value) <= 0) {
    return fastemsg("Введите положительное число.");
  }
  mp.trigger("obmendpm", parseInt(document.getElementById(`DPtoMoneyInput`).value));
}
function DonateBuyPromoCode() {
  mp.trigger("DonateBuyPromo", document.getElementById(`donateOwnPromocode`).value);
}
function isShopSingleImageItem(item) {
  if (!item || typeof item !== "object") return false;
  const imgBg = String(item.ImgBG || "");
  const imgMain = String(item.ImgMain || imgBg);
  if (!imgMain) return false;
  if (imgBg === imgMain) return true;
  if (/skateborde|bong\.png|drone\.png|thermos\.png|product_prefix|productChangelogin|vip_platinum|vip_silver|vip_bronze/i.test(imgMain)) return true;
  const href = String(item.HrefTab || "");
  if (href === "#product-info5" || href === "#product-info6") return true;
  return false;
}

function shopProductCardExtraClass(item) {
  let cls = "";
  if (isShopSingleImageItem(item)) cls += " product--single-img";
  if (String(item.ImgMain || item.ImgBG || "").indexOf("skateborde") >= 0) cls += " product--skate";
  return cls;
}

function shopProductImgStackHtml(item) {
  const imgBg = item.ImgBG || "";
  const imgMain = item.ImgMain || imgBg;
  const skateImgCls = String(imgMain).indexOf("skateborde") >= 0 ? " img--skate" : "";
  if (isShopSingleImageItem(item)) {
    return `<div class="product-img-stack product-img-stack--single"><img src="${imgMain}" class="shop-img1${skateImgCls}" alt=""></div>`;
  }
  return `<div class="product-img-stack"><img src="${imgBg}" class="shop-img1${skateImgCls}" alt=""><img src="${imgMain}" class="shop-img2${skateImgCls}" alt=""></div>`;
}

function shopProductPreviewHtml(item) {
  const tone=/platinum/i.test(item.Name)?'platinum':/silver/i.test(item.Name)?'silver':/bronze/i.test(item.Name)?'bronze':'neutral';
  return '<div class="legacy-product-visual" data-tone="'+tone+'">'+shopProductImgStackHtml(item)+'</div>';
}
function shopEscape(text){return String(text||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function shopPrivilegeSummary(item){
 const data=item.BuyFormIndex!=null?ItemsBuyForm[Number(item.BuyFormIndex)]:null;
 const rows=data?data.Description.split('|').filter(line=>line.charAt(0)==='-').slice(0,3):[item.HrefTab==='#product-info5'?'Собственный префикс в чате':'Новое имя вашего персонажа'];
 return '<ul class="legacy-product-benefits">'+rows.map(line=>'<li>'+shopEscape(line.replace(/^-/,''))+'</li>').join('')+'</ul>';
}

function addItemsInGangwarShop() {
  for (let _0x137C9 = 0; _0x137C9 < GangwarVehicleShopItems.length; _0x137C9++) {
    const _vehItem = GangwarVehicleShopItems[_0x137C9];
    const _vehList = document.getElementById("GangwarShopVehicleList");
    if (!_vehList) continue;
    _vehList.innerHTML += `
        <a data-toggle="tab" href="${_vehItem.HrefTab}" onclick="ShopItemBuyForm(${_vehItem.BuyFormIndex})" class = "product${shopProductCardExtraClass(_vehItem)}">
        ${shopProductPreviewHtml(_vehItem)}
        <hr>
        <div class="product-info">
        <p class="product-name">${_vehItem.Name}</p>
        <p class="product-category">${_vehItem.Type}</p>
        ${shopListPriceHtml(_vehItem)}
        </div>
        </a>
        `;
  }
  for (let _0x137C9 = 0; _0x137C9 < GangwarOtherShopItems.length; _0x137C9++) {
    const _gwItem = GangwarOtherShopItems[_0x137C9];
    document.getElementById("GangwarShopList").innerHTML += `
        <a data-toggle="tab" href="${_gwItem.HrefTab}" onclick="ShopItemBuyForm(${_gwItem.BuyFormIndex})" class = "product${shopProductCardExtraClass(_gwItem)}">
        ${shopProductPreviewHtml(_gwItem)}
        <hr>
        <div class="product-info">
        <p class="product-name">${_gwItem.Name}</p>
        <p class="product-category">${_gwItem.Type}</p>
        ${shopListPriceHtml(_gwItem)}
        </div>
        </a>
        `;
  }
  for (let _0x137C9 = 0; _0x137C9 < PrivilegeShopItems.length; _0x137C9++) {
    const _privItem = PrivilegeShopItems[_0x137C9];
    document.getElementById("PrivilegeShopList").innerHTML += `
        <a data-toggle="tab" href="${_privItem.HrefTab}" onclick="ShopItemBuyForm(${_privItem.BuyFormIndex})" class = "product${shopProductCardExtraClass(_privItem)}">
        ${shopProductPreviewHtml(_privItem)}
        <hr>
        <div class="product-info">
          <p class="product-name">${_privItem.Name}</p>
          <p class="product-category">${_privItem.Type}</p>
          ${shopPrivilegeSummary(_privItem)}
          <div class="legacy-product-footer"><p class="product-price"><b>${_privItem.Price}</b> DP</p><span class="legacy-product-cta">Подробнее <span aria-hidden="true">↗</span></span></div>
        </div>
        </a>
        `;
  }
  for (let _0x137C9 = 0; _0x137C9 < GangwarWeaponShopItems.length; _0x137C9++) {
    const _weaponItem = GangwarWeaponShopItems[_0x137C9];
    document.getElementById("WeaponShopList").innerHTML += `
        <a data-toggle="tab" href="${_weaponItem.HrefTab}" onclick="ShopItemBuyForm(${_weaponItem.BuyFormIndex})" class = "product${shopProductCardExtraClass(_weaponItem)}">
        ${shopProductPreviewHtml(_weaponItem)}
        <hr>
        <div class="product-info">
          <p class="product-name">${_weaponItem.Name}</p>
          <p class="product-category">${_weaponItem.Type}</p>
          ${shopListPriceHtml(_weaponItem)}
        </div>
        </a>
        `;
  }
}
function shopMono(name) {
  var s = String(name || "").trim();
  if (!s) return "◆";
  var first = s.match(/\S/);
  return first ? first[0].toUpperCase() : "◆";
}
var FractionConfirmData = [{
  Name: "None",
  img: null
}, {
  Name: "The Ballas Gang",
  img: "img/product_ballas.png"
}, {
  Name: "The Families",
  img: "img/product_families.png"
}, {
  Name: "Bloods Gang",
  img: "img/product_bloods.png"
}, {
  Name: "Los Santos Vagos",
  img: "img/product_lsvagos.png"
}, {
  Name: "Marabunta Grande",
  img: "img/product_marabunta.png"
}, {
  Name: "Federal Investigation Bureau (FIB)",
  img: "img/capture/FIB.svg"
}];
function ConfirmChangeFraction(_0x1565B) {
  document.getElementById("ComfirmNewFractionDiv").innerHTML = `
    <img src="${FractionConfirmData[parseInt(_0x1565B)].img}">
    <div class="product-info-left-content">
      <h3>${FractionConfirmData[parseInt(_0x1565B)].Name}</h3><br>
      <p>Подтверждение выбора фракции</p>
      <p>После выбора этой фракции вы не сможете сменить фракцию в течение 4 дней.</p>
      <button type="button" name="button" onclick="GangwarNewFraction(${_0x1565B})" class="buy">Выбрать</button>
    </div>
    `;
}
function GangwarNewFraction(_0x1565B) {
  mp.trigger("selectfraction", _0x1565B);
}
var RegistrationDate = "XX.XX.XXXX";
function setRegistrationDate(_0x16223) {
  if (_0x16223 != null && _0x16223 != undefined) {
    regdateSplit = _0x16223.split("-");
    let _0x168A3 = regdateSplit[2].split("T");
    let _0x16889 = _0x168A3[1].split(".");
    RegistrationDate = `${_0x168A3[0]}.${regdateSplit[1]}.${regdateSplit[0]} | ${_0x16889[0]}`;
  }
}
function InputChangesCheck(_0x15B89) {
  switch (_0x15B89) {
    case "DPChange":
      var _0x15301 = document.getElementById("DPtoMoneyInput");
      var _0x15B55 = document.getElementById("DPtoMoneyInput").value;
      _0x15301.value = _0x15B55.replace(/[^\d]/g, "");
      let _0x15B6F = parseInt(_0x15B55.replace(/[^\d]/g, "")) * 1000;
      document.getElementById("DPtoMoneyResult").innerText = `Сумма на выходе: ${parseInt(_0x15B6F).toDivideNum()}$`;
      break;
    case "PlateNumberInput":
      var _0x15301 = document.getElementById("NewLoginInput");
      var _0x15B55 = _0x15301.value;
      _0x15301.value = _0x15B55.replace(/[\W_]/g, "");
      break;
    case "NewLoginInput":
      var _0x15D29 = document.getElementById("NewLoginInput");
      var _0x15C59 = _0x15D29.value;
      _0x15D29.value = _0x15C59.replace(/[\W_]/g, "");
      break;
    case "NewLoginRepeat":
      var _0x15CF5 = document.getElementById("RepeatNewLoginInput");
      var _0x15C25 = _0x15CF5.value;
      _0x15CF5.value = _0x15C25.replace(/[\W_]/g, "");
      break;
    case "NewLoginInputDonate":
      var _0x15D0F = document.getElementById("NewLoginInputDonate");
      var _0x15C3F = _0x15D0F.value;
      _0x15D0F.value = _0x15C3F.replace(/[\W_]/g, "");
      break;
    case "Promocode":
      var _0x15CC1 = document.getElementById("donateOwnPromocode");
      var _0x15BD7 = _0x15CC1.value;
      _0x15CC1.value = _0x15BD7.replace(/[^a-zA-Z0-9]/g, "");
      break;
    case "newprefix":
      var _0x15CA7 = document.getElementById("newprefix");
      var _0x15BD7 = _0x15CA7.value;
      _0x15CA7.value = _0x15BD7.replace(/[^a-zA-Zа-яА-Я0-9\s]/g, "");
      break;
    case "lobbyChat":
      var _0x15BA3 = document.getElementById("lobbyChatInput");
      var _0x15BBD = _0x15BA3.value;
      var _0x15B21 = _0x15BBD.replace(/[^a-z0-9A-ZА-Яа-я\D]/gi, "");
      var _0x15B3B = _0x15B21.replace(/[\\]/gi, "");
      const _0x15C0B = /["`'<>{}&]/g;
      var _0x15C8D = _0x15B3B.replace(_0x15C0B, "");
      _0x15BA3.value = _0x15C8D;
      break;
    case "DuelTargetID":
      var _0x14A5F = document.getElementById("DuelTargetID");
      var _0x15C73 = _0x14A5F.value;
      _0x14A5F.value = _0x15C73.replace(/[^0-9]/g, "");
      break;
    case "PlateNumber":
      var _0x15301 = document.getElementById("PlateNumberInput");
      var _0x15B55 = _0x15301.value;
      _0x15301.value = _0x15B55.replace(/[\W_]/g, "");
      break;
    case "RouletteMoneyBetInput":
      var _0x15301 = document.getElementById("RouletteMoneyBetInput");
      var _0x15B55 = document.getElementById("RouletteMoneyBetInput").value;
      _0x15301.value = _0x15B55.replace(/[^\d]/g, "");
      break;
    case "familyBuyName":
      var _0x15CA7 = document.getElementById("familyBuyName").value.replace(/[^a-zA-Z0-9\s]/g, "");
      document.getElementById("familyBuyName").value = _0x15CA7.replace(/\s+/g, " ");
      break;
    case "familyChangeRankInput":
      document.getElementById("familyChangeRankInput").value = document.getElementById("familyChangeRankInput").value.replace(/[^\d]/g, "");
      break;
    case "FamilyInviteTargetID":
      document.getElementById("FamilyInviteTargetID").value = document.getElementById("FamilyInviteTargetID").value.replace(/[^\d]/g, "");
      break;
    case "InputVehSellForTarget":
      document.getElementById("InputVehSellForTarget").value = document.getElementById("InputVehSellForTarget").value.replace(/[^\d]/g, "");
      break;
    case "InputHouseSellForTarget":
      document.getElementById("InputHouseSellForTarget").value = document.getElementById("InputHouseSellForTarget").value.replace(/[^\d]/g, "");
      break;
  }
}
let interriorType = 1;
function buyFamily(_0x13F19) {
  if (document.getElementById("familyBuyName").length <= 2) {
    return emsg("Минимальная длина названия семьи 2 символа");
  }
  if (document.getElementById("familyBuyName").length >= 18) {
    return emsg("Максимальная длина названия семьи 17 символов");
  }
  mp.trigger("Client:BuyFamily", _0x13F19, document.getElementById("familyBuyName").value, interriorType);
}
function PlayerChangeLogin(_0x13F19) {
  switch (_0x13F19) {
    case "donate":
      var _0x16153 = document.getElementById("NewLoginInputDonate").value;
      mp.trigger("PlayerChangeLoginDonate", _0x16153);
      break;
    default:
      var _0x16139 = document.getElementById("NewLoginInput").value;
      mp.trigger("PlayerChangeLoginFree", _0x16139);
      break;
  }
}
function PlayerChangePlateNumber() {
  var _0x1616D = document.getElementById("PlateNumberInput").value;
  if (_0x1616D.length <= 0) {
    return emsg("Номер должен состоять минимум из 1 символа.");
  }
  if (_0x1616D.length >= 8) {
    return emsg("Номер должен состоять максимум из 7 символов.");
  }
  if (_0x1616D.length >= 8 || _0x1616D == null || _0x1616D == undefined || _0x1616D == "" || _0x1616D == " ") {
    return emsg("Вы не ввели номер.");
  }
  mp.trigger("PlayerChangePlateNumberDonate", _0x1616D);
}
function ChangeVehHud(_0x15571) {
  switch (_0x15571) {
    case 0:
      document.getElementById("VehicleSpeedBlock").style.display = "none";
      document.getElementById("VehicleSpeedIcons").style.display = "none";
      break;
    case 1:
      document.getElementById("VehicleSpeedBlock").style.display = "block";
      document.getElementById("VehicleSpeedIcons").style.display = "flex";
      break;
    default:
      break;
  }
}
function ChangeVehSpeed(_0x1560D, _0x155D9, _0x155F3) {
  document.getElementById("VehicleSpeedText").innerText = parseInt(_0x1560D);
  switch (_0x155D9) {
    case "true":
      document.getElementById("VehicleSpeedIcons").style.border = "1px solid #31C02E";
      break;
    case "false":
      document.getElementById("VehicleSpeedIcons").style.border = "1px solid #fc0000";
      break;
  }
  switch (parseInt(_0x155F3)) {
    case 1:
      document.getElementById("VehicleLockIcon").style.border = "1px solid #31C02E";
      break;
    case 2:
      document.getElementById("VehicleLockIcon").style.border = "1px solid #fc0000";
      break;
  }
}
function UpdateBalance(_0x144E3) {
  document.getElementById("GangwarPlayerBalanceText").innerText = parseInt(_0x144E3).toDivideNum();
}
function ChangeGangwarHud(_0x13F19) {
  switch (_0x13F19) {
    case "open":
      document.getElementById("GangwarBalanceVehHUD").style.display = "block";
      break;
    case "close":
      document.getElementById("GangwarBalanceVehHUD").style.display = "none";
      break;
  }
}
function ChangeMainBlockHUD(_0x13F19) {
  switch (_0x13F19) {
    case "open":
      document.getElementById("mainBlockHUD").style.display = "flex";
      break;
    case "close":
      document.getElementById("mainBlockHUD").style.display = "none";
      break;
  }
}
function ChangeMicrophone(_0x15571) {
  switch (parseInt(_0x15571)) {
    case 0:
      document.getElementById("GangwarIconMicrophone").classList.remove("active");
      break;
    case 1:
      document.getElementById("GangwarIconMicrophone").classList.add("active");
      break;
  }
}
var RentVehicleData = [{
  Name: "Komoda",
  lvl: 1
}, {
  Name: "Massacro",
  lvl: 3
}, {
  Name: "Revolter",
  lvl: 4
}, {
  Name: "Kuruma",
  lvl: 5
}, {
  Name: "Specter2",
  lvl: 6
}, {
  Name: "Toros",
  lvl: 7
}, {
  Name: "GP1",
  lvl: 8
}, {
  Name: "Pfister811",
  lvl: 9
}, {
  Name: "Italigto",
  lvl: 10
}, {
  Name: "Pariah",
  lvl: 1
}, {
  Name: "Raiden",
  lvl: 3
}, {
  Name: "xa21",
  lvl: 4
}, {
  Name: "T20",
  lvl: 5
}, {
  Name: "Elegy2",
  lvl: 6
}, {
  Name: "Toros",
  lvl: 7
}, {
  Name: "Dominator3",
  lvl: 8
}, {
  Name: "baller6",
  lvl: 1
}, {
  Name: "xls2",
  lvl: 1
}, {
  Name: "fbi2",
  lvl: 1
}, {
  Name: "fbi",
  lvl: 1
}];
function SpawnRentVehicle(name) {
  mp.trigger("SpawnRentVehicle", name);
}
function changeGunGameDisplay(_0x13F19) {
  switch (_0x13F19) {
    case "open":
      document.getElementById("mini-game").style.display = "block";
      break;
    case "close":
      document.getElementById("mini-game").style.display = "none";
      if (GunGameTimeInterval != null) {
        clearInterval(GunGameTimeInterval);
        GunGameTimeInterval = null;
      }
      break;
  }
}
var GunGameTimeInterval = null;
function changeGunGameInfo(_0x1546D, _0x154A1, _0x15487) {
  document.getElementById("GunGamePlayerCount").innerText = `${_0x1546D}`;
  let _0x14FC1 = getGunGameWriteTime(_0x154A1);
  document.getElementById("GunGameWriteTime").innerText = `${_0x14FC1}`;
  document.getElementById("GunGamePrize").innerText = `${_0x15487}`;
  let _0x14FDB = parseInt(_0x154A1);
  if (GunGameTimeInterval != null) {
    clearInterval(GunGameTimeInterval);
    GunGameTimeInterval = null;
  }
  GunGameTimeInterval = setInterval(() => {
    _0x14FDB--;
    document.getElementById("GunGameWriteTime").innerText = `${getGunGameWriteTime(_0x14FDB)}`;
    if (_0x14FDB <= 0) {
      clearInterval(GunGameTimeInterval);
      GunGameTimeInterval = null;
    }
  }, 1000);
}
function changeGunGameCounts(_0x1546D, _0x15487) {
  document.getElementById("GunGamePlayerCount").innerText = `${_0x1546D}`;
  document.getElementById("GunGamePrize").innerText = `${_0x15487}`;
}
function getGunGameWriteTime(_0x14FC1) {
  let _0x159CF = "0";
  let _0x159E9 = `${_0x14FC1}`;
  let _0x1599B;
  let _0x159B5;
  let _0x15967 = _0x159E9 / 60 | 0;
  let _0x15981 = _0x159E9 % 60;
  if (_0x159E9 >= 60) {
    _0x1599B = `0${_0x15967}`;
    if (_0x15981 <= 9) {
      _0x159B5 = "0" + _0x15981;
    } else {
      _0x159B5 = _0x15981;
    }
    _0x159CF = _0x1599B + ":" + _0x159B5;
  } else {
    if (_0x15981 <= 9) {
      _0x159B5 = "0" + _0x15981;
    } else {
      _0x159B5 = _0x15981;
    }
    _0x159CF = "00:" + _0x159B5;
  }
  return _0x159CF;
}
function moscowTime() {
  var _0x1594D = new Date();
  _0x1594D.setHours(_0x1594D.getHours() + 3, _0x1594D.getMinutes() + _0x1594D.getTimezoneOffset());
  getterh = _0x1594D.getHours();
  getterm = _0x1594D.getMinutes();
  if (getterh >= 0 && getterh <= 9) {
    getterh = "0" + getterh;
  }
  if (getterm >= 0 && getterm <= 9) {
    getterm = "0" + getterm;
  }
  var _0x15F7F = document.getElementById("ServerCurrentTime");
  _0x15F7F.innerText = `${getterh}:${getterm} `;
}
Number.prototype.toDivideNum = function () {
  var _0x137E3 = String(Math.trunc(this));
  if (_0x137E3.length <= 3) {
    return _0x137E3;
  }
  var _0x13817 = 0;
  var _0x137FD = "";
  for (var _0x137C9 = _0x137E3.length - 1; _0x137C9 >= 0; _0x137C9--) {
    if (_0x13817 == 3) {
      _0x137FD = "." + _0x137FD;
      _0x13817 = 0;
    }
    _0x137FD = _0x137E3.charAt(_0x137C9) + _0x137FD;
    _0x13817++;
  }
  return _0x137FD;
};
function changeGangwarShopDisplay(_0x13F19, _0x1534F) {
  switch (_0x13F19) {
    case "open":
      document.getElementById(`${_0x1534F}`).style.display = "block";
      break;
    case "close":
      document.getElementById(`${_0x1534F}`).style.display = "none";
      break;
  }
}
var GangwarGunShopItems = [{
  Name: "FLOW USP",
  PriceCrime: 3000,
  PriceFib: 3000,
  GameItemID: 30,
  ItemCategory: 2,
  img: "img/gangwarShop/GALAXYUSP.png",
  hide: false
}, {
  Name: "FLOW Glock",
  PriceCrime: 3000,
  PriceFib: 3000,
  GameItemID: 29,
  ItemCategory: 2,
  img: "img/gangwarShop/GALAXYGlock.png",
  hide: false
}, {
  Name: "Бронежилет (100%)",
  PriceCrime: 400,
  PriceFib: 140,
  GameItemID: 1,
  ItemCategory: 1,
  img: "img/gangwarShop/armour.png",
  hide: false
}, {
  Name: "Бронежилет (50%)",
  PriceCrime: 120,
  PriceFib: 120,
  GameItemID: 2,
  ItemCategory: 1,
  img: "img/gangwarShop/armour.png",
  hide: false
}, {
  Name: "Heavy Shotgun",
  PriceCrime: 3000,
  PriceFib: 3000,
  GameItemID: 3,
  ItemCategory: 2,
  img: "img/gangwarShop/HeavyShotgun.png",
  hide: false
}, {
  Name: "Mini SMG",
  PriceCrime: 2500,
  PriceFib: 2500,
  GameItemID: 4,
  ItemCategory: 2,
  img: "img/gangwarShop/GusenbergSweeper.png",
  hide: false
}, {
  Name: "Carbine Rifle",
  PriceCrime: 350,
  PriceFib: 350,
  GameItemID: 5,
  ItemCategory: 2,
  img: "img/gangwarShop/CarbineRifle.png",
  hide: false
}, {
  Name: "Combat PDW",
  PriceCrime: 300,
  PriceFib: 300,
  GameItemID: 6,
  ItemCategory: 2,
  img: "img/gangwarShop/CombatPDW.png",
  hide: false
}, {
  Name: "Assault Rifle",
  PriceCrime: 350,
  PriceFib: 350,
  GameItemID: 7,
  ItemCategory: 2,
  img: "img/gangwarShop/AssaultRifle.png",
  hide: false
}, {
  Name: "Revolver MK2",
  PriceCrime: 250000,
  PriceFib: 250000,
  GameItemID: 8,
  ItemCategory: 2,
  img: "img/gangwarShop/RevolverMK2.png",
  hide: false
}, {
  Name: "Assault SMG",
  PriceCrime: 2500,
  PriceFib: 2500,
  GameItemID: 10,
  ItemCategory: 2,
  img: "img/gangwarShop/AssaultSMG.png",
  hide: false
}, {
  Name: "SMG",
  PriceCrime: 800,
  PriceFib: 800,
  GameItemID: 11,
  ItemCategory: 2,
  img: "img/gangwarShop/SMG.png",
  hide: false
}, {
  Name: "SMG MK2",
  PriceCrime: 325,
  PriceFib: 325,
  GameItemID: 12,
  ItemCategory: 2,
  img: "img/gangwarShop/SMGMK2.png",
  hide: false
}, {
  Name: "Assault Shotgun",
  PriceCrime: 10000,
  PriceFib: 10000,
  GameItemID: 13,
  ItemCategory: 2,
  img: "img/gangwarShop/AssaultShotgun.png",
  hide: false
}, {
  Name: "Advanced Rifle",
  PriceCrime: 5600,
  PriceFib: 5600,
  GameItemID: 14,
  ItemCategory: 2,
  img: "img/gangwarShop/AdvancedRifle.png",
  hide: false
}, {
  Name: "Special Carbine",
  PriceCrime: 5000,
  PriceFib: 5000,
  GameItemID: 15,
  ItemCategory: 2,
  img: "img/gangwarShop/SpecialCarbine.png",
  hide: false
}, {
  Name: "Military Rifle",
  PriceCrime: 3400,
  PriceFib: 3400,
  GameItemID: 16,
  ItemCategory: 2,
  img: "img/gangwarShop/MilitaryRifle.png",
  hide: false
}, {
  Name: "Sniper Rifle",
  PriceCrime: 999999999,
  PriceFib: 999999999,
  GameItemID: 17,
  ItemCategory: 2,
  img: "img/gangwarShop/SniperRifle.png",
  hide: true
}, {
  Name: "Compact Rifle",
  PriceCrime: 310,
  PriceFib: 310,
  GameItemID: 18,
  ItemCategory: 2,
  img: "img/gangwarShop/CompactRifle.png",
  hide: false
}];
var GangwarDeafultShopItems = [{
  Name: "Лотерейный билет",
  PriceCrime: 250,
  PriceFib: 30,
  GameItemID: 21,
  ItemCategory: 2,
  img: "img/gangwarShop/Lottery.png",
  hide: false
}, {
  Name: "4 лотерейных билета",
  PriceCrime: 1000,
  PriceFib: 1000,
  GameItemID: 22,
  ItemCategory: 2,
  img: "img/gangwarShop/Lottery.png",
  hide: false
}, {
  Name: "10 лотерейных билетов",
  PriceCrime: 2500,
  PriceFib: 2500,
  GameItemID: 23,
  ItemCategory: 2,
  img: "img/gangwarShop/Lottery.png",
  hide: false
}, {
  Name: "50 лотерейных билетов",
  PriceCrime: 12500,
  PriceFib: 12500,
  GameItemID: 24,
  ItemCategory: 2,
  img: "img/gangwarShop/Lottery.png",
  hide: false
}, {
  Name: "Медовуха",
  PriceCrime: 800,
  PriceFib: 800,
  GameItemID: 26,
  ItemCategory: 1,
  img: "../hud/images/med.png",
  hide: false
}, {
  Name: "Ремонтный набор",
  PriceCrime: 150,
  PriceFib: 150,
  GameItemID: 27,
  ItemCategory: 1,
  img: "img/gangwarShop/repairKit.png",
  hide: false
}, {
  Name: "Спанк",
  PriceCrime: 1000,
  PriceFib: 1000,
  GameItemID: 34,
  ItemCategory: 1,
  img: "../inventory/img/item_spank.png",
  hide: false
}];
var GangwarAdrenalineShopItems = [{
  Name: "Адреналин",
  PriceCrime: 250,
  PriceFib: 250,
  GameItemID: 25,
  ItemCategory: 1,
  img: "img/gangwarShop/Adrenaline.png",
  hide: false
}];
var GangwarBarShopItems = [{
  Name: "Медовуха",
  PriceCrime: 800,
  PriceFib: 800,
  GameItemID: 26,
  ItemCategory: 1,
  img: "../hud/images/med.png",
  hide: false
}];
var NPCBuyingUpItemslist = [{
  Name: "Heavy Shotgun",
  PriceCrime: 900,
  PriceFib: 900,
  GameItemID: 1,
  ItemCategory: 2,
  img: "img/gangwarShop/HeavyShotgun.png",
  hide: false
}, {
  Name: "Mini SMG",
  PriceCrime: 1650,
  PriceFib: 1650,
  GameItemID: 2,
  ItemCategory: 2,
  img: "img/gangwarShop/GusenbergSweeper.png",
  hide: false
}, {
  Name: "Carbine Rifle",
  PriceCrime: 105,
  PriceFib: 105,
  GameItemID: 3,
  ItemCategory: 2,
  img: "img/gangwarShop/CarbineRifle.png",
  hide: false
}, {
  Name: "Combat PDW",
  PriceCrime: 90,
  PriceFib: 90,
  GameItemID: 4,
  ItemCategory: 2,
  img: "img/gangwarShop/CombatPDW.png",
  hide: false
}, {
  Name: "Assault Rifle",
  PriceCrime: 105,
  PriceFib: 105,
  GameItemID: 5,
  ItemCategory: 2,
  img: "img/gangwarShop/AssaultRifle.png",
  hide: false
}, {
  Name: "Revolver MK2",
  PriceCrime: 15000,
  PriceFib: 15000,
  GameItemID: 6,
  ItemCategory: 2,
  img: "img/gangwarShop/RevolverMK2.png",
  hide: false
}, {
  Name: "Combat MG",
  PriceCrime: 60000,
  PriceFib: 60000,
  GameItemID: 7,
  ItemCategory: 2,
  img: "img/gangwarShop/CombatMG.png",
  hide: false
}, {
  Name: "Assault SMG",
  PriceCrime: 750,
  PriceFib: 750,
  GameItemID: 8,
  ItemCategory: 2,
  img: "img/gangwarShop/AssaultSMG.png",
  hide: false
}, {
  Name: "SMG",
  PriceCrime: 240,
  PriceFib: 240,
  GameItemID: 9,
  ItemCategory: 2,
  img: "img/gangwarShop/SMG.png",
  hide: false
}, {
  Name: "SMG MK2",
  PriceCrime: 97,
  PriceFib: 97,
  GameItemID: 10,
  ItemCategory: 2,
  img: "img/gangwarShop/SMGMK2.png",
  hide: false
}, {
  Name: "Assault Shotgun",
  PriceCrime: 1050,
  PriceFib: 1050,
  GameItemID: 11,
  ItemCategory: 2,
  img: "img/gangwarShop/AssaultShotgun.png",
  hide: false
}, {
  Name: "Advanced Rifle",
  PriceCrime: 1680,
  PriceFib: 1680,
  GameItemID: 12,
  ItemCategory: 2,
  img: "img/gangwarShop/AdvancedRifle.png",
  hide: false
}, {
  Name: "Special Carbine",
  PriceCrime: 96,
  PriceFib: 96,
  GameItemID: 13,
  ItemCategory: 2,
  img: "img/gangwarShop/SpecialCarbine.png",
  hide: false
}, {
  Name: "Military Rifle",
  PriceCrime: 1020,
  PriceFib: 1020,
  GameItemID: 14,
  ItemCategory: 2,
  img: "img/gangwarShop/MilitaryRifle.png",
  hide: false
}, {
  Name: "Compact Rifle",
  PriceCrime: 93,
  PriceFib: 93,
  GameItemID: 15,
  ItemCategory: 2,
  img: "img/gangwarShop/CompactRifle.png",
  hide: false
}];
var PlayerCurrentFraction = "crime";
function setPlayerShopsFraction(_0x1565B) {
  PlayerCurrentFraction = _0x1565B;
}
function addItemsIngangwarShops() {
  document.getElementById("armour-shop-weaponlist").innerHTML = "";
  for (let _0x137C9 = 0; _0x137C9 < GangwarGunShopItems.length; _0x137C9++) {
    if (GangwarGunShopItems[_0x137C9].hide == false) {
      let _0x14EF1;
      switch (PlayerCurrentFraction) {
        case "crime":
          _0x14EF1 = GangwarGunShopItems[_0x137C9].PriceCrime.toDivideNum();
          break;
        case "fib":
          _0x14EF1 = GangwarGunShopItems[_0x137C9].PriceFib.toDivideNum();
          break;
      }
      let _0x14F0B = `
        <div class="shops-item">
        <div class="shops-item-img">
          <img src="${GangwarGunShopItems[_0x137C9].img}">
        </div>
        <p>${GangwarGunShopItems[_0x137C9].Name}</p>
        <p class="shops-item-price"><a>${_0x14EF1}</a> $</p>
        <button type="button" name="button" onclick="mp.trigger('gangwarShopBuyItem','${GangwarGunShopItems[_0x137C9].GameItemID}')">Приобрести</button>
        </div>`;
      if (GangwarGunShopItems[_0x137C9].ItemCategory == 1) {
        document.getElementById("armour-shop-armourlist").innerHTML += _0x14F0B;
      } else if (GangwarGunShopItems[_0x137C9].ItemCategory == 2) {
        document.getElementById("armour-shop-weaponlist").innerHTML += _0x14F0B;
      }
    }
  }
  for (let _0x137C9 = 0; _0x137C9 < GangwarDeafultShopItems.length; _0x137C9++) {
    if (GangwarDeafultShopItems[_0x137C9].hide == false) {
      let _0x14EF1;
      switch (PlayerCurrentFraction) {
        case "crime":
          _0x14EF1 = GangwarDeafultShopItems[_0x137C9].PriceCrime.toDivideNum();
          break;
        case "fib":
          _0x14EF1 = GangwarDeafultShopItems[_0x137C9].PriceFib.toDivideNum();
          break;
      }
      let _0x14F0B = `
        <div class="shops-item">
        <div class="shops-item-img">
          <img src="${GangwarDeafultShopItems[_0x137C9].img}">
        </div>
        <p>${GangwarDeafultShopItems[_0x137C9].Name}</p>
        <p class="shops-item-price"><a>${_0x14EF1}</a> $</p>
        <button type="button" name="button" onclick="mp.trigger('gangwarShopBuyItem','${GangwarDeafultShopItems[_0x137C9].GameItemID}')">Приобрести</button>
        </div>`;
      if (GangwarDeafultShopItems[_0x137C9].ItemCategory == 1) {
        document.getElementById("different-shop-medicslist").innerHTML += _0x14F0B;
      } else if (GangwarDeafultShopItems[_0x137C9].ItemCategory == 2) {
        document.getElementById("different-shop-lotterylist").innerHTML += _0x14F0B;
      }
    }
  }
  for (let _0x137C9 = 0; _0x137C9 < GangwarAdrenalineShopItems.length; _0x137C9++) {
    if (GangwarAdrenalineShopItems[_0x137C9].hide == false) {
      let _0x14EF1;
      switch (PlayerCurrentFraction) {
        case "crime":
          _0x14EF1 = GangwarAdrenalineShopItems[_0x137C9].PriceCrime.toDivideNum();
          break;
        case "fib":
          _0x14EF1 = GangwarAdrenalineShopItems[_0x137C9].PriceFib.toDivideNum();
          break;
      }
      let _0x14F0B = `
        <div class="shops-item">
        <div class="shops-item-img">
          <img src="${GangwarAdrenalineShopItems[_0x137C9].img}">
        </div>
        <p>${GangwarAdrenalineShopItems[_0x137C9].Name}</p>
        <p class="shops-item-price"><a>${_0x14EF1}</a> $</p>
        <button type="button" name="button" onclick="mp.trigger('gangwarShopBuyItem','${GangwarAdrenalineShopItems[_0x137C9].GameItemID}')">Приобрести</button>
        </div>`;
      document.getElementById("medicines-shop-adrenalinlist").innerHTML += _0x14F0B;
    }
  }
  for (let _0x137C9 = 0; _0x137C9 < NPCBuyingUpItemslist.length; _0x137C9++) {
    if (NPCBuyingUpItemslist[_0x137C9].hide == false) {
      let _0x14EF1;
      switch (PlayerCurrentFraction) {
        case "crime":
          _0x14EF1 = NPCBuyingUpItemslist[_0x137C9].PriceCrime.toDivideNum();
          break;
        case "fib":
          _0x14EF1 = NPCBuyingUpItemslist[_0x137C9].PriceFib.toDivideNum();
          break;
      }
      let _0x14F0B = `
        <div class="shops-item">
        <div class="shops-item-img">
          <img src="${NPCBuyingUpItemslist[_0x137C9].img}">
        </div>
        <p>${NPCBuyingUpItemslist[_0x137C9].Name}</p>
        <p class="shops-item-price"><a>${_0x14EF1}</a> $</p>
        <button type="button" name="button" onclick="mp.trigger('gangwarNPCBuyingUpItem','${NPCBuyingUpItemslist[_0x137C9].GameItemID}')">Продать</button>
        </div>`;
      document.getElementById("NPC-BuyingUp-Itemslist").innerHTML += _0x14F0B;
    }
  }
}
function changeCaptureTimerDisplay(_0x13F19) {
  switch (_0x13F19) {
    case "open":
      document.getElementById("CaptureTimerMainDiv").style.display = "block";
      break;
    case "close":
      document.getElementById("CaptureTimerMainDiv").style.display = "none";
      if (gangwarCaptureTimeInterval != null) {
        clearInterval(gangwarCaptureTimeInterval);
        gangwarCaptureTimeInterval = null;
      }
      break;
  }
}
var gangwarCaptureTimeInterval = null;
function setCaptureTimeInterval(_0x14FA7) {
  let _0x14FC1 = getGangwarCaptureTime(_0x14FA7);
  let _0x14FDB = parseInt(_0x14FA7);
  document.getElementById("CaptureTimerTimeLeft").innerText = `${getGangwarCaptureTime(_0x14FDB)}`;
  if (gangwarCaptureTimeInterval != null) {
    clearInterval(gangwarCaptureTimeInterval);
    gangwarCaptureTimeInterval = null;
  }
  gangwarCaptureTimeInterval = setInterval(() => {
    _0x14FDB--;
    document.getElementById("CaptureTimerTimeLeft").innerText = `${getGangwarCaptureTime(_0x14FDB)}`;
    if (_0x14FDB <= 0) {
      clearInterval(gangwarCaptureTimeInterval);
      gangwarCaptureTimeInterval = null;
      document.getElementById("CaptureTimerMainDiv").style.display = "none";
    }
  }, 1000);
}
function setCaptureTimerImagePints(_0x163C3, _0x163F7, _0x163DD, _0x16411) {
  if (_0x163C3 == null) {
    return;
  }
  document.getElementById("CaptureTimerLeftName").innerText = _0x163C3;
  document.getElementById("CaptureTimerRightName").innerHTML = _0x163F7;
  document.getElementById("CaptureTimerLeftBlur").style.background = `${getFractionImageByName(_0x163C3)[1]}`;
  document.getElementById("CaptureTimerRightBlur").style.background = `${getFractionImageByName(_0x163F7)[1]}`;
  document.getElementById("CaptureTimerLeftPoints").innerText = _0x163DD;
  document.getElementById("CaptureTimerRightPoints").innerText = _0x16411;
}
function setBizwarTimerImagePints(_0x163C3, _0x163F7, _0x163DD, _0x16411) {
  if (_0x163C3 == null) {
    return;
  }
  document.getElementById("CaptureTimerLeftName").innerText = _0x163C3;
  document.getElementById("CaptureTimerRightName").innerHTML = _0x163F7;
  document.getElementById("CaptureTimerLeftBlur").style.background = `#f00909`;
  document.getElementById("CaptureTimerRightBlur").style.background = `#098df0`;
  document.getElementById("CaptureTimerLeftPoints").innerText = _0x163DD;
  document.getElementById("CaptureTimerRightPoints").innerText = _0x16411;
}
function SetMinigamesTimerImages(_0x163C3, _0x163F7, _0x163DD, _0x16411) {
  if (_0x163C3 == null) {
    return;
  }
  document.getElementById("CaptureTimerLeftName").innerText = _0x163C3;
  document.getElementById("CaptureTimerRightName").innerHTML = _0x163F7;
  document.getElementById("CaptureTimerLeftBlur").style.background = `#098df0`;
  document.getElementById("CaptureTimerRightBlur").style.background = `#0f0f0f`;
  document.getElementById("CaptureTimerLeftPoints").innerText = _0x163DD;
  document.getElementById("CaptureTimerRightPoints").innerText = _0x16411;
}
function setCaptureTimerPoints(_0x163DD, _0x16411) {
  document.getElementById("CaptureTimerLeftPoints").innerText = _0x163DD;
  document.getElementById("CaptureTimerRightPoints").innerText = _0x16411;
}
function getGangwarCaptureTime(_0x15A1D) {
  var _0x15A37 = ~~(_0x15A1D / 3600);
  var _0x15A51 = ~~(_0x15A1D % 3600 / 60);
  var _0x15A85 = ~~_0x15A1D % 60;
  var _0x15A6B = "";
  if (_0x15A37 > 0) {
    _0x15A6B += "" + _0x15A37 + ":" + (_0x15A51 < 10 ? "0" : "");
  }
  _0x15A6B += "" + (_0x15A51 < 10 ? "0" : "");
  _0x15A6B += "" + _0x15A51 + ":" + (_0x15A85 < 10 ? "0" : "");
  _0x15A6B += "" + _0x15A85;
  return _0x15A6B;
}
function getFractionImageByName(_0x15335) {
  switch (_0x15335) {
    case "The Ballas Gang":
      return ["TheBallasGang", "#A841E8"];
      break;
    case "Marabunta Grande":
      return ["MarabuntaGrande", "#084dfc"];
      break;
    case "The Families":
      return ["TheFamilies", "#31C02E"];
      break;
    case "Bloods Gang":
      return ["BloodsGang", "#fc0824"];
      break;
    case "Los-Santos Vagos":
      return ["LosSantosVagos", "#fcb708"];
      break;
    case "FIB":
      return ["FIB", "#212121"];
      break;
    default:
      return null;
      break;
  }
}
function formatServerPlaytime(minutesRaw) {
  const m = Math.max(0, Math.floor(Number(minutesRaw) || 0));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h < 1) return rest + " мин";
  if (rest === 0) return h + " ч";
  return h + " ч " + rest + " мин";
}
function setKillsStats(_0x165CB, _0x165B1, minutesOnline) {
  const k = document.getElementById("StatsKillsAll");
  const d = document.getElementById("StatsDeaths");
  const h = document.getElementById("StatsServerHours");
  const kd = document.getElementById("StatsKDRatio");
  const kills = parseInt(_0x165CB, 10) || 0;
  const deaths = parseInt(_0x165B1, 10) || 0;
  if (k) k.innerText = kills;
  if (d) d.innerText = deaths;
  if (kd) {
    const ratio = deaths === 0 ? kills : (kills / deaths);
    kd.innerText = Number(ratio).toFixed(2);
  }
  if (h != null && minutesOnline !== undefined && minutesOnline !== null && String(minutesOnline) !== "null") {
    h.innerText = formatServerPlaytime(minutesOnline);
  }
}
function formatMenuStatNumber(n) {
  var v = parseInt(String(n == null ? 0 : n).replace(/[\s.,]/g, ""), 10) || 0;
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
function setMenuAccountProfile(jsonStr) {
  var d = null;
  try {
    d = typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr;
  } catch (_e) {
    return;
  }
  if (!d) return;
  window.__lastMenuAccountProfile = d;
  window.setMenuAccountProfile = setMenuAccountProfile;
  var familyLabel = "Нет";
  if (d.family && typeof d.family === "object" && d.family.name) {
    familyLabel = d.family.rank && d.family.rank !== "—" && d.family.rank !== "Нет"
      ? d.family.name + " · " + d.family.rank
      : d.family.name;
  } else if (d.family != null && String(d.family).length && String(d.family) !== "—") {
    familyLabel = String(d.family);
  }
  var fractionLabel = "Нет";
  if (d.fraction && typeof d.fraction === "object" && d.fraction.name) {
    fractionLabel = d.fraction.name;
    if (d.fraction.rank && d.fraction.rank !== "—" && d.fraction.rank !== "Нет") {
      fractionLabel += " · " + String(d.fraction.rank);
    }
  } else if (d.fractionName != null && String(d.fractionName).length && String(d.fractionName) !== "—") {
    fractionLabel = String(d.fractionName);
  } else if (d.fraction != null && typeof d.fraction !== "object" && String(d.fraction) !== "—") {
    fractionLabel = String(d.fraction);
  }
  var loginVal = d.login;
  if (!loginVal || !String(loginVal).trim()) {
    var ue = document.getElementById("user-name");
    if (ue && ue.textContent && String(ue.textContent).trim() && String(ue.textContent).trim() !== "whait") {
      loginVal = String(ue.textContent).trim();
    }
    if ((!loginVal || !String(loginVal).trim()) && typeof PLAYER !== "undefined" && PLAYER && PLAYER.login) {
      loginVal = String(PLAYER.login);
    }
  }
  if (loginVal && String(loginVal).trim()) {
    var ue2 = document.getElementById("user-name");
    if (ue2) ue2.textContent = String(loginVal).trim();
  }
  var vipLine = d.vipLine;
  if ((!vipLine || String(vipLine).trim() === "" || vipLine === "—") && d.vip && d.vip.name) {
    vipLine = d.vip.name;
    if (d.vip.until && d.vip.until !== "—") {
      vipLine += " · до " + d.vip.until;
    }
  }
  if (!vipLine || String(vipLine).trim() === "" || vipLine === "—") vipLine = "Нет VIP";
  var pairs = [
    ["StatsAccLogin", loginVal || "—"],
    ["StatsAccVip", vipLine],
    ["StatsAccFamily", familyLabel],
    ["StatsAccFraction", fractionLabel]
  ];
  for (var i = 0; i < pairs.length; i++) {
    var el = document.getElementById(pairs[i][0]);
    if (el) {
      var v = pairs[i][1];
      el.textContent = v != null && String(v).length ? String(v) : "—";
    }
  }
  if (d.stats) {
    var mins = d.stats.minutes != null
      ? d.stats.minutes
      : (d.stats.hours != null ? Number(d.stats.hours) * 60 : null);
    setKillsStats(d.stats.kills || 0, d.stats.deaths || 0, mins);
  }
  if (d.dp != null) {
    var dpNum = parseInt(String(d.dp).replace(/[\s.]/g, ""), 10) || 0;
    if (typeof PLAYER !== "undefined") PLAYER.dp = dpNum;
    var dpText = String(dpNum).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    document.querySelectorAll(".dp-balance, #dpBalance").forEach(function (el) {
      el.textContent = dpText;
    });
    try {
      if (typeof updateDp === "function") updateDp();
    } catch (_eDp) {}
  }
}
window.setMenuAccountProfile = setMenuAccountProfile;
var AutoCapture = {
  Interval: null,
  ButtonActive: false,
  AttentionInterval: null
};
function changeAutoCaptWriteDisplay(_0x13F19) {
  switch (_0x13F19) {
    case "open":
      document.getElementById("AutoCaptureWriteDiv").style.display = "block";
      document.getElementById("AutoCaptureTimeText").innerText = "0:10";
      AutoCapture.ButtonActive = true;
      let _0x15231 = 10;
      if (AutoCapture.Interval != null) {
        clearInterval(AutoCapture.Interval);
        AutoCapture.Interval = null;
      }
      AutoCapture.Interval = setInterval(() => {
        if (_0x15231 <= 0) {
          document.getElementById("AutoCaptureWriteDiv").style.display = "none";
          clearInterval(AutoCapture.Interval);
          AutoCapture.Interval = null;
        } else {
          _0x15231--;
          document.getElementById("AutoCaptureTimeText").innerText = `0:0${_0x15231}`;
        }
      }, 1000);
      break;
    case "close":
      document.getElementById("AutoCaptureWriteDiv").style.display = "none";
      if (AutoCapture.Interval != null) {
        clearInterval(AutoCapture.Interval);
        AutoCapture.Interval = null;
      }
      break;
    default:
      break;
  }
}
function playerWriteAutoCapture() {
  if (AutoCapture.ButtonActive == false) {
    return;
  }
  AutoCapture.ButtonActive = false;
  if (AutoCapture.Interval != null) {
    clearInterval(AutoCapture.Interval);
    AutoCapture.Interval = null;
  }
  document.getElementById("AutoCaptureWriteDiv").style.display = "none";
}
function changeGangwarCraftDisplay(_0x13F19) {
  switch (_0x13F19) {
    case "open":
      document.getElementById("craft").style.display = "block";
      break;
    case "close":
      document.getElementById("craft").style.display = "none";
      break;
  }
}
function changeGangwarCraftInfo(_0x15335, _0x14753) {
  document.getElementById("CraftMaterialsName").innerText = `Мастерская ${_0x15335}`;
  document.getElementById("CraftMaterialCount").innerText = `${parseInt(_0x14753).toDivideNum()}`;
}
function changeGangwarCraftMaterialsCount(_0x14753) {
  document.getElementById("CraftMaterialCount").innerText = `${parseInt(_0x14753).toDivideNum()}`;
}
function gangwarChangeGameStatus(_0x13F19) {
  switch (_0x13F19) {
    case "start":
      document.getElementById("GangwarBalanceVehHUD").style.display = "none";
      document.getElementById("GameRaiting").style.display = "block";
      break;
    case "stop":
      document.getElementById("GangwarBalanceVehHUD").style.display = "flex";
      document.getElementById("GameRaiting").style.display = "none";
      break;
  }
}
function changeGangwarCameraMonitorDisplay(_0x13F19) {
  switch (_0x13F19) {
    case "open":
      document.getElementById("computer").style.display = "block";
      break;
    case "close":
      document.getElementById("computer").style.display = "none";
      break;
  }
}
function changeBtnCloseCameraDisplay(_0x13F19) {
  switch (_0x13F19) {
    case "open":
      document.getElementById("camera-close").style.display = "block";
      break;
    case "close":
      document.getElementById("camera-close").style.display = "none";
      break;
  }
}
function OpenAutoCaptureDeathDiv() {
  document.getElementById("PlayerAutoCaptureDeathDiv").style.display = "block";
  document.getElementById("SpawnAfterDeathBtnInAutoCpt").style.display = "block";
  document.getElementById("SpawnAfterDeathBtnInAutoCpt").disabled = false;
}
function CloseAutoCaptureDeathDiv() {
  document.getElementById("PlayerAutoCaptureDeathDiv").style.display = "none";
}
function ChangeAutoCaptureAttentionDisplay(_0x13F19) {
  switch (_0x13F19) {
    case "open":
      document.getElementById("AutoCaptureAttention").style.display = "block";
      document.getElementById("AutoCaptureAttentionSecs").innerText = "5";
      let _0x15231 = 5;
      if (AutoCapture.AttentionInterval != null) {
        clearInterval(AutoCapture.AttentionInterval);
        AutoCapture.AttentionInterval = null;
      }
      AutoCapture.AttentionInterval = setInterval(() => {
        if (_0x15231 <= 0) {
          document.getElementById("AutoCaptureAttention").style.display = "none";
          clearInterval(AutoCapture.AttentionInterval);
          AutoCapture.AttentionInterval = null;
        } else {
          _0x15231--;
          document.getElementById("AutoCaptureAttentionSecs").innerText = `${_0x15231}`;
        }
      }, 1000);
      break;
    case "close":
      document.getElementById("AutoCaptureAttention").style.display = "none";
      if (AutoCapture.AttentionInterval != null) {
        clearInterval(AutoCapture.AttentionInterval);
        AutoCapture.AttentionInterval = null;
      }
      break;
    default:
      break;
  }
}
function changeBRHudKillsAlives(_0x13F19) {
  switch (_0x13F19) {
    case "open":
      document.getElementById("BRHudKillsAlives").style.display = "flex";
      document.getElementById("BRHudZoneDiv").style.display = "block";
      document.getElementById("BRHudColorLoud").style.width = "0%";
      document.getElementById("BRHudZoneTimer").innerText = "0:00";
      document.getElementById("BRLeftDistantToZone").innerText = "0м";
      break;
    case "close":
      document.getElementById("BRHudKillsAlives").style.display = "none";
      document.getElementById("BRHudZoneDiv").style.display = "none";
      if (BRZoneTimeInterval != null) {
        clearInterval(BRZoneTimeInterval);
        BRZoneTimeInterval = null;
      }
      break;
  }
}
var BRZoneTimeInterval = null;
function BRHudStartZoneInterval(_0x150AB) {
  let _0x14FC1 = getGangwarCaptureTime(_0x150AB);
  document.getElementById("BRHudZoneTimer").innerText = `${_0x14FC1}`;
  let _0x14FDB = parseInt(_0x150AB);
  if (BRZoneTimeInterval != null) {
    clearInterval(BRZoneTimeInterval);
    BRZoneTimeInterval = null;
  }
  BRZoneTimeInterval = setInterval(() => {
    _0x14FDB--;
    document.getElementById("BRHudZoneTimer").innerText = `${getGangwarCaptureTime(_0x14FDB)}`;
    if (_0x14FDB <= 0) {
      clearInterval(BRZoneTimeInterval);
      BRZoneTimeInterval = null;
    }
  }, 1000);
}
function BRSetLeftDistantZone(_0x150DF) {
  document.getElementById("BRLeftDistantToZone").innerText = `${parseInt(_0x150DF)}м`;
  var _0x150C5 = 1000;
  var _0x15113 = parseInt(_0x150DF);
  let _0x150F9 = _0x15113 / _0x150C5 * 100;
  if (_0x150F9 >= 100) {
    _0x150F9 = 100;
  }
  if (_0x150F9 <= 0) {
    _0x150F9 = 0;
  }
  document.getElementById("BRHudColorLoud").style.width = `${parseInt(_0x150F9)}%`;
}
function changeBRHudKillsCount(_0x14753) {
  document.getElementById("BRKillsCount").innerText = _0x14753;
}
function changeBRHudAlivesCount(_0x14753) {
  document.getElementById("BRAlivePlayers").innerText = _0x14753;
}
var KillNotifyInterval = null;
var KillNotifyTimeout = null;
function showBRKillNotify(_0x15335, _0x1698D, _0x16515) {
  document.getElementById("BRKillsCount").innerText = _0x16515;
  document.getElementById("BRKillNotifyKillsCount").innerText = _0x16515;
  document.getElementById("BRKillNotifyName").innerText = _0x15335;
  document.getElementById("BRKillNotifyWeapon").innerText = _0x1698D;
  document.getElementById("BRKillNotifyTextDiv").style.opacity = 0;
  document.getElementById("BRZoneAndKillNotifyDiv").style.display = "block";
  let _0x16973 = 0;
  if (KillNotifyInterval != null) {
    clearInterval(KillNotifyInterval);
    KillNotifyInterval = null;
  }
  KillNotifyInterval = setInterval(() => {
    _0x16973 = _0x16973 + 0.01;
    if (_0x16973 >= 1) {
      clearInterval(KillNotifyInterval);
      KillNotifyInterval = null;
    } else {
      document.getElementById("BRKillNotifyTextDiv").style.opacity = parseFloat(_0x16973) * 1;
    }
  }, 5);
  if (KillNotifyTimeout != null) {
    clearTimeout(KillNotifyTimeout);
    KillNotifyTimeout = null;
  }
  KillNotifyTimeout = setTimeout(() => {
    let _0x15161 = 1;
    if (KillNotifyInterval != null) {
      clearInterval(KillNotifyInterval);
      KillNotifyInterval = null;
    }
    KillNotifyInterval = setInterval(() => {
      _0x15161 = _0x15161 - 0.01;
      if (_0x15161 <= 0) {
        clearInterval(KillNotifyInterval);
        KillNotifyInterval = null;
        document.getElementById("BRZoneAndKillNotifyDiv").style.display = "none";
      } else {
        document.getElementById("BRKillNotifyTextDiv").style.opacity = parseFloat(_0x15161) * 1;
      }
    }, 5);
  }, 1500);
}
function BRZoneNotifyImg(_0x13F19) {
  switch (_0x13F19) {
    case "FirstZoneDraw":
      document.getElementById("BRZoneNotifyImg").src = "img/BRTime/FirstZoneDraw.png";
      break;
    case "ZonePush150s":
      document.getElementById("BRZoneNotifyImg").src = "img/BRTime/ZonePush150s.png";
      BRHudStartZoneInterval(150);
      break;
    case "ZonePush90s":
      document.getElementById("BRZoneNotifyImg").src = "img/BRTime/ZonePush90s.png";
      BRHudStartZoneInterval(90);
      break;
    case "ZonePush60s":
      document.getElementById("BRZoneNotifyImg").src = "img/BRTime/ZonePush60s.png";
      BRHudStartZoneInterval(60);
      break;
    case "ZonePush120s":
      document.getElementById("BRZoneNotifyImg").src = "img/BRTime/ZonePush120s.png";
      BRHudStartZoneInterval(120);
      break;
    case "ZonePush210s":
      document.getElementById("BRZoneNotifyImg").src = "img/BRTime/ZonePush210s.png";
      BRHudStartZoneInterval(210);
      break;
    case "ZonePush180s":
      document.getElementById("BRZoneNotifyImg").src = "img/BRTime/ZonePush180s.png";
      BRHudStartZoneInterval(180);
      break;
    case "ZonePush30s":
      document.getElementById("BRZoneNotifyImg").src = "img/BRTime/ZonePush30s.png";
      BRHudStartZoneInterval(30);
      break;
  }
  document.getElementById("BRZoneNotifyImg").style.opacity = 0;
  document.getElementById("BRZoneNotifyImg").style.display = "block";
  document.getElementById("BRZoneAndKillNotifyDiv").style.display = "block";
  let _0x1512D = 0;
  let _0x15147 = null;
  _0x15147 = setInterval(() => {
    _0x1512D = _0x1512D + 0.01;
    if (_0x1512D >= 1) {
      clearInterval(_0x15147);
      _0x15147 = null;
    } else {
      document.getElementById("BRZoneNotifyImg").style.opacity = parseFloat(_0x1512D) * 1;
    }
  }, 5);
  setTimeout(() => {
    let _0x1517B = null;
    let _0x15161 = 1;
    if (_0x1517B != null) {
      clearInterval(_0x1517B);
      _0x1517B = null;
    }
    _0x1517B = setInterval(() => {
      _0x15161 = _0x15161 - 0.01;
      if (_0x15161 <= 0) {
        clearInterval(_0x1517B);
        _0x1517B = null;
        document.getElementById("BRZoneAndKillNotifyDiv").style.display = "none";
        document.getElementById("BRZoneNotifyImg").style.display = "none";
      } else {
        document.getElementById("BRZoneNotifyImg").style.opacity = parseFloat(_0x15161) * 1;
      }
    }, 5);
  }, 2500);
}
function showLobby(_0x13F19) {
  switch (_0x13F19) {
    case "show":
      document.getElementById("main-tab-content").style.display = "none";
      document.getElementById("lobby-window").style.display = "block";
      document.getElementById("setting-lobby-window").style.display = "none";
      break;
    case "close":
      document.getElementById("main-tab-content").style.display = "block";
      document.getElementById("lobby-window").style.display = "none";
      document.getElementById("setting-lobby-window").style.display = "none";
      break;
    case "settings":
      document.getElementById("setting-lobby-window").style.display = "block";
      document.getElementById("main-tab-content").style.display = "none";
      document.getElementById("lobby-window").style.display = "none";
      break;
    default:
      break;
  }
}
function lobbyTeamsPlayersClear() {
  document.getElementById("LobbyTeam1List").innerHTML = "";
  document.getElementById("LobbyTeam2List").innerHTML = "";
  document.getElementById("LobbyTeam1Count").innerText = "0";
  document.getElementById("LobbyTeam2Count").innerText = "0";
}
function lobbyAddUser(_0x15E95, _0x1582F, _0x15E7B, _0x15E61) {
  let _0x15EC9 = null;
  let _0x15EAF = null;
  switch (parseInt(_0x15E95)) {
    case 1:
      _0x15EC9 = "LobbyTeam1List";
      _0x15EAF = "lobbyteam1.png";
      break;
    case 2:
      _0x15EC9 = "LobbyTeam2List";
      _0x15EAF = "lobbyteam2.png";
      break;
  }
  if (_0x15EC9 == null) {
    return;
  }
  document.getElementById(`${_0x15EC9}`).innerHTML += `
    <div class="player" onmouseenter="this.classList.add('hover')" onmouseout="this.classList.remove('hover')" id="LobbyPlayerItem${_0x15E7B}">
    <img src="img/${_0x15EAF}">
    <div class="nickname">
      <div class="trapezoid"></div>
      <div class="nick">
        <p>${_0x1582F}</p>
      </div>
    </div>
    <button onclick="mp.trigger('lobbyKickTargetFromLobby', parseInt(${_0x15E61}),parseInt(${_0x15E7B}))" type="button" name="button" class="player-del"><div class="cross"></div></button>
  </div>`;
  document.getElementById("LobbyTeam1Count").innerText = `${document.getElementById("LobbyTeam1List").getElementsByClassName("player").length}`;
  document.getElementById("LobbyTeam2Count").innerText = `${document.getElementById("LobbyTeam2List").getElementsByClassName("player").length}`;
}
function lobbyRemoveUser(_0x15E7B) {
  document.getElementById(`LobbyPlayerItem${_0x15E7B}`).remove();
  document.getElementById("LobbyTeam1Count").innerText = `${document.getElementById("LobbyTeam1List").getElementsByClassName("player").length}`;
  document.getElementById("LobbyTeam2Count").innerText = `${document.getElementById("LobbyTeam2List").getElementsByClassName("player").length}`;
}
function lobbyChatClear() {
  document.getElementById("LobbyChatMsgDiv").innerHTML = "";
}
function lobbyChatPushMsg(_0x15335, _0x14FC1, _0x15EFD) {
  document.getElementById("LobbyChatMsgDiv").innerHTML += `
    <div class="message">
    <p class="chat-nick">${_0x15335}<b>${_0x14FC1}</b></p>
    <p class="text-chat">${_0x15EFD}</p>
    </div>
    `;
}
function lobbyChatPushMsgJoin(_0x15335, _0x15E95) {
  document.getElementById("LobbyChatMsgDiv").innerHTML += `
    <div class="message">
    <p>${_0x15335} присоединяется к команде #${_0x15E95}</p>
    </div>
    `;
}
function lobbyChatPushMsgKick(_0x15335, _0x157FB) {
  document.getElementById("LobbyChatMsgDiv").innerHTML += `
    <div class="message">
    <p>${_0x15335} кикнул из лобби ${_0x157FB}</p>
    </div>
    `;
}
function lobbyChatPushMsgLeave(_0x15335) {
  document.getElementById("LobbyChatMsgDiv").innerHTML += `
    <div class="message">
    <p>${_0x15335} покинул лобби.</p>
    </div>
    `;
}
function lobbyChatClearChatInput() {
  document.getElementById("lobbyChatInput").value = "";
}
function lobbyChangeSettings(_0x15EE3, _0x14447) {
  document.getElementById(`${_0x15EE3}`).innerText = `${_0x14447}`;
}
function lobbyInvitePlayer(_0x15F17) {
  if (document.getElementById(`LobbyInviteInputTeam${_0x15F17}`).value.length <= 0) {
    return emsg("Введите ID");
  }
  mp.trigger("LobbyInviteTarget", parseInt(document.getElementById(`LobbyInviteInputTeam${_0x15F17}`).value), parseInt(_0x15F17));
}
function lobbyIdWriteInput(_0x15F17) {
  document.getElementById(`${_0x15F17}`).value = document.getElementById(`${_0x15F17}`).value.replace(/[^0-9]/g, "");
}
var lobbyInviteTimeout = null;
function lobbyInviteTargetForm(_0x15F31) {
  if (lobbyInviteTimeout != null) {
    clearTimeout(lobbyInviteTimeout);
    lobbyInviteTimeout = null;
  }
  document.getElementById("lobbyCaptureInvinterID").innerText = `${_0x15F31}`;
  document.getElementById("lobbyCaptureInviteForm").style.display = "block";
  lobbyInviteTimeout = setTimeout(() => {
    document.getElementById("lobbyCaptureInviteForm").style.display = "none";
    lobbyInviteTimeout = null;
  }, 7500);
}
function lobbyCancelInvite() {
  if (lobbyInviteTimeout != null) {
    clearTimeout(lobbyInviteTimeout);
    lobbyInviteTimeout = null;
  }
  document.getElementById("lobbyCaptureInviteForm").style.display = "none";
  mp.trigger("LobbyCancelInvite");
}
function lobbyAcceptInvite() {
  mp.trigger("lobbyAcceptInvite");
}
function lobbyAcceptInviteSuccess() {
  if (lobbyInviteTimeout != null) {
    clearTimeout(lobbyInviteTimeout);
    lobbyInviteTimeout = null;
  }
  document.getElementById("lobbyCaptureInviteForm").style.display = "none";
}
function lobbyStartGameHideAll() {
  document.getElementById("main-tab-content").style.display = "none";
  document.getElementById("lobby-window").style.display = "none";
  document.getElementById("setting-lobby-window").style.display = "none";
  document.getElementById("PlayerDeathLobbyDiv").style.display = "none";
}
function OpenLobbyDeathDiv(_0x13F19) {
  switch (_0x13F19) {
    case 0:
      document.getElementById("SpawnAfterDeathLobbyBtn").innerText = "Покинуть лобби";
      break;
    case 1:
      document.getElementById("SpawnAfterDeathLobbyBtn").innerText = "Восстановить лобби";
      break;
  }
  document.getElementById("PlayerDeathLobbyDiv").style.display = "block";
}
function BtnCloseLobbyDeathDiv() {
  document.getElementById("PlayerDeathLobbyDiv").style.display = "none";
  mp.trigger("LobbyGamingLobbyPressDeath");
}
var lashMsgPush = new Date().getTime();
function lobbyMessagePush() {
  if (new Date().getTime() - lashMsgPush < 1000) {
    return emsg("Не так быстро");
  }
  lashMsgPush = new Date().getTime();
  var _0x15BA3 = document.getElementById("lobbyChatInput");
  var _0x15BBD = _0x15BA3.value;
  var _0x15B21 = _0x15BBD.replace(/[^a-z0-9A-ZА-Яа-я\D]/gi, "");
  var _0x15B3B = _0x15B21.replace(/[\\]/gi, "");
  const _0x15C0B = /["`'<>{}&]/g;
  var _0x15C8D = _0x15B3B.replace(_0x15C0B, "");
  if (_0x15C8D.length <= 0 || _0x15C8D.length == undefined || _0x15C8D.length == null || _0x15C8D == "") {
    return emsg("Введите сообщение");
  }
  if (_0x15C8D.length > 150) {
    return emsg("Сообщение слишком большое");
  }
  mp.trigger("lobbyMessagePush", `${_0x15C8D}`);
}
function copyToClipboard(_0x15711) {
  return false;
}
function duelsInviteTarget(_0x15863) {
  if (parseInt(_0x15863) != _0x15863) {
    return emsg("Карта не определена, попробуйте еще раз.");
  }
  let _0x14A5F = document.getElementById("DuelTargetID").value;
  if (_0x14A5F.length <= 0 || parseInt(_0x14A5F) != _0x14A5F || _0x14A5F == "" || _0x14A5F == " " || _0x14A5F == null || _0x14A5F == undefined) {
    return emsg("Вы не ввели ID");
  }
  mp.trigger("sendDuelToTargetID", parseInt(_0x15863), parseInt(_0x14A5F));
}
var duelSettings = {
  Interval: null,
  ButtonActive: false,
  AttentionInterval: null
};
function duelTargetWriteBlock(_0x14739) {
  document.getElementById("duelTargetWriteBlock").style.display = "block";
  document.getElementById("duelTargetInviterName").innerText = `${_0x14739}`;
  document.getElementById("duelWriteTimer").innerText = "0:10";
  duelSettings.ButtonActive = true;
  let _0x15231 = 10;
  if (duelSettings.Interval != null) {
    clearInterval(duelSettings.Interval);
    duelSettings.Interval = null;
  }
  duelSettings.Interval = setInterval(() => {
    if (_0x15231 <= 0) {
      document.getElementById("duelTargetWriteBlock").style.display = "none";
      clearInterval(AutoCapture.Interval);
      AutoCapture.Interval = null;
      duelSettings.ButtonActive = false;
    } else {
      _0x15231--;
      document.getElementById("duelWriteTimer").innerText = `0:0${_0x15231}`;
    }
  }, 1000);
}
function duelAcceptInvite() {
  if (duelSettings.Interval != null) {
    clearInterval(duelSettings.Interval);
    duelSettings.Interval = null;
  }
  document.getElementById("duelTargetWriteBlock").style.display = "none";
  if (duelSettings.ButtonActive == false) {
    return;
  }
  duelSettings.ButtonActive = false;
  mp.trigger("duelTargetAcceptInvite");
}
function duelBeginAttentionShow(_0x1582F, _0x157FB, _0x15849, _0x15815) {
  document.getElementById("duelAttentionPlayerName").innerText = `${_0x1582F}`;
  document.getElementById("duelAttentionPlayerScore").innerText = `${_0x15849}`;
  document.getElementById("duelAttentionTargetName").innerText = `${_0x157FB}`;
  document.getElementById("duelAttentionTargetScore").innerText = `${_0x15815}`;
  document.getElementById("duelAttentionTimer").innerText = `3`;
  document.getElementById("duelBeginAttention").style.display = "block";
  let _0x15231 = 3;
  if (duelSettings.AttentionInterval != null) {
    clearInterval(duelSettings.AttentionInterval);
    duelSettings.AttentionInterval = null;
  }
  duelSettings.AttentionInterval = setInterval(() => {
    if (_0x15231 <= 0) {
      document.getElementById("duelBeginAttention").style.display = "none";
      clearInterval(duelSettings.AttentionInterval);
      duelSettings.AttentionInterval = null;
    } else {
      _0x15231--;
      document.getElementById("duelAttentionTimer").innerText = `${_0x15231}`;
    }
  }, 1000);
}
function changeGGVehSellDisplay(_0x13F19) {
  switch (_0x13F19) {
    case "open":
      document.getElementById("car-sale").style.display = "block";
      break;
    case "close":
      document.getElementById("car-sale").style.display = "none";
      VehicleForSell = null;
      break;
  }
}
var VehicleForSell = null;
var VehicleForSellNumber = null;
var VehicleForSellID = null;
var VehicleSellBtnFreeze = false;
function setVehSellInfo(_0x15335, _0x1476D, _0x1638F, _0x137FD, _0x14F59) {
  document.getElementById("Car-sale-vehname").innerText = `${_0x15335}`;
  document.getElementById("Car-sale-vehprice").innerText = `Цена: ${parseInt(_0x1476D).toDivideNum()}$`;
  VehicleForSell = `${_0x1638F}`;
  VehicleForSellNumber = `${_0x137FD}`;
  VehicleForSellID = parseInt(_0x14F59);
}
function playerStartSellPersonalVeh() {
  if (VehicleSellBtnFreeze != false) {
    return emsg("Происходит продажа машины, ожидайте");
  }
  if (VehicleForSell == null || VehicleForSell == undefined) {
    return emsg("Ошибка при определении машины для продажи, сообщите в /report, а так же попробуйте еще раз");
  }
  if (VehicleForSellNumber == null || VehicleForSellNumber == undefined) {
    return emsg("Ошибка при определении машины для продажи, сообщите в /report, а так же попробуйте еще раз");
  }
  if (VehicleForSellID == null || VehicleForSellID == undefined) {
    return emsg("Ошибка при определении машины для продажи, сообщите в /report, а так же попробуйте еще раз");
  }
  VehicleSellBtnFreeze = true;
  mp.trigger("playerSellPersonalVeh", VehicleForSell, VehicleForSellNumber, VehicleForSellID);
}
function unlockVehicleSellBtnFreeze() {
  VehicleSellBtnFreeze = false;
  VehicleForSell = null;
  VehicleForSellNumber = null;
  VehicleForSellID = null;
}
var updateDPButtonBlocked = false;
function updateDPBalance() {
  if (updateDPButtonBlocked == true) {
    return fastemsg("Невозможно так часто обновлять баланс, ожидайте.");
  }
  updateDPButtonBlocked = true;
  mp.trigger("updateDPBalance");
}
function unlockUpdateDPBalance() {
  if (updateDPButtonBlocked == false) {
    return;
  }
  setTimeout(() => {
    updateDPButtonBlocked = false;
  }, 10000);
}
function buyDPBalance() {
  mp.trigger("buyDPBalance");
}
function showHumanLabsAttentionBlock() {
  document.getElementById("HumanLabsAttentionBlock").style.display = "block";
  setTimeout(() => {
    document.getElementById("HumanLabsAttentionBlock").style.display = "none";
  }, 10000);
}
function showShopsRobberyAttentionBlock(_0x15043) {
  document.getElementById("ShopRobberyNumberText").innerText = `${_0x15043}`;
  document.getElementById("shopRobberyAttentionBlock").style.display = "block";
  setTimeout(() => {
    document.getElementById("shopRobberyAttentionBlock").style.display = "none";
  }, 5000);
}
function hangarCaptureAttentionBlock(_0x15043) {
  document.getElementById("hangarAttentionBlock").style.display = "block";
  setTimeout(() => {
    document.getElementById("hangarAttentionBlock").style.display = "none";
  }, 5000);
}
function bunkerPushAttentionBlock(_0x15043) {
  document.getElementById("bunkerPushAttentionBlock").style.display = "block";
  setTimeout(() => {
    document.getElementById("bunkerPushAttentionBlock").style.display = "none";
  }, 5000);
}
function showGameWinnerAttentionBlock(_0x15335) {
  document.getElementById("GameWinnerAttentionName").innerText = `${_0x15335}`;
  document.getElementById("GameWinnerAttentionBlock").style.display = "block";
  setTimeout(() => {
    document.getElementById("GameWinnerAttentionBlock").style.display = "none";
  }, 4000);
}
function changeMinimapHUDPos(_0x13AD5, _0x13AEF) {
  document.getElementById("RPHudMinimapBlock").style.marginLeft = `${_0x13AD5}px`;
  document.getElementById("RPHudMinimapBlock").style.marginBottom = `${_0x13AEF}px`;
}
function changeRPHudDisplay(_0x13F19) {
  switch (_0x13F19) {
    case "close":
      document.getElementById("RPHudMinimapBlock").style.display = "none";
      break;
    case "open":
      document.getElementById("RPHudMinimapBlock").style.display = "block";
      break;
  }
}
function changeRPHUDStreet(_0x13F19, _0x15335) {
  switch (_0x13F19) {
    case "zone":
      document.getElementById("RPHudZoneName").innerText = _0x15335;
      break;
    case "street":
      document.getElementById("RPHudStreetName").innerText = _0x15335;
      break;
  }
}
function getRandomInRange(_0x14051, _0x14037) {
  return Math.floor(Math.random() * (_0x14037 - _0x14051 + 1)) + _0x14051;
}
function GreenZoneChange(_0x13F19) {
  switch (_0x13F19) {
    case "enter":
      document.getElementById("RPHudZoneName").style.color = "#31C02E";
      break;
    case "exit":
      document.getElementById("RPHudZoneName").style.color = "#006EFF";
      break;
  }
}
function ChangeRPDefaultSpeedometerDisplay(_0x13F19) {
  switch (_0x13F19) {
    case "show":
      document.getElementById("RPDefaultSpeedometer").style.display = "flex";
      break;
    case "hide":
      document.getElementById("RPDefaultSpeedometer").style.display = "none";
      break;
  }
}
function RPChangeSpeedometerSpeed(_0x16341, _0x155D9, _0x155F3) {
  document.getElementById("RPDefaultSMSpeed").innerText = `${parseInt(_0x16341)}`;
  switch (_0x155D9) {
    case "true":
      document.getElementById("RPSMEngineON").style.display = "block";
      document.getElementById("RPSMEngineOff").style.display = "none";
      break;
    case "false":
      document.getElementById("RPSMEngineON").style.display = "none";
      document.getElementById("RPSMEngineOff").style.display = "block";
      break;
  }
  switch (parseInt(_0x155F3)) {
    case 1:
      document.getElementById("RPSMLock").style.display = "none";
      document.getElementById("RPSMUnlock").style.display = "block";
      break;
    case 2:
      document.getElementById("RPSMLock").style.display = "block";
      document.getElementById("RPSMUnlock").style.display = "none";
      break;
  }
}
function changeGLXYHBDay(_0x15369) {
  let _0x15383;
  let _0x1539D;
  let _0x153B7;
  let _0x153D1;
  let _0x153EB;
  let _0x15405;
  let _0x1541F;
  let _0x151FD;
  let _0x151E3;
  let _0x15439;
  switch (parseInt(_0x15369)) {
    case 1:
      _0x151FD = "Эксклюзивное, лимитированное оружие Navy Revolver";
      _0x151E3 = "img/NavyRevolver.png";
      _0x15383 = " active";
      _0x1539D = "";
      _0x153B7 = "";
      _0x153D1 = "";
      day5 = "";
      day6 = "";
      day7 = "";
      day8 = "";
      day9 = "";
      day10 = "";
      _0x153EB = "";
      _0x15405 = "";
      _0x1541F = "";
      line4 = "";
      line5 = "";
      line6 = "";
      line7 = "";
      line8 = "";
      line9 = "";
      _0x15439 = 4;
      break;
    case 2:
      _0x151FD = "20.000$ в GANGWAR режиме";
      _0x151E3 = "img/productMoney2.png";
      _0x15383 = " active";
      _0x1539D = " active";
      _0x153B7 = "";
      _0x153D1 = "";
      day5 = "";
      day6 = "";
      day7 = "";
      day8 = "";
      day9 = "";
      day10 = "";
      _0x153EB = " active";
      _0x15405 = "";
      _0x1541F = "";
      line4 = "";
      line5 = "";
      line6 = "";
      line7 = "";
      line8 = "";
      line9 = "";
      _0x15439 = 4;
      break;
    case 3:
      _0x151FD = "Эксклюзивные Adidas Yeezy 350 V2 для всех фракций";
      _0x151E3 = "img/prod_clothes/s_4.png";
      _0x15383 = " active";
      _0x1539D = " active";
      _0x153B7 = " active";
      _0x153D1 = "";
      day5 = "";
      day6 = "";
      day7 = "";
      day8 = "";
      day9 = "";
      day10 = "";
      _0x153EB = " active";
      _0x15405 = " active";
      _0x1541F = "";
      line4 = "";
      line5 = "";
      line6 = "";
      line7 = "";
      line8 = "";
      line9 = "";
      _0x15439 = 4;
      break;
    case 4:
      _0x151FD = "25.000$";
      _0x151E3 = "img/productMoney2.png";
      _0x15383 = " active";
      _0x1539D = " active";
      _0x153B7 = " active";
      _0x153D1 = " active";
      day5 = "";
      day6 = "";
      day7 = "";
      day8 = "";
      day9 = "";
      day10 = "";
      _0x153EB = " active";
      _0x15405 = " active";
      _0x1541F = " active";
      line4 = "";
      line5 = "";
      line6 = "";
      line7 = "";
      line8 = "";
      line9 = "";
      _0x15439 = 4;
      break;
    case 5:
      _0x151FD = "10x 50% бронежилетов";
      _0x151E3 = "img/armVest.png";
      _0x15383 = " active";
      _0x1539D = " active";
      _0x153B7 = " active";
      _0x153D1 = " active";
      day5 = " active";
      day6 = "";
      day7 = "";
      day8 = "";
      day9 = "";
      day10 = "";
      _0x153EB = " active";
      _0x15405 = " active";
      _0x1541F = " active";
      line4 = " active";
      line5 = "";
      line6 = "";
      line7 = "";
      line8 = "";
      line9 = "";
      _0x15439 = 4;
      break;
    case 6:
      _0x151FD = "10x 100% бронежилетов";
      _0x151E3 = "img/armVest.png";
      _0x15383 = " active";
      _0x1539D = " active";
      _0x153B7 = " active";
      _0x153D1 = " active";
      day5 = " active";
      day6 = " active";
      day7 = "";
      day8 = "";
      day9 = "";
      day10 = "";
      _0x153EB = " active";
      _0x15405 = " active";
      _0x1541F = " active";
      line4 = " active";
      line5 = " active";
      line6 = "";
      line7 = "";
      line8 = "";
      line9 = "";
      _0x15439 = 4;
      break;
    case 7:
      _0x151FD = "Эксклюзивные Adidas Yeezy 350 V2 для всех фракций";
      _0x151E3 = "img/prod_clothes/s_6.png";
      _0x15383 = " active";
      _0x1539D = " active";
      _0x153B7 = " active";
      _0x153D1 = " active";
      day5 = " active";
      day6 = " active";
      day7 = " active";
      day8 = "";
      day9 = "";
      day10 = "";
      _0x153EB = " active";
      _0x15405 = " active";
      _0x1541F = " active";
      line4 = " active";
      line5 = " active";
      line6 = " active";
      line7 = "";
      line8 = "";
      line9 = "";
      _0x15439 = 4;
      break;
    case 8:
      _0x151FD = "15.000$";
      _0x151E3 = "img/productMoney2.png";
      _0x15383 = " active";
      _0x1539D = " active";
      _0x153B7 = " active";
      _0x153D1 = " active";
      day5 = " active";
      day6 = " active";
      day7 = " active";
      day8 = " active";
      day9 = "";
      day10 = "";
      _0x153EB = " active";
      _0x15405 = " active";
      _0x1541F = " active";
      line4 = " active";
      line5 = " active";
      line6 = " active";
      line7 = " active";
      line8 = "";
      line9 = "";
      _0x15439 = 4;
      break;
    case 9:
      _0x151FD = "20.000$";
      _0x151E3 = "img/productMoney2.png";
      _0x15383 = " active";
      _0x1539D = " active";
      _0x153B7 = " active";
      _0x153D1 = " active";
      day5 = " active";
      day6 = " active";
      day7 = " active";
      day8 = " active";
      day9 = " active";
      day10 = "";
      _0x153EB = " active";
      _0x15405 = " active";
      _0x1541F = " active";
      line4 = " active";
      line5 = " active";
      line6 = " active";
      line7 = " active";
      line8 = " active";
      line9 = "";
      _0x15439 = 6;
      break;
    case 10:
      _0x151FD = "Эксклюзивный мотоцикл Hakuchou";
      _0x151E3 = "img/hakuchou.png";
      _0x15383 = " active";
      _0x1539D = " active";
      _0x153B7 = " active";
      _0x153D1 = " active";
      day5 = " active";
      day6 = " active";
      day7 = " active";
      day8 = " active";
      day9 = " active";
      day10 = " active";
      _0x153EB = " active";
      _0x15405 = " active";
      _0x1541F = " active";
      line4 = " active";
      line5 = " active";
      line6 = " active";
      line7 = " active";
      line8 = " active";
      line9 = " active";
      _0x15439 = 8;
      break;
  }
  let _0x15453 = `
    <div class="progress_block${_0x15383}"></div><hr class="gift_line${_0x153EB}">
    <div class="progress_block${_0x1539D}"></div><hr class="gift_line${_0x15405}">
    <div class="progress_block${_0x153B7}"></div><hr class="gift_line${_0x1541F}">
    <div class="progress_block${_0x153D1}"></div><hr class="gift_line${line4}">
    <div class="progress_block${day5}"></div><hr class="gift_line${line5}">
    <div class="progress_block${day6}"></div><hr class="gift_line${line6}">
    <div class="progress_block${day7}"></div><hr class="gift_line${line7}">
    <div class="progress_block${day8}"></div><hr class="gift_line${line8}">
    <div class="progress_block${day9}"></div><hr class="gift_line${line9}">
    <div class="progress_block${day10}"></div>`;
  document.getElementById("GALAXYHBDaysDiv").innerHTML = _0x15453;
  document.getElementById("GALAXYHBPDayText").innerText = _0x15369;
  document.getElementById("GALAXYHBPrizeImg").src = _0x151E3;
  document.getElementById("GALAXYHBPrizeText").innerText = `Отрыграйте ${_0x15439} часа и получите ${_0x151FD}`;
}
function GetHBPrizeTime(_0x14FC1) {
  let _0x159CF = "0";
  let _0x15A9F = "0";
  let _0x159E9 = `${_0x14FC1}`;
  let _0x1599B;
  let _0x159B5;
  let _0x15967 = _0x159E9 / 60 | 0;
  let _0x15981 = _0x159E9 % 60;
  if (_0x159E9 >= 60) {
    _0x1599B = _0x15967;
    if (_0x15981 <= 9) {
      _0x159B5 = "0" + _0x15981;
    } else {
      _0x159B5 = _0x15981;
    }
    _0x159CF = _0x1599B;
    _0x15A9F = _0x159B5;
  } else {
    if (_0x15981 <= 9) {
      _0x159B5 = "0" + _0x15981;
    } else {
      _0x159B5 = _0x15981;
    }
    _0x159CF = "0";
    _0x15A9F = _0x159B5;
  }
  return [_0x159CF, _0x15A9F];
}
function tuningChangePrice(_0x13F19) {}
function changeVehTuningDisplay(_0x13F19) {
  switch (_0x13F19) {
    case "open":
      document.getElementById("autotuning").style.display = "block";
      break;
    case "close":
      document.getElementById("autotuning").style.display = "none";
      break;
  }
}
setTimeout(() => {
  const _elAutoTuning = document.getElementById("autotuning");
  if (_elAutoTuning) {
    _elAutoTuning.style.opacity = 1;
    _elAutoTuning.style.display = "none";
  }
}, 3000);
function changeTuningPriceData(_0x155BF, _0x1476D) {
  document.getElementById("TuningPriceName").innerText = `${_0x155BF}`;
  document.getElementById("TuningPrice").innerText = `${parseInt(_0x1476D).toDivideNum()}`;
}
function changeGangwarCircleMenu(_0x1531B, _0x13F19) {
  switch (_0x13F19) {
    case "open":
      document.getElementById(`${_0x1531B}`).style.display = "block";
      break;
    case "close":
      document.getElementById(`${_0x1531B}`).style.display = "none";
      break;
  }
}
function setNewFreeCasesCount(_0x14753) {
  document.getElementById("FreeCasesCount").innerText = `Количество бесплатных открытий: ${_0x14753}`;
}
window._crosshairPickerSync = false;
window._crosshairCpInited = false;

/** Состояние прицела — объявлено до любых функций, чтобы не ловить TDZ при ранних вызовах из CEF/mp. */
let CrossHairSettings = [{
  Type: "Default",
  Width: 2,
  Height: 10,
  CenterDistance: 2,
  ChossHairOpacity: 1,
  CenterPointVisible: true,
  CenterPointSize: 1,
  CenterPointRadius: 1,
  CrosshairRadius: 1,
  DefaultColor: "#000000",
  TargetColor: "#ffffff"
}];
let CustomCrosshair = false;
let bmCrosshairPreviewMode = "default";
/** Куда класть цвет с пресет-палитры: основной или «на цели». */
let bmCrosshairPaintSlot = "default";

/** Автосохранение в mp.storage при любых правках (не нужно жать «Сохранить прицел»). */
let bmCrosshairPersistTimer = null;
function scheduleCrosshairPersistStorage() {
  if (bmCrosshairPersistTimer) clearTimeout(bmCrosshairPersistTimer);
  bmCrosshairPersistTimer = setTimeout(function () {
    bmCrosshairPersistTimer = null;
    try {
      if (typeof CrossHairSettings === "undefined" || !CrossHairSettings || !CrossHairSettings[0]) return;
      if (typeof mp !== "undefined" && mp.trigger) {
        mp.trigger("crosshairPersistStorage", JSON.stringify(CrossHairSettings));
      }
    } catch (_e) {}
  }, 450);
}

function isCrosshairPaneRenderable() {
  try {
    const ac = document.getElementById("account");
    if (ac) {
      const acs = window.getComputedStyle(ac);
      if (acs.display === "none" || acs.visibility === "hidden") return false;
    }
    const pane = document.getElementById("settings-account-crosshair-pane");
    if (!pane) return false;
    const cs = window.getComputedStyle(pane);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    if (document.getElementById("ch_native_default")) return true;
    const pick = document.getElementById("picker_ch1");
    if (!pick) return false;
    const r = pick.getBoundingClientRect();
    return r.width >= 16 && r.height >= 16;
  } catch (_e) {
    return false;
  }
}

window.adjustCrosshairInputDelta = function (inputId, dir) {
  const el = document.getElementById(inputId);
  if (!el || el.tagName !== "INPUT") return;
  const min = parseFloat(el.getAttribute("min"));
  const max = parseFloat(el.getAttribute("max"));
  let step = parseFloat(el.getAttribute("step"));
  const minN = isNaN(min) ? 0 : min;
  const maxN = isNaN(max) ? 100 : max;
  if (!Number.isFinite(step) || step <= 0) step = 1;
  let v = parseFloat(el.value);
  if (!Number.isFinite(v)) v = minN;
  v += dir > 0 ? step : -step;
  if (v < minN) v = minN;
  if (v > maxN) v = maxN;
  const stepStr = String(step);
  const dot = stepStr.indexOf(".");
  const decimals = dot >= 0 ? stepStr.length - dot - 1 : 0;
  if (decimals > 0) {
    const pow = Math.pow(10, decimals);
    v = Math.round(v * pow) / pow;
  } else {
    v = Math.round(v);
  }
  el.value = String(v);
  el.dispatchEvent(new Event("input", { bubbles: true }));
};

window.bmCrosshairCenterSet = function (on) {
  const cb = document.getElementById("aim_checkbox_settings");
  if (cb) cb.checked = !!on;
  changeCrosshair("CenterPointVisible", !!on);
  bmSyncCrosshairCenterDots();
};

window.bmSyncCrosshairCenterDots = function () {
  const cb = document.getElementById("aim_checkbox_settings");
  const on = !!(cb && cb.checked);
  const wrap = cb && cb.closest("[data-bm-square-switch]");
  if (wrap) {
    if (typeof bmSyncSquareSwitchVisual === "function") bmSyncSquareSwitchVisual(wrap);
    else {
      const ui = wrap.querySelector(".bm-setting-slider-toggle__ui");
      if (ui) ui.classList.toggle("bm-setting-slider-toggle__ui--on", on);
    }
  }
  const lblOff = document.getElementById("ch_center_lbl_off");
  const lblOn = document.getElementById("ch_center_lbl_on");
  if (lblOff) {
    lblOff.classList.toggle("is-active", !on);
    lblOff.classList.toggle("is-muted", on);
  }
  if (lblOn) {
    lblOn.classList.toggle("is-active", on);
    lblOn.classList.toggle("is-muted", !on);
  }
};

window.bmCrosshairPresetDefault = function (hex) {
  changeCrosshair("DefaultColor", normalizeCrosshairHex(hex));
};

window.bmCrosshairPresetTarget = function (hex) {
  changeCrosshair("TargetColor", normalizeCrosshairHex(hex));
};

window.bmCrosshairNativePick = function (which, value) {
  const hex = normalizeCrosshairHex(value);
  if (which === "target") changeCrosshair("TargetColor", hex);
  else changeCrosshair("DefaultColor", hex);
};

/** 20 пресетов (5×4), дополняют сохранённые значения в скрытых полях */
const BM_CROSSHAIR_PRESET_HEX = [
  "#ffffff",
  "#e8e8e8",
  "#94a3b8",
  "#64748b",
  "#374151",
  "#0a0a0a",
  "#ef4444",
  "#dc2626",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#38bdf8",
  "#ec4899",
  "#fca5a5",
  "#fb923c",
  "#fde047",
  "#86efac",
  "#fbbf24",
  "#84cc16"
];

function syncCrosshairPaintSlotButtons() {
  // Слот применения теперь берётся из режима предпросмотра, отдельных кнопок нет.
  // Функция оставлена для обратной совместимости со старыми вызовами.
}

window.setCrosshairPaintSlot = function (slot) {
  bmCrosshairPaintSlot = slot === "target" ? "target" : "default";
};

function ensureCrosshairPresetPalette() {
  const wrap = document.getElementById("ch_preset_palette");
  if (!wrap) return;
  const ver = wrap.getAttribute("data-palette-version") || "1";
  const swatches = wrap.querySelectorAll(".crosshair-v2__preset-swatch");
  const needRebuild =
    wrap.getAttribute("data-built-version") !== ver || swatches.length !== BM_CROSSHAIR_PRESET_HEX.length;
  if (!needRebuild) {
    syncCrosshairPaletteOutline();
    return;
  }
  wrap.setAttribute("data-built-version", ver);
  wrap.innerHTML = "";
  for (let i = 0; i < BM_CROSSHAIR_PRESET_HEX.length; i++) {
    const hNorm = normalizeCrosshairHex(BM_CROSSHAIR_PRESET_HEX[i]);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "crosshair-v2__preset-swatch";
    b.setAttribute("data-hex", hNorm);
    b.style.setProperty("--bm-sw-color", hNorm);
    if (hNorm === "#0a0a0a" || hNorm === "#374151" || hNorm === "#64748b") {
      b.style.setProperty("border-color", "rgba(255,255,255,0.5)");
    }
    b.setAttribute("title", "Применить к режиму предпросмотра");
    b.addEventListener("click", function (ev) {
      ev.preventDefault();
      const hx = normalizeCrosshairHex(this.getAttribute("data-hex"));
      const slot = bmCrosshairPreviewMode === "target" ? "target" : "default";
      bmCrosshairPaintSlot = slot;
      if (slot === "target") window.bmCrosshairPresetTarget(hx);
      else window.bmCrosshairPresetDefault(hx);
      try { refreshCrosshairPreviewPaint(); } catch (_e) {}
      syncCrosshairPaletteOutline();
    });
    wrap.appendChild(b);
  }
  syncCrosshairPaletteOutline();
}

function syncCrosshairPaletteOutline() {
  if (!CrossHairSettings || !CrossHairSettings[0]) return;
  const slot = bmCrosshairPreviewMode === "target" ? "target" : "default";
  const cur =
    slot === "target"
      ? normalizeCrosshairHex(CrossHairSettings[0].TargetColor || "#ffffff")
      : normalizeCrosshairHex(CrossHairSettings[0].DefaultColor || "#000000");
  const nodes = document.querySelectorAll("#ch_preset_palette .crosshair-v2__preset-swatch");
  for (let i = 0; i < nodes.length; i++) {
    const btn = nodes[i];
    const hx = normalizeCrosshairHex(btn.getAttribute("data-hex"));
    btn.classList.toggle("is-palette-selected", hx === cur);
  }
}

function normalizeCrosshairHex(color) {
  if (color == null || color === "") return "#e8e8e8";
  let s = String(color).trim();
  if (s.charAt(0) !== "#") s = "#" + s;
  if (s.length === 4) {
    return ("#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]).toLowerCase();
  }
  return /^#[0-9A-Fa-f]{6}$/.test(s) ? s.toLowerCase() : "#e8e8e8";
}

function crosshairEl(id) {
  return document.getElementById(id);
}

function applyCrosshairGapPreview(gapPx) {
  const g = Math.max(0, parseInt(gapPx, 10) || 0);
  const block = document.querySelector(".crosshair-menu-preview.aim-block") || document.querySelector(".aim-block.crosshair-menu-preview");
  const mid = crosshairEl("crosshairHorizontalLine") && crosshairEl("crosshairHorizontalLine").parentElement;
  const gapCss = `${g}px`;
  if (block) {
    block.style.gap = gapCss;
    block.style.alignItems = "center";
    block.style.justifyContent = "center";
  }
  if (mid) {
    mid.style.gap = gapCss;
    mid.style.alignItems = "center";
    mid.style.justifyContent = "center";
  }
  const pt = crosshairEl("crosshairCenterPoint");
  if (pt) {
    pt.style.margin = "0";
    pt.style.alignSelf = "center";
  }
}

function syncCrosshairColorSwatches() {
  if (!CrossHairSettings || !CrossHairSettings[0]) return;
  const s = CrossHairSettings[0];
  const hd = normalizeCrosshairHex(s.DefaultColor || "#e8e8e8");
  const ht = normalizeCrosshairHex(s.TargetColor || "#ef4444");
  const n1 = crosshairEl("ch_native_default");
  const n2 = crosshairEl("ch_native_target");
  if (n1) n1.value = hd;
  if (n2) n2.value = ht;
  const d = crosshairEl("ch_swatch_default");
  const t = crosshairEl("ch_swatch_target");
  if (d) d.style.backgroundColor = hd;
  if (t) t.style.backgroundColor = ht;
  syncCrosshairPaletteOutline();
}
window.syncCrosshairColorSwatches = syncCrosshairColorSwatches;

/** Нативный range: доля заполнения для градиента трека (без jquery rangeslider). */
function updateCrosshairRangeFill(el) {
  if (!el || el.type !== "range" || !el.classList || !el.classList.contains("crosshair-slider__input")) return;
  const min = parseFloat(el.getAttribute("min"));
  const max = parseFloat(el.getAttribute("max"));
  const minN = isNaN(min) ? 0 : min;
  const maxN = isNaN(max) ? 100 : max;
  const val = parseFloat(el.value);
  const n = isNaN(val) ? minN : val;
  const pct = maxN === minN ? 0 : ((n - minN) / (maxN - minN)) * 100;
  el.classList.add("range-filled");
  el.style.setProperty("--fill", pct + "%");
}
function refreshAllCrosshairRangeFills() {
  const pane = document.getElementById("settings-account-crosshair-pane");
  if (!pane) return;
  pane.querySelectorAll(".crosshair-slider__input").forEach(updateCrosshairRangeFill);
}
window.updateCrosshairRangeFill = updateCrosshairRangeFill;
window.refreshAllCrosshairRangeFills = refreshAllCrosshairRangeFills;

function paintCrosshairPreviewLines(hex) {
  const h = normalizeCrosshairHex(hex);
  const ids = ["crosshairVerticalLine", "crosshairVerticalLine1", "crosshairHorizontalLine", "crosshairHorizontalLine1", "crosshairCenterPoint"];
  for (let i = 0; i < ids.length; i++) {
    const el = crosshairEl(ids[i]);
    if (el) el.style.background = h;
  }
}

function getCrosshairPreviewMode() {
  return bmCrosshairPreviewMode === "target" ? "target" : "default";
}

function syncCrosshairPreviewModeButtons() {
  const root = document.querySelector(".crosshair-preview-mode");
  if (!root) return;
  const mode = getCrosshairPreviewMode();
  const btns = root.querySelectorAll(".crosshair-preview-mode__btn");
  for (let i = 0; i < btns.length; i++) {
    const b = btns[i];
    const m = b.getAttribute("data-preview-mode");
    b.classList.toggle("active", m === mode);
  }
}

function refreshCrosshairPreviewPaint() {
  if (!CrossHairSettings || !CrossHairSettings[0] || CrossHairSettings[0].Type !== "Crosshair") return;
  const s = CrossHairSettings[0];
  const hex = getCrosshairPreviewMode() === "target" ? s.TargetColor : s.DefaultColor;
  paintCrosshairPreviewLines(hex);
}

function setCrosshairPreviewMode(mode) {
  bmCrosshairPreviewMode = mode === "target" ? "target" : "default";
  bmCrosshairPaintSlot = bmCrosshairPreviewMode;
  syncCrosshairPreviewModeButtons();
  refreshCrosshairPreviewPaint();
  try { syncCrosshairPaletteOutline(); } catch (_e) {}
}
window.setCrosshairPreviewMode = setCrosshairPreviewMode;

function updateCrosshairMenuPreview() {
  if (!CrossHairSettings || !CrossHairSettings[0]) return;
  const custom = CrossHairSettings[0].Type === "Crosshair";
  const ph = document.getElementById("crosshair-preview-placeholder");
  const wrap = document.getElementById("crosshair-preview-custom-wrap");
  const modeRow = document.querySelector(".crosshair-preview-mode");
  if (ph) ph.style.display = custom ? "none" : "flex";
  if (wrap) wrap.style.display = custom ? "flex" : "none";
  if (modeRow) modeRow.style.display = custom ? "flex" : "none";
  if (custom) {
    syncCrosshairPreviewModeButtons();
    refreshCrosshairPreviewPaint();
  }
}

function ensureCrosshairColorPickers() {
  refreshAllCrosshairRangeFills();
  updateCrosshairMenuPreview();
  try {
    bmSyncCrosshairCenterDots();
  } catch (_eDots) {}
  ensureCrosshairPresetPalette();
  syncCrosshairPaintSlotButtons();
  syncCrosshairColorSwatches();
}
window.ensureCrosshairColorPickers = ensureCrosshairColorPickers;

function setDefaultCrosshair() {
  let _0x14B63 = [{
    Type: "Default",
    Width: 2,
    Height: 10,
    CenterDistance: 2,
    ChossHairOpacity: 1,
    CenterPointVisible: true,
    CenterPointSize: 1,
    CenterPointRadius: 1,
    CrosshairRadius: 1,
    DefaultColor: "#000000",
    TargetColor: "#ffffff"
  }];
  changeCrosshair("Width", _0x14B63[0].Width);
  changeCrosshair("Height", _0x14B63[0].Height);
  changeCrosshair("CenterDistance", _0x14B63[0].CenterDistance);
  changeCrosshair("ChossHairOpacity", _0x14B63[0].ChossHairOpacity);
  changeCrosshair("CenterPointVisible", _0x14B63[0].CenterPointVisible);
  changeCrosshair("CenterPointSize", _0x14B63[0].CenterPointSize);
  changeCrosshair("CenterPointRadius", _0x14B63[0].CenterPointRadius);
  changeCrosshair("CrosshairRadius", _0x14B63[0].CrosshairRadius);
  changeCrosshair("TargetColor", _0x14B63[0].TargetColor);
  changeCrosshair("DefaultColor", _0x14B63[0].DefaultColor);
  $(".aim-setting").css("display", "none");
  syncCrosshairUiFromSettings();
}
setTimeout(() => {
  setDefaultCrosshair();
}, 500);
function syncCrosshairUiFromSettings() {
  const s = CrossHairSettings[0];
  const setVal = (id, v, outId) => {
    const el = document.getElementById(id);
    if (el) el.value = v;
    const o = document.getElementById(outId);
    if (o) {
      const t = typeof v === "number" && v % 1 !== 0 ? String(v) : String(v);
      o.textContent = t;
    }
  };
  setVal("ch_r_height", s.Height, "ch_out_height");
  setVal("ch_r_width", s.Width, "ch_out_width");
  setVal("ch_r_centerdist", s.CenterDistance, "ch_out_cd");
  setVal("ch_r_cps", s.CenterPointSize, "ch_out_cps");
  setVal("ch_r_radius", s.CrosshairRadius, "ch_out_cr");
  setVal("ch_r_cpr", s.CenterPointRadius, "ch_out_cpr");
  setVal("ch_r_opacity", s.ChossHairOpacity, "ch_out_op");
  const cb = document.getElementById("aim_checkbox_settings");
  const vis = s.CenterPointVisible === true || s.CenterPointVisible === 1 || s.CenterPointVisible === "1" || s.CenterPointVisible === "true";
  if (cb) cb.checked = vis;
  applyCrosshairGapPreview(s.CenterDistance);
  if (isCrosshairPaneRenderable()) {
    ensureCrosshairColorPickers();
  }
  bmSyncCrosshairCenterDots();
  refreshAllCrosshairRangeFills();
  updateCrosshairMenuPreview();
  syncCrosshairColorSwatches();
}
function syncCrosshairTypeListActive(t) {
  const ul = document.getElementById("CrossHairBtns");
  if (!ul) return;
  const lis = ul.querySelectorAll("li");
  if (lis.length < 2) return;
  if (t === "Crosshair") {
    lis[0].classList.remove("active");
    lis[1].classList.add("active");
  } else {
    lis[0].classList.add("active");
    lis[1].classList.remove("active");
  }
}
function initCross(_0x15B07) {
  let _0x14B63;
  try {
    _0x14B63 = JSON.parse(_0x15B07);
  } catch (_e) {
    return;
  }
  if (!_0x14B63 || !_0x14B63[0]) return;
  if (_0x14B63[0].Type == "Crosshair") {
    CustomCrosshair = true;
    changeCrosshair("Width", _0x14B63[0].Width);
    changeCrosshair("Height", _0x14B63[0].Height);
    changeCrosshair("CenterDistance", _0x14B63[0].CenterDistance);
    changeCrosshair("ChossHairOpacity", _0x14B63[0].ChossHairOpacity);
    changeCrosshair("CenterPointVisible", _0x14B63[0].CenterPointVisible);
    changeCrosshair("CenterPointSize", _0x14B63[0].CenterPointSize);
    changeCrosshair("CenterPointRadius", _0x14B63[0].CenterPointRadius);
    changeCrosshair("CrosshairRadius", _0x14B63[0].CrosshairRadius);
    changeCrosshair("TargetColor", _0x14B63[0].TargetColor);
    changeCrosshair("DefaultColor", _0x14B63[0].DefaultColor);
    CrossHairSettings[0].Type = _0x14B63[0].Type;
    CrossHairSettings[0].Width = _0x14B63[0].Width;
    CrossHairSettings[0].Height = _0x14B63[0].Height;
    CrossHairSettings[0].CenterDistance = _0x14B63[0].CenterDistance;
    CrossHairSettings[0].ChossHairOpacity = _0x14B63[0].ChossHairOpacity;
    CrossHairSettings[0].CenterPointVisible = _0x14B63[0].CenterPointVisible;
    CrossHairSettings[0].CenterPointSize = _0x14B63[0].CenterPointSize;
    CrossHairSettings[0].CenterPointRadius = _0x14B63[0].CenterPointRadius;
    CrossHairSettings[0].CrosshairRadius = _0x14B63[0].CrosshairRadius;
    CrossHairSettings[0].TargetColor = _0x14B63[0].TargetColor;
    CrossHairSettings[0].DefaultColor = _0x14B63[0].DefaultColor;
    mp.trigger("initCustomCrosshair", "Crosshair", _0x14B63[0].DefaultColor, _0x14B63[0].TargetColor);
    syncCrosshairTypeListActive("Crosshair");
    syncCrosshairUiFromSettings();
  } else {
    CustomCrosshair = true;
    const d = _0x14B63[0];
    CrossHairSettings[0].Type = "Crosshair";
    CrossHairSettings[0].Width = d.Width;
    CrossHairSettings[0].Height = d.Height;
    CrossHairSettings[0].CenterDistance = d.CenterDistance;
    CrossHairSettings[0].ChossHairOpacity = d.ChossHairOpacity;
    CrossHairSettings[0].CenterPointVisible = d.CenterPointVisible;
    CrossHairSettings[0].CenterPointSize = d.CenterPointSize;
    CrossHairSettings[0].CenterPointRadius = d.CenterPointRadius;
    CrossHairSettings[0].CrosshairRadius = d.CrosshairRadius;
    CrossHairSettings[0].TargetColor = d.TargetColor;
    CrossHairSettings[0].DefaultColor = d.DefaultColor;
    changeCrosshair("Type", "Crosshair");
    changeCrosshair("Width", d.Width);
    changeCrosshair("Height", d.Height);
    changeCrosshair("CenterDistance", d.CenterDistance);
    changeCrosshair("ChossHairOpacity", d.ChossHairOpacity);
    changeCrosshair("CenterPointVisible", d.CenterPointVisible);
    changeCrosshair("CenterPointSize", d.CenterPointSize);
    changeCrosshair("CenterPointRadius", d.CenterPointRadius);
    changeCrosshair("CrosshairRadius", d.CrosshairRadius);
    changeCrosshair("TargetColor", d.TargetColor);
    changeCrosshair("DefaultColor", d.DefaultColor);
    mp.trigger("initCustomCrosshair", "Crosshair", d.DefaultColor, d.TargetColor);
    syncCrosshairUiFromSettings();
  }
  $(".aim-setting").css("display", "none");
}
function changeCrosshairType(_0x13F19) {
  syncCrosshairTypeListActive("Crosshair");
  CustomCrosshair = true;
  bmCrosshairPreviewMode = "default";
  syncCrosshairPreviewModeButtons();
  CrossHairSettings[0].Type = "Crosshair";
  mp.trigger("initCustomCrosshair", "Crosshair", CrossHairSettings[0].DefaultColor, CrossHairSettings[0].TargetColor);
  $(".aim-setting").css("display", "block");
  updateCrosshairMenuPreview();
  scheduleCrosshairPersistStorage();
}
function changeCrosshair(_0x13F19, _0x15301) {
  const pt = crosshairEl("crosshairCenterPoint");
  switch (_0x13F19) {
    case "Type":
      CrossHairSettings[0].Type = _0x15301;
      CustomCrosshair = _0x15301 === "Crosshair";
      updateCrosshairMenuPreview();
      break;
    case "Width": {
      const v = parseInt(_0x15301, 10);
      const w = isNaN(v) ? 2 : v;
      const a = crosshairEl("crosshairVerticalLine");
      const b = crosshairEl("crosshairVerticalLine1");
      const c = crosshairEl("crosshairHorizontalLine");
      const d = crosshairEl("crosshairHorizontalLine1");
      const hideW = w <= 0;
      if (a) { a.style.width = `${w}px`; a.style.display = hideW ? "none" : ""; }
      if (b) { b.style.width = `${w}px`; b.style.display = hideW ? "none" : ""; }
      if (c) { c.style.height = `${w}px`; c.style.display = hideW ? "none" : ""; }
      if (d) { d.style.height = `${w}px`; d.style.display = hideW ? "none" : ""; }
      CrossHairSettings[0].Width = w;
      break;
    }
    case "Height": {
      const v = parseInt(_0x15301, 10);
      const h = isNaN(v) ? 10 : v;
      const a = crosshairEl("crosshairVerticalLine");
      const b = crosshairEl("crosshairVerticalLine1");
      const c = crosshairEl("crosshairHorizontalLine");
      const d = crosshairEl("crosshairHorizontalLine1");
      const hideH = h <= 0;
      if (a) { a.style.height = `${h}px`; a.style.display = hideH ? "none" : ""; }
      if (b) { b.style.height = `${h}px`; b.style.display = hideH ? "none" : ""; }
      if (c) { c.style.width = `${h}px`; c.style.display = hideH ? "none" : ""; }
      if (d) { d.style.width = `${h}px`; d.style.display = hideH ? "none" : ""; }
      CrossHairSettings[0].Height = h;
      break;
    }
    case "CenterDistance": {
      const v = parseInt(_0x15301, 10);
      const m = isNaN(v) ? 0 : v;
      if (pt) pt.style.margin = "0";
      applyCrosshairGapPreview(m);
      CrossHairSettings[0].CenterDistance = m;
      break;
    }
    case "ChossHairOpacity": {
      const o = parseFloat(_0x15301);
      const op = isNaN(o) ? 1 : Math.max(0, Math.min(1, o));
      const ids = ["crosshairVerticalLine", "crosshairVerticalLine1", "crosshairHorizontalLine", "crosshairHorizontalLine1", "crosshairCenterPoint"];
      for (let i = 0; i < ids.length; i++) {
        const el = crosshairEl(ids[i]);
        if (el) el.style.opacity = String(op);
      }
      CrossHairSettings[0].ChossHairOpacity = op;
      break;
    }
    case "CenterPointVisible": {
      const vis = _0x15301 === true || _0x15301 === "true" || _0x15301 === 1 || _0x15301 === "1";
      CrossHairSettings[0].CenterPointVisible = vis;
      if (pt) {
        pt.style.display = vis ? "block" : "none";
        if (vis) {
          const sz = parseInt(CrossHairSettings[0].CenterPointSize, 10);
          const s = Number.isFinite(sz) && sz > 0 ? sz : 1;
          pt.style.width = `${s}px`;
          pt.style.height = `${s}px`;
        }
      }
      try {
        const cbx = document.getElementById("aim_checkbox_settings");
        if (cbx) cbx.checked = vis;
        bmSyncCrosshairCenterDots();
      } catch (_eCp) {}
      break;
    }
    case "CenterPointSize": {
      const v = parseInt(_0x15301, 10);
      const s = isNaN(v) ? 1 : v;
      if (pt) {
        pt.style.height = `${s}px`;
        pt.style.width = `${s}px`;
      }
      CrossHairSettings[0].CenterPointSize = s;
      break;
    }
    case "CenterPointRadius": {
      const v = parseInt(_0x15301, 10);
      const r = isNaN(v) ? 0 : v;
      if (pt) pt.style.borderRadius = `${r}%`;
      CrossHairSettings[0].CenterPointRadius = r;
      break;
    }
    case "CrosshairRadius": {
      const v = parseInt(_0x15301, 10);
      const r = isNaN(v) ? 0 : v;
      const a = crosshairEl("crosshairVerticalLine");
      const b = crosshairEl("crosshairVerticalLine1");
      const c = crosshairEl("crosshairHorizontalLine");
      const d = crosshairEl("crosshairHorizontalLine1");
      if (a) a.style.borderRadius = `${r}% ${r}% 0 0`;
      if (b) b.style.borderRadius = `0 0 ${r}% ${r}%`;
      if (c) c.style.borderRadius = `${r}% 0 0 ${r}%`;
      if (d) d.style.borderRadius = `0 ${r}% ${r}% 0`;
      CrossHairSettings[0].CrosshairRadius = r;
      break;
    }
    case "DefaultColor": {
      const hex = normalizeCrosshairHex(_0x15301);
      CrossHairSettings[0].DefaultColor = hex;
      try {
        var nd = document.getElementById("ch_native_default");
        if (nd) nd.value = hex;
      } catch (_e) {}
      refreshCrosshairPreviewPaint();
      syncCrosshairColorSwatches();
      break;
    }
    case "TargetColor": {
      const hexT = normalizeCrosshairHex(_0x15301);
      CrossHairSettings[0].TargetColor = hexT;
      try {
        var nt = document.getElementById("ch_native_target");
        if (nt) nt.value = hexT;
      } catch (_e2) {}
      refreshCrosshairPreviewPaint();
      syncCrosshairColorSwatches();
      break;
    }
  }
  try {
    if (typeof CustomCrosshair !== "undefined" && CustomCrosshair && CrossHairSettings && CrossHairSettings[0] && typeof mp !== "undefined" && mp.trigger) {
      mp.trigger("crosshairLiveHud", JSON.stringify(CrossHairSettings));
    }
  } catch (_eLive) {}
  scheduleCrosshairPersistStorage();
}
function crosshairSave() {
  if (bmCrosshairPersistTimer) {
    clearTimeout(bmCrosshairPersistTimer);
    bmCrosshairPersistTimer = null;
  }
  mp.trigger("crosshairSave", JSON.stringify(CrossHairSettings));
}
function changeCrossHairDisplay(_0x13F19) {
  switch (_0x13F19) {
    case true:
      $(".aim-setting").css("display", "block");
      break;
    default:
      $(".aim-setting").css("display", "none");
      break;
  }
}
let CurrentWalkieWave = 1;
function ChangewalkieCurrentWave(_0x13F19) {
  switch (_0x13F19) {
    case "plus":
      if (CurrentWalkieWave == 50) {
        CurrentWalkieWave = 1;
        document.getElementById("walkieCurrentWave").innerText = `${CurrentWalkieWave}`;
        mp.trigger("WalkiechangePickedWave", CurrentWalkieWave);
      } else {
        CurrentWalkieWave++;
        document.getElementById("walkieCurrentWave").innerText = `${CurrentWalkieWave}`;
        mp.trigger("WalkiechangePickedWave", CurrentWalkieWave);
      }
      break;
    case "minus":
      if (CurrentWalkieWave == 1) {
        CurrentWalkieWave = 50;
        document.getElementById("walkieCurrentWave").innerText = `${CurrentWalkieWave}`;
        mp.trigger("WalkiechangePickedWave", CurrentWalkieWave);
      } else {
        CurrentWalkieWave--;
        document.getElementById("walkieCurrentWave").innerText = `${CurrentWalkieWave}`;
        mp.trigger("WalkiechangePickedWave", CurrentWalkieWave);
      }
      break;
  }
}
function WalkieEnterWave() {
  mp.trigger("WalkieEnterWave", CurrentWalkieWave);
}
function changeWalkieConnect(_0x13F19, _0x15627) {
  switch (_0x13F19) {
    case "connect":
      document.getElementById("WalkieSeccessConnect").style.opacity = 1;
      document.getElementById("WalkieSeccessConnect").innerText = `Вы подключены! (волна ${_0x15627})`;
      break;
    default:
      document.getElementById("WalkieSeccessConnect").style.opacity = 0;
      break;
  }
}
var WalkieDisplay = "close";
function changeWalkieDisplay(_0x14683) {
  switch (_0x14683) {
    case "open":
      if (WalkieDisplay == "open") {
        return;
      }
      document.getElementById("walkie-talkie").style.display = "block";
      $("#walkie-talkieMainBlock").animate({
        bottom: "32px"
      }, 500);
      WalkieDisplay = "open";
      break;
    case "close":
      if (WalkieDisplay == "close") {
        return;
      }
      WalkieDisplay = "close";
      $("#walkie-talkieMainBlock").animate({
        bottom: "-675px"
      }, 500);
      setTimeout(() => {
        document.getElementById("walkie-talkie").style.display = "none";
      }, 510);
      break;
  }
}
function changeFamilyBuy(_0x13F19) {
  switch (_0x13F19) {
    case "open":
      document.getElementById("family-system").style.display = "block";
      break;
    default:
      document.getElementById("family-system").style.display = "none";
      break;
  }
}
let inviteFmqTimeout = null;
function familyInviteTargetBlock(_0x158CB, _0x158B1, _0x15897, _0x1587D) {
  document.getElementById("familyInviteBlockTargetID").innerHTML = `<a>[#${_0x158CB}] ${_0x158B1} (${_0x15897})</a> пригласил вас в семью ${_0x1587D}`;
  document.getElementById("familyInviteBlock").style.display = "block";
  if (inviteFmqTimeout != null) {
    clearTimeout(inviteFmqTimeout);
  }
  inviteFmqTimeout = setTimeout(() => {
    document.getElementById("familyInviteBlock").style.display = "none";
    mp.trigger("FamilyInviteTargetInteraction", "rejected", "timeout");
    inviteFmqTimeout = null;
  }, 8000);
}
function FamilyInviteTargetInteraction(_0x13F19, _0x158E5) {
  if (inviteFmqTimeout != null) {
    clearTimeout(inviteFmqTimeout);
    inviteFmqTimeout = null;
  }
  switch (_0x13F19) {
    case "accept":
      mp.trigger("FamilyInviteTargetInteraction", "accept", _0x158E5);
      document.getElementById("familyInviteBlock").style.display = "none";
      break;
    case "rejected":
      mp.trigger("FamilyInviteTargetInteraction", "rejected", _0x158E5);
      document.getElementById("familyInviteBlock").style.display = "none";
      break;
  }
}
function NPCInteraction(_0x13F19) {
  switch (_0x13F19) {
    case 1:
      document.getElementById("NPCInteractionButtons").style.display = "none";
      document.getElementById("NPCInteractionText").innerText = `Хорошо. Чтобы тебе было проще освоиться, дам тебе пару заданий. Выполни их и возвращайся!\n(Задания в правом верхнем углу)`;
      setTimeout(() => {
        document.getElementById("messages").style.display = "none";
        mp.trigger("NPCStopIntercation");
      }, 5000);
      break;
    case 2:
      break;
    case 3:
      document.getElementById("messages").style.display = "none";
      mp.trigger("NPCStopIntercation");
      break;
  }
}
let IntercationAudio = new Audio();
function playRadio() {
  IntercationAudio.src = "sounds/on.ogg";
  IntercationAudio.volume = 0.5;
  IntercationAudio.play();
}
document.addEventListener("selectstart", function (e) {
  const tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : "";
  if (tag !== "input" && tag !== "textarea") e.preventDefault();
});
document.addEventListener("dragstart", function (e) {
  e.preventDefault();
});
function copyInClip(_0x156DD) {
  return false;
}
let currentAIMGame = 0;
let AIMGAMESSuccess = 0;
let AIMGAMESMiss = 0;
let raininterval = null;
function AIMGamesMissed() {
  AIMGAMESMiss++;
  document.getElementById("AIMGAMESMissClick").innerText = `${AIMGAMESMiss}`;
}
function AIMGAMESStart(_0x13F19) {
  AIMGAMESSuccess = 0;
  AIMGAMESMiss = 0;
  let rainRoot = document.getElementById("aimgames-rain-root");
  if (rainRoot) {
    rainRoot.innerHTML = "";
  }
  let _0x1500F = document.getElementById("AIMGAMESPoint");
  _0x1500F.style.display = "block";
  currentAIMGame = parseInt(_0x13F19);
  let _0x14FF5 = getRandomInRange(80, window.innerWidth - 80);
  let _0x15029 = getRandomInRange(80, window.innerHeight - 80);
  AIMGAMESInterval(60);
  setTimeout(() => {
    _0x1500F.style.left = `${_0x14FF5}px`;
    _0x1500F.style.top = `${_0x15029}px`;
  }, 10);
  if (_0x13F19 == 3) {
    _0x1500F.style.display = "none";
    if (raininterval != null) {
      clearInterval(raininterval);
      raininterval = null;
    }
    let _0x14753 = 0;
    raininterval = setInterval(() => {
      _0x14FF5 = getRandomInRange(80, window.innerWidth - 80);
      _0x15029 = getRandomInRange(80, window.innerHeight - 80);
      if (!rainRoot) {
        rainRoot = document.getElementById("aimgames-rain-root");
      }
      if (rainRoot) {
        rainRoot.insertAdjacentHTML('beforeend', `<div class="mini-games-menu_point-position" id="AIMGAMESPoint${_0x14753}" style="left: ${_0x14FF5}px; top: ${_0x15029}px;" onmouseenter="AIMGAMESPointClickRain('${_0x14753}')">
            <div class="mini-games-menu_point">
              <div class="mini-games-menu_point-inner">
              </div>
            </div>
          </div>`);
      }
      _0x14753++;
      if (_0x14753 >= 400) {
        clearInterval(raininterval);
        raininterval = null;
        gaimgamesFinish();
      }
    }, 150);
  }
}
function gaimgamesFinish() {
  mp.trigger('notify:client', 3, 'top-mid', `Игра закончена, попаданий: ${AIMGAMESSuccess}!`, 3000);
  $("#GAIMGamesExitGame").trigger("click");
}
function AIMGAMESPointClickRain(_0x15043) {
  let _0x1500F = document.getElementById(`AIMGAMESPoint${_0x15043}`);
  _0x1500F.remove();
  AIMGAMESSuccess++;
  document.getElementById("AIMGAMESSuccessClick").innerText = `${AIMGAMESSuccess}`;
  IntercationAudio.src = "sounds/checkon.ogg";
  IntercationAudio.volume = 0.5;
  IntercationAudio.play();
}
function AIMGAMESPointClick(_0x13F19) {
  if (_0x13F19 == "relax" && currentAIMGame != 2) {
    return;
  }
  let _0x1500F = document.getElementById("AIMGAMESPoint");
  let _0x14FF5 = getRandomInRange(80, window.innerWidth - 80);
  let _0x15029 = getRandomInRange(80, window.innerHeight - 80);
  _0x1500F.style.left = `${_0x14FF5}px`;
  _0x1500F.style.top = `${_0x15029}px`;
  _0x1500F.style.display = "block";
  IntercationAudio.src = "sounds/checkon.ogg";
  IntercationAudio.volume = 0.5;
  IntercationAudio.play();
  AIMGAMESSuccess++;
  document.getElementById("AIMGAMESSuccessClick").innerText = `${AIMGAMESSuccess}`;
}
let AIMGAMESITimenterval = null;
function AIMGAMESInterval(_0x14FA7) {
  let _0x14FC1 = getGangwarCaptureTime(60);
  document.getElementById("AIMGAMESLeftTime").innerText = `${_0x14FC1}`;
  let _0x14FDB = parseInt(_0x14FA7);
  document.getElementById("AIMGAMESLeftTime").innerText = `${getGangwarCaptureTime(_0x14FDB)}`;
  if (AIMGAMESITimenterval != null) {
    clearInterval(AIMGAMESITimenterval);
    AIMGAMESITimenterval = null;
  }
  AIMGAMESITimenterval = setInterval(() => {
    _0x14FDB--;
    document.getElementById("AIMGAMESLeftTime").innerText = `${getGangwarCaptureTime(_0x14FDB)}`;
    if (_0x14FDB <= 0) {
      gaimgamesFinish();
      clearInterval(AIMGAMESITimenterval);
      AIMGAMESITimenterval = null;
    }
  }, 1000);
}
function clearAIMGAMESTimer() {
  if (AIMGAMESITimenterval != null) {
    clearInterval(AIMGAMESITimenterval);
    AIMGAMESITimenterval = null;
  }
  if (raininterval != null) {
    clearInterval(raininterval);
    raininterval = null;
  }
  let rainRoot = document.getElementById("aimgames-rain-root");
  if (rainRoot) {
    rainRoot.innerHTML = "";
  }
  for (let _0x137C9 = 0; _0x137C9 < 400; _0x137C9++) {
    let _0x1500F = document.getElementById(`AIMGAMESPoint${_0x137C9}`);
    if (_0x1500F != null || _0x1500F != undefined) {
      _0x1500F.remove();
    }
  }
}
setTimeout(() => {
  if (window.__F10_SHOP_EMBED) return;
  addItemsInGangwarShop();
}, 1000);
