  var CASE_ROULETTE_MIN_SPIN = 20;
  var CASE_ROULETTE_RIGHT_BUFFER = 20;
  function caseRouletteStripCopies(baseCount) {
	var base = Math.max(1, parseInt(baseCount, 10) || 1);
	var need = CASE_ROULETTE_MIN_SPIN + CASE_ROULETTE_RIGHT_BUFFER + base + 2;
	return Math.max(6, Math.ceil(need / base));
  }
  function cloneCaseStrip(selector, cloneLoops) {
	var $ul = $(selector);
	if (!$ul.length) return 0;
	var baseCount = $ul.children("li").length;
	if (!baseCount) return 0;
	$ul.children("li").slice(baseCount).remove();
	var loops = cloneLoops != null ? parseInt(cloneLoops, 10) : (caseRouletteStripCopies(baseCount) - 1);
	if (!Number.isFinite(loops) || loops < 1) loops = 5;
	for (var i = 0; i < loops; i++) {
	  $ul.children("li").slice(0, baseCount).clone().appendTo($ul);
	}
	return baseCount;
  }
$(document).ready(function () {
	cloneCaseStrip(".Slots.s_case");
	cloneCaseStrip(".Slots.g_case");
	cloneCaseStrip(".Slots.gun_case");
	if ($(".Slots.armor_case li").length) {
	  cloneCaseStrip(".Slots.armor_case");
	}
  });
  var ItemsData = [{
	itemname: "20.000$",
	Price: "20000",
	ItemImg: "ItemCash"
  }, {
	itemname: "Prototipo",
	Price: "273000",
	ItemImg: "ItemPrototipo"
  }, {
	itemname: "CombatMG",
	Price: "150000",
	ItemImg: "ItemCombatMG"
  }, {
	itemname: "5.000$",
	Price: "5000",
	ItemImg: "ItemCash"
  }, {
	itemname: "Sultan2",
	Price: "42250",
	ItemImg: "ItemSultan2"
  }, {
	itemname: "100.000$",
	Price: "100000",
	ItemImg: "ItemCash"
  }, {
	itemname: "50.000$",
	Price: "2250",
	ItemImg: "ItemGusenbergSweeper"
  }, {
	itemname: "3.000$",
	Price: "3000",
	ItemImg: "ItemCash"
  }, {
	itemname: "Tezeract",
	Price: "253500",
	ItemImg: "ItemTezeract"
  }, {
	itemname: "15.000$",
	Price: "15000",
	ItemImg: "ItemCash"
  }, {
	itemname: "Cyclone",
	Price: "84500",
	ItemImg: "ItemCyclone"
  }, {
	itemname: "50.000$",
	Price: "50000",
	ItemImg: "ItemCash"
  }, {
	itemname: "HeavyShotgun",
	Price: "900",
	ItemImg: "ItemHeavyShotgun"
  }];
  var ActiveStatus = 0;
  var LastItemDrop = null;
  let RouletteAudio = new Audio();
  var CASE_ROULETTE_SPIN_MS = 8500;
  function caseRollDurationMs() {
	return 5200 + Math.floor(Math.random() * 2801);
  }
  if (typeof $ !== "undefined" && $.easing && !$.easing.easeOutCubic) {
	$.easing.easeOutCubic = function (_x, t, b, c, d) {
	  t = t / d - 1;
	  return c * (t * t * t + 1) + b;
	};
  }
  function caseRouletteEasing() {
	return $.easing && $.easing.easeOutCubic ? "easeOutCubic" : "swing";
  }
  function caseRouletteRightPx(liIdx) {
	var i = parseInt(liIdx, 10);
	if (!Number.isFinite(i) || i < 0) i = 0;
	return i * 180 + (i * 12 - 12) - 540;
  }
  function StartRouletteSilver(_0x14ED7, durationMs) {
	PrizeItem = parseInt(_0x14ED7);
	$(".SlotsWindow.s_case").css({
	  right: "0"
	});
	var _0x13AD5 = caseRouletteLiIndexForCase("SilverCase", _0x14ED7);
	$(".Slots.s_case li:eq(" + _0x13AD5 + ")").css({
	  border: "6px solid transparent;"
	});
	var ms = durationMs != null ? durationMs : CASE_ROULETTE_SPIN_MS;
	$(".SlotsWindow.s_case").animate({
	  right: caseRouletteRightPx(_0x13AD5)
	}, ms, caseRouletteEasing());
  }
  function StartRouletteGold(_0x14ED7, durationMs) {
	PrizeItem = parseInt(_0x14ED7);
	$(".SlotsWindow.g_case").css({
	  right: "0"
	});
	var _0x13AD5 = caseRouletteLiIndexForCase("GoldCase", _0x14ED7);
	$(".Slots.g_case li:eq(" + _0x13AD5 + ")").css({
	  border: "6px solid transparent;"
	});
	var ms = durationMs != null ? durationMs : CASE_ROULETTE_SPIN_MS;
	$(".SlotsWindow.g_case").animate({
	  right: caseRouletteRightPx(_0x13AD5)
	}, ms, caseRouletteEasing());
  }
  function StartRouletteArmor(_0x14ED7, durationMs) {
	PrizeItem = parseInt(_0x14ED7);
	$(".SlotsWindow.armor_case").css({
	  right: "0"
	});
	var _0x13AD5 = caseRouletteLiIndexForCase("ArmorCase", _0x14ED7);
	$(".Slots.armor_case li:eq(" + _0x13AD5 + ")").css({
	  border: "6px solid transparent;"
	});
	var ms = durationMs != null ? durationMs : CASE_ROULETTE_SPIN_MS;
	$(".SlotsWindow.armor_case").animate({
	  right: caseRouletteRightPx(_0x13AD5)
	}, ms, caseRouletteEasing());
  }
  function StartRouletteGun(_0x14ED7, durationMs) {
	PrizeItem = parseInt(_0x14ED7);
	$(".SlotsWindow.gun_case").css({
	  right: "0"
	});
	var _0x13AD5 = caseRouletteLiIndexForCase("GunCase", _0x14ED7);
	$(".Slots.gun_case li:eq(" + _0x13AD5 + ")").css({
	  border: "6px solid transparent;"
	});
	var ms = durationMs != null ? durationMs : CASE_ROULETTE_SPIN_MS;
	$(".SlotsWindow.gun_case").animate({
	  right: caseRouletteRightPx(_0x13AD5)
	}, ms, caseRouletteEasing());
  }
  function cloneAll(_0x14753) {
	document.getElementById("RouletteResultUsers").innerHTML = "";
	for (let _0x137C9 = 1; _0x137C9 < _0x14753 + 1; _0x137C9++) {
	  document.getElementById("RouletteResultUsers").innerHTML += `<li>
	  <p class="Slots_id-player">#${_0x137C9}</p>
	  <a class="Slots_name-player">Ruslan</a>
	  <p class="Slots_full-name-player">Ruslan${_0x137C9}</p>
	  </li>`;
	}
	$(".SlotsWindow.roulet-main_SlotsWindow").css("transition", "all 100ms cubic-bezier(0.32, 0.64, 0.45, 1) 0ms");
	$(".SlotsWindow.roulet-main_SlotsWindow").css("transform", `translate3d(0px, 0px, 0px)`);
  }
  function StartRouletteMain(_0x14ED7) {
	let _0x16A91 = document.getElementById("RouletteResultUsers").querySelectorAll("li").length;
	for (let _0x137C9 = 0; _0x137C9 < 6; _0x137C9++) {
	  if (parseInt(document.getElementById("RouletteResultUsers").querySelectorAll("li").length) < 200) {
		$(".Slots.roulet-main_Slots li").clone().appendTo(".Slots.roulet-main_Slots");
		console.log(document.getElementById("RouletteResultUsers").querySelectorAll("li").length);
	  } else {}
	}
	$(".SlotsWindow.roulet-main_SlotsWindow").css("transform", `translate3d(0px, 0px, 0px)`);
	setTimeout(() => {
	  GALAXYGames.GameStatus = "ShowResult";
	  var _0x13AD5 = 100 + parseInt(_0x14ED7);
	  let _0x16AAB = 0;
	  switch (_0x16A91) {
		case 2:
		  _0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 221;
		  break;
		case 3:
		  _0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 120;
		  break;
		case 4:
		  _0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 50;
		  break;
		case 5:
		  _0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 230;
		  break;
		case 6:
		  _0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 400;
		  break;
		case 7:
		  _0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 50;
		  break;
		case 8:
		  _0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 50;
		  break;
		case 9:
		  _0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 410;
		  break;
		case 10:
		  _0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 235;
		  break;
		case 11:
		  _0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 235;
		  break;
		case 12:
		  _0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 425;
		  break;
		case 13:
		  if (_0x14ED7 <= 8) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 780;
		  } else if (_0x14ED7 > 8) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 800;
		  }
		  break;
		case 14:
		  if (_0x14ED7 <= 8) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 50;
		  } else if (_0x14ED7 > 8) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 80;
		  }
		  break;
		case 15:
		  if (_0x14ED7 <= 8) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 680;
		  } else if (_0x14ED7 > 8) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 720;
		  }
		  break;
		case 16:
		  if (_0x14ED7 <= 8) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 50;
		  } else if (_0x14ED7 > 8) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 100;
		  }
		  break;
		case 17:
		  if (_0x14ED7 <= 8) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 950;
		  } else if (_0x14ED7 > 8) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 995;
		  }
		  break;
		case 18:
		  if (_0x14ED7 <= 9) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 410;
		  } else if (_0x14ED7 > 9) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 470;
		  }
		  break;
		case 19:
		  if (_0x14ED7 <= 9) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - -130;
		  } else if (_0x14ED7 > 9) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - -70;
		  }
		  break;
		case 20:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1135;
		  } else if (_0x14ED7 > 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1200;
		  }
		  break;
		case 21:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 685;
		  } else if (_0x14ED7 > 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 750;
		  }
		  break;
		case 22:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 235;
		  } else if (_0x14ED7 > 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 310;
		  }
		  break;
		case 23:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - -210;
		  } else if (_0x14ED7 > 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - -140;
		  }
		  break;
		case 24:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1500;
		  } else if (_0x14ED7 > 10 && _0x14ED7 < 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1555;
		  } else if (_0x14ED7 >= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1600;
		  }
		  break;
		case 25:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1140;
		  } else if (_0x14ED7 > 10 && _0x14ED7 < 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1200;
		  } else if (_0x14ED7 >= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1230;
		  }
		  break;
		case 26:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 780;
		  } else if (_0x14ED7 > 10 && _0x14ED7 < 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 840;
		  } else if (_0x14ED7 >= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 890;
		  }
		  break;
		case 27:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 420;
		  } else if (_0x14ED7 > 10 && _0x14ED7 < 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 480;
		  } else if (_0x14ED7 >= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 520;
		  }
		  break;
		case 28:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 80;
		  } else if (_0x14ED7 > 10 && _0x14ED7 < 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 110;
		  } else if (_0x14ED7 >= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 180;
		  }
		  break;
		case 29:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - -300;
		  } else if (_0x14ED7 > 10 && _0x14ED7 < 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - -250;
		  } else if (_0x14ED7 >= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - -190;
		  }
		  break;
		case 30:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2040;
		  } else if (_0x14ED7 > 10 && _0x14ED7 <= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2100;
		  } else if (_0x14ED7 > 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2160;
		  }
		  break;
		case 31:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1770;
		  } else if (_0x14ED7 > 10 && _0x14ED7 <= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1830;
		  } else if (_0x14ED7 > 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1890;
		  }
		  break;
		case 32:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1500;
		  } else if (_0x14ED7 > 10 && _0x14ED7 <= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1560;
		  } else if (_0x14ED7 > 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1625;
		  }
		  break;
		case 33:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1235;
		  } else if (_0x14ED7 > 10 && _0x14ED7 <= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1290;
		  } else if (_0x14ED7 > 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1360;
		  }
		  break;
		case 34:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 960;
		  } else if (_0x14ED7 > 10 && _0x14ED7 <= 22) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1030;
		  } else if (_0x14ED7 > 22) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1100;
		  }
		  break;
		case 35:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 685;
		  } else if (_0x14ED7 > 10 && _0x14ED7 <= 22) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 760;
		  } else if (_0x14ED7 > 22) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 832;
		  }
		  break;
		case 36:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 420;
		  } else if (_0x14ED7 > 10 && _0x14ED7 <= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 480;
		  } else if (_0x14ED7 > 20 && _0x14ED7 <= 30) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 540;
		  } else if (_0x14ED7 > 30 && _0x14ED7 <= 40) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 600;
		  }
		  break;
		case 37:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 150;
		  } else if (_0x14ED7 > 10 && _0x14ED7 <= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 220;
		  } else if (_0x14ED7 > 20 && _0x14ED7 <= 30) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 280;
		  } else if (_0x14ED7 > 30 && _0x14ED7 <= 40) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 320;
		  }
		  break;
		case 38:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - -120;
		  } else if (_0x14ED7 > 10 && _0x14ED7 <= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - -50;
		  } else if (_0x14ED7 > 20 && _0x14ED7 <= 30) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 0;
		  } else if (_0x14ED7 > 30 && _0x14ED7 <= 40) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 50;
		  }
		  break;
		case 39:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 3120;
		  } else if (_0x14ED7 > 10 && _0x14ED7 <= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 3180;
		  } else if (_0x14ED7 > 20 && _0x14ED7 <= 30) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 3250;
		  } else if (_0x14ED7 > 30 && _0x14ED7 <= 40) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 3300;
		  }
		  break;
		case 40:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2940;
		  } else if (_0x14ED7 > 10 && _0x14ED7 <= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 3000;
		  } else if (_0x14ED7 > 20 && _0x14ED7 <= 30) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 3065;
		  } else if (_0x14ED7 > 30 && _0x14ED7 <= 40) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 3120;
		  }
		  break;
		case 41:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2760;
		  } else if (_0x14ED7 > 10 && _0x14ED7 <= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2820;
		  } else if (_0x14ED7 > 20 && _0x14ED7 <= 30) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2880;
		  } else if (_0x14ED7 > 30 && _0x14ED7 <= 40) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2950;
		  } else if (_0x14ED7 > 40 && _0x14ED7 <= 50) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 3000;
		  }
		  break;
		case 42:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2580;
		  } else if (_0x14ED7 > 10 && _0x14ED7 <= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2640;
		  } else if (_0x14ED7 > 20 && _0x14ED7 <= 30) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2700;
		  } else if (_0x14ED7 > 30 && _0x14ED7 <= 40) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2760;
		  } else if (_0x14ED7 > 40 && _0x14ED7 <= 50) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2800;
		  }
		  break;
		case 43:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2400;
		  } else if (_0x14ED7 > 10 && _0x14ED7 <= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2460;
		  } else if (_0x14ED7 > 20 && _0x14ED7 <= 30) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2520;
		  } else if (_0x14ED7 > 30 && _0x14ED7 <= 40) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2580;
		  } else if (_0x14ED7 > 40 && _0x14ED7 <= 50) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2610;
		  }
		  break;
		case 44:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2220;
		  } else if (_0x14ED7 > 10 && _0x14ED7 <= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2280;
		  } else if (_0x14ED7 > 20 && _0x14ED7 <= 30) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2350;
		  } else if (_0x14ED7 > 30 && _0x14ED7 <= 40) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2400;
		  } else if (_0x14ED7 > 40 && _0x14ED7 <= 50) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2430;
		  }
		  break;
		case 45:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2040;
		  } else if (_0x14ED7 > 10 && _0x14ED7 <= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2100;
		  } else if (_0x14ED7 > 20 && _0x14ED7 <= 30) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2160;
		  } else if (_0x14ED7 > 30 && _0x14ED7 <= 40) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2220;
		  } else if (_0x14ED7 > 40 && _0x14ED7 <= 50) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2250;
		  }
		  break;
		case 46:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1860;
		  } else if (_0x14ED7 > 10 && _0x14ED7 <= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1920;
		  } else if (_0x14ED7 > 20 && _0x14ED7 <= 30) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1980;
		  } else if (_0x14ED7 > 30 && _0x14ED7 <= 40) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2045;
		  } else if (_0x14ED7 > 40 && _0x14ED7 <= 50) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 2080;
		  }
		  break;
		case 47:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1680;
		  } else if (_0x14ED7 > 10 && _0x14ED7 <= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1740;
		  } else if (_0x14ED7 > 20 && _0x14ED7 <= 30) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1800;
		  } else if (_0x14ED7 > 30 && _0x14ED7 <= 40) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1860;
		  } else if (_0x14ED7 > 40 && _0x14ED7 <= 50) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1900;
		  }
		  break;
		case 48:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1500;
		  } else if (_0x14ED7 > 10 && _0x14ED7 <= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1560;
		  } else if (_0x14ED7 > 20 && _0x14ED7 <= 30) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1620;
		  } else if (_0x14ED7 > 30 && _0x14ED7 <= 40) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1680;
		  } else if (_0x14ED7 > 40 && _0x14ED7 <= 50) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1730;
		  }
		  break;
		case 49:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1320;
		  } else if (_0x14ED7 > 10 && _0x14ED7 <= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1380;
		  } else if (_0x14ED7 > 20 && _0x14ED7 <= 30) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1440;
		  } else if (_0x14ED7 > 30 && _0x14ED7 <= 40) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1500;
		  } else if (_0x14ED7 > 40 && _0x14ED7 <= 50) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1555;
		  }
		  break;
		case 50:
		  if (_0x14ED7 <= 10) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1140;
		  } else if (_0x14ED7 > 10 && _0x14ED7 <= 20) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1200;
		  } else if (_0x14ED7 > 20 && _0x14ED7 <= 30) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1260;
		  } else if (_0x14ED7 > 30 && _0x14ED7 <= 40) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1320;
		  } else if (_0x14ED7 > 40 && _0x14ED7 <= 50) {
			_0x16AAB = _0x13AD5 * 88 + (_0x13AD5 * 8 - 12) - 1380;
		  }
		  break;
	  }
	  setTimeout(() => {
		GALAXYGames.CurrentWinnerShow = 1;
	  }, 12500);
	  setTimeout(() => {
		GALAXYGames.GameNumber = parseInt(GALAXYGames.GameNumber) + 1;
		GALAXYGames.GameStatus = "wait";
		document.getElementById("RouletteResultUsers").innerHTML = "";
		GALAXYGames.CurrentWinnerShow = 0;
		GALAXYGames.playerBets = [];
		GALAXYGames.playersChance = [];
		GALAXYGames.Bank = 0;
		GALAXYGames.BankString = "0";
		GALAXYGames.GameTimerSetFreeze();
	  }, 17000);
	  setTimeout(() => {
		$(".SlotsWindow.roulet-main_SlotsWindow").css("transition", "all 12000ms cubic-bezier(0.32, 0.64, 0.45, 1) 0ms");
		$(".SlotsWindow.roulet-main_SlotsWindow").css("transform", `translate3d(-${_0x16AAB}px, 0px, 0px)`);
	  }, 1000);
	}, 1100);
  }
  Number.prototype.toDivide = function () {
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
  let CasesData = [{
	Name: "SilverCase",
	FastOpen: false
  }, {
	Name: "GoldCase",
	FastOpen: false
  }, {
	Name: "ArmorCase",
	FastOpen: false
  }, {
	Name: "GunCase",
	FastOpen: false
  }];
  function changeCaseData(_0x13F19, _0x15195, _0xInputEl) {
	switch (_0x13F19) {
	  case "FastOpen":
		if (_0xInputEl && typeof _0xInputEl.checked === "boolean") {
		  CasesData[parseInt(_0x15195)].FastOpen = _0xInputEl.checked;
		} else {
		  CasesData[parseInt(_0x15195)].FastOpen = !CasesData[parseInt(_0x15195)].FastOpen;
		}
		break;
	}
  }
  function openDonateCase(_0x15195) {
	var idx = parseInt(_0x15195, 10);
	var c = CasesData[idx];
	if (!c) return;
	try {
	  mp.trigger("DonateCaseDoOpen", c.Name, c.FastOpen, "dp");
	} catch (_e) {}
  }
  function caseRarityTierFromPct(pct) {
	var p = parseFloat(pct);
	if (isNaN(p)) return "green";
	if (p <= 0.5) return "purple";
	if (p <= 5) return "red";
	if (p <= 15) return "yellow";
	if (p <= 35) return "blue";
	return "green";
  }
  function caseRarityBarHtml(tier) {
	return '<div class="case-rarity-bar case-rarity-bar--' + tier + '"></div>';
  }
  function parseChanceFromCell(cell) {
	if (!cell) return null;
	var ch = cell.querySelector(".prize-chance");
	if (!ch) return null;
	return parseFloat(String(ch.textContent || "").replace("%", "").trim());
  }
  function ensureCaseRarityBarOnCell(cell, pct) {
	if (!cell || cell.querySelector(".case-rarity-bar")) return;
	var tier = caseRarityTierFromPct(pct);
	cell.insertAdjacentHTML("afterbegin", caseRarityBarHtml(tier));
  }
  function decorateAllCaseRarityBars(root) {
	var scope = root || document;
	scope.querySelectorAll(".case-prize-cell, .case-prize-hint").forEach(function (cell) {
	  ensureCaseRarityBarOnCell(cell, parseChanceFromCell(cell));
	});
	scope.querySelectorAll("#boxes .Slots li").forEach(function (li) {
	  if (li.querySelector(".case-rarity-bar")) return;
	  var cell = li.querySelector(".case-prize-cell");
	  var pct = parseChanceFromCell(cell);
	  if (pct == null && typeof ARMOR_SHOP_VARIANTS !== "undefined" && ARMOR_SHOP_VARIANTS.length) {
	    pct = 100 / ARMOR_SHOP_VARIANTS.length;
	  }
	  li.insertAdjacentHTML("afterbegin", caseRarityBarHtml(caseRarityTierFromPct(pct)));
	});
  }
  function caseRouletteWindowForName(caseName) {
	switch (caseName) {
	  case "SilverCase": return ".SlotsWindow.s_case";
	  case "GoldCase": return ".SlotsWindow.g_case";
	  case "ArmorCase": return ".SlotsWindow.armor_case";
	  case "GunCase": return ".SlotsWindow.gun_case";
	  default: return null;
	}
  }
  function setCaseRouletteSpinning(caseName, on) {
	var sel = caseRouletteWindowForName(caseName);
	if (!sel) return;
	var wrap = document.querySelector(sel);
	if (!wrap || !wrap.parentElement) return;
	wrap.parentElement.classList.toggle("bm-case-spinning", !!on);
  }
  function openFreeCase(_0x15195) {
	return;
  }
  function clientSlotIndexByPrize(caseName, prizeName) {
	var arr = null;
	switch (caseName) {
	  case "SilverCase": arr = SilverCase; break;
	  case "GoldCase": arr = GoldCase; break;
	  case "ArmorCase": arr = ArmorCase; break;
	  case "GunCase": arr = GunCase; break;
	}
	if (!arr || !arr.length) return -1;
	for (var i = 0; i < arr.length; i++) {
	  if (casePrizeEquals(arr[i].Prize, prizeName)) return i;
	}
	return -1;
  }
  function casesDoRoll(_0x15195, _0x151AF, _0x151C9, _serverPrize) {
	var serverPrize = _serverPrize == null ? "" : String(_serverPrize);
	var fastOpen = _0x151AF === true || _0x151AF === 1 || _0x151AF === "true";
	var rollMs = !fastOpen ? caseRollDurationMs() : 0;
	// Если порядок на клиенте отличается от сервера (clothes/bags/gun) — крутим
	// рулетку по имени приза, чтобы визуально не показать «другой» приз.
	var rollSlot = _0x151C9;
	if (serverPrize) {
	  var resolved = clientSlotIndexByPrize(_0x15195, serverPrize);
	  if (resolved >= 0) rollSlot = resolved;
	}
	if (!fastOpen) {
	  setCaseRouletteSpinning(_0x15195, true);
	  switch (_0x15195) {
		case "SilverCase":
		  StartRouletteSilver(rollSlot, rollMs);
		  break;
		case "GoldCase":
		  StartRouletteGold(rollSlot, rollMs);
		  break;
		case "ArmorCase":
		  StartRouletteArmor(rollSlot, rollMs);
		  break;
		case "GunCase":
		  StartRouletteGun(rollSlot, rollMs);
		  break;
	  }
	  setTimeout(() => {
		setCaseRouletteSpinning(_0x15195, false);
		casesShowPrize(_0x15195, rollSlot, serverPrize);
	  }, rollMs + 350);
	} else {
	  casesShowPrize(_0x15195, rollSlot, serverPrize);
	}
  }
  function getCaseSlotMeta(caseName, slotIndex) {
	var idx = parseInt(slotIndex, 10);
	if (!Number.isFinite(idx) || idx < 0) idx = 0;
	var arr = null;
	switch (caseName) {
	  case "SilverCase":
		arr = SilverCase;
		break;
	  case "GoldCase":
		arr = GoldCase;
		break;
	  case "ArmorCase":
		arr = ArmorCase;
		break;
	  case "GunCase":
		arr = GunCase;
		break;
	}
	if (!arr || !arr.length) return null;
	if (idx >= arr.length) idx = arr.length - 1;
	return arr[idx];
  }
  function findCaseMetaByPrize(caseName, prizeName) {
	var pn = prizeName == null ? "" : String(prizeName).trim();
	if (!pn) return null;
	var arr = null;
	switch (caseName) {
	  case "SilverCase":
		arr = SilverCase;
		break;
	  case "GoldCase":
		arr = GoldCase;
		break;
	  case "ArmorCase":
		arr = ArmorCase;
		break;
	  case "GunCase":
		arr = GunCase;
		break;
	  default:
		arr = null;
	}
	if (!arr || !arr.length) return null;
	for (var i = 0; i < arr.length; i++) {
	  if (casePrizeEquals(arr[i].Prize, pn)) return arr[i];
	}
	return null;
  }
  function caseClothShortLabel(pStr) {
	if (!pStr || String(pStr).indexOf("CaseCloth|") !== 0) return null;
	var p = String(pStr).split("|");
	if (p.length < 4) return null;
	try {
	  var raw = decodeURIComponent(p[3]);
	  var base = raw.replace(/\s*\(\d+\s*слотов\)/gi, "").trim();
	  var i = base.indexOf(" · текст.");
	  if (i >= 0) base = base.slice(0, i).trim();
	  var i2 = base.indexOf(" · text.");
	  if (i2 >= 0) base = base.slice(0, i2).trim();
	  if (/[·•]\s*(?:текст|text)\.\d+/i.test(raw)) {
	    var mTex = String(raw).match(/(?:текст|text)\.(\d+)/i);
	    var v = mTex ? (parseInt(mTex[1], 10) || 0) + 1 : 1;
	    return base + " · Вариант " + v;
	  }
	  return base && base.trim() ? base.trim() : raw;
	} catch (_e) {
	  return null;
	}
  }
  function casesShowPrize(_0x15195, _0x151C9, _serverPrize) {
	var wrap = document.getElementById("CasesPrizeWindow");
	var nameEl = document.getElementById("CasesPrizeName");
	var imgEl = document.getElementById("CasesPrizeImg");
	var priceEl = document.getElementById("CasesPrizeSellLink");
	if (!wrap || !nameEl || !imgEl || !priceEl) return;
	var meta = null;
	var serverPrize = _serverPrize == null ? "" : String(_serverPrize).trim();
	if (serverPrize) meta = findCaseMetaByPrize(_0x15195, serverPrize);
	if (!meta) meta = getCaseSlotMeta(_0x15195, _0x151C9);
	let _0x151FD = meta ? meta.Prize : (serverPrize || "none");
	let _0x15217 = meta ? meta.Price : 0;
	let _0x151E3 = meta ? meta.img : "img/gift.png";
	var priceNum = parseInt(_0x15217, 10);
	if (!Number.isFinite(priceNum)) priceNum = 0;
	var sellPrice = Math.floor(priceNum / 2);
	var winLabel = meta && meta.Label ? meta.Label : caseClothShortLabel(serverPrize) || caseClothShortLabel(_0x151FD);
	nameEl.innerText = `Вы выиграли ${winLabel || _0x151FD}`;
	var glyph = casePrizeGlyph(winLabel || _0x151FD);
	if (typeof imgEl.tagName === "string" && imgEl.tagName.toLowerCase() === "img") {
	  imgEl.src = `${_0x151E3}`;
	  imgEl.onerror = function () {
	    this.onerror = null;
	    this.src = (meta && meta.imgFallback) ? meta.imgFallback : _0x151E3;
	  };
	} else {
	  imgEl.textContent = glyph;
	  imgEl.setAttribute("data-g", glyph);
	}
	priceEl.innerText = `Продать за ${sellPrice.toDivide()}$`;
	var isVipPrize = _0x151FD === "SilverVIP" || _0x151FD === "PlatinumVIP";
	var orEl = document.getElementById("CasesPrizeOr");
	var sellEl = document.getElementById("CasesPrizeSellLink");
	if (orEl) orEl.style.display = isVipPrize ? "none" : "";
	if (sellEl) sellEl.style.display = isVipPrize ? "none" : "";
	wrap.style.display = "block";
  }
  function closePrizeInteraction() {
	var el = document.getElementById("CasesPrizeWindow");
	if (!el) return;
	// Не сбрасываем оплаченный приз — только закрываем окно; забрать/продать можно снова
	el.style.display = "none";
  }
  function CasePrizeInteraction(_0x13F19) {
	document.getElementById("CasesPrizeWindow").style.display = "none";
	if (_0x13F19 == 'pick') {
		mp.trigger("collectPrize");
	} else {
		mp.trigger("sellPrize");
	}
  }
  let SilverCase = [{
	Prize: "20.000$",
	Label: "20.000 $",
	Price: 20000,
	img: "img/productMoney1.png"
  }, {
	Prize: "SilverVIP",
	Label: "Vip-Silver",
	Price: 250000,
	img: "img/productVIPSilver1.png"
  }, {
	Prize: "Lada 2107",
	Price: 35000,
	img: "package://browsers/vehicle_previews/lada2107.png"
  }, {
	Prize: "Audi",
	Price: 85000,
	img: "package://browsers/vehicle_previews/audisport.png"
  }, {
	Prize: "2022 C63",
	Price: 150000,
	img: "package://browsers/vehicle_previews/2022c63.png"
  }, {
	Prize: "Audi RS 7",
	Price: 300000,
	img: "package://browsers/vehicle_previews/2020rs7.png"
  }, {
	Prize: "Audi Q8",
	Price: 220000,
	img: "package://browsers/vehicle_previews/audiq8.png"
  }];
  let GoldCase = [{
	Prize: "20 DP",
	Label: "20 DP",
	Price: 12000,
	img: "img/productMoney2.png"
  }, {
	Prize: "35.000$",
	Label: "35.000 $",
	Price: 35000,
	img: "img/productMoney1.png"
  }, {
	Prize: "PlatinumVIP",
	Label: "Vip-Platinum",
	Price: 500000,
	img: "img/productVIPGold2.png"
  }, {
	Prize: "Chiron 17",
	Price: 550000,
	img: "package://browsers/vehicle_previews/chiron17.png"
  }, {
	Prize: "Lamborghini Sian",
	Price: 425000,
	img: "package://browsers/vehicle_previews/sian.png"
  }, {
	Prize: "Lada Raven",
	Price: 45000,
	img: "img/car/2021ladaraven.png"
  }, {
	Prize: "BMW M5",
	Price: 45000,
	img: "package://browsers/vehicle_previews/2019m5.png"
  }, {
	Prize: "Skateboard",
	Label: "Скейтборд",
	Price: 800000,
	img: "img/skateborde.png"
  }];
  let GunCase = [{
	Prize: "Heavy Sniper MK1",
	Label: "Heavy Sniper MK1",
	Price: 1500000,
	img: "img/boxes/platinum_case/prize_svc.png"
  }, {
	Prize: "Heavy Sniper MK2",
	Label: "Heavy Sniper MK2",
	Price: 37500,
	img: "img/boxes/weapon_heavysniper_mk2.png"
  }, {
	Prize: "SniperRifle",
	Label: "Sniper Rifle",
	Price: 125000,
	img: "img/boxes/silver_case/prize_sniper.png"
  }, {
	Prize: "Marksman Rifle",
	Label: "Marksman Rifle",
	Price: 60000,
	img: "img/boxes/marksman_case/marksmanrifle.png"
  }, {
	Prize: "Precision Rifle",
	Label: "Precision Rifle",
	Price: 150000,
	img: "img/boxes/weapon_precisionrifle.png"
  }];
  let ArmorCase = [];
  if (typeof ARMOR_SHOP_VARIANTS !== "undefined" && ARMOR_SHOP_VARIANTS.length) {
	for (let _armorI = 0; _armorI < ARMOR_SHOP_VARIANTS.length; _armorI++) {
	  let _armorV = ARMOR_SHOP_VARIANTS[_armorI];
	  ArmorCase.push({
		Prize: _armorV.name,
		Price: 25000,
		img: typeof window.armorCosmeticImgUrl === "function" ? window.armorCosmeticImgUrl(_armorV.img) : _armorV.img
	  });
	}
  }
  function casePrizeGlyph(label) {
	var l = String(label || "");
	if (l.indexOf("$") !== -1) return "$";
	if (l.indexOf("DP") !== -1) return "◈";
	if (/VIP/i.test(l)) return "♛";
	if (/Скейт|скейт|Skate/i.test(l)) return "S";
	var m = l.trim().match(/\S/);
	return m ? m[0].toUpperCase() : "◆";
  }
  function buildArmorCaseDom() {
	if (typeof ARMOR_SHOP_VARIANTS === "undefined" || !ARMOR_SHOP_VARIANTS.length) return;
	var $slots = $("#ArmorCaseRouletteSlots");
	var $prizes = $("#ArmorCasePrizesList");
	if (!$slots.length && !$prizes.length) return;
	var rouletteHtml = "";
	var prizesHtml = "";
	var accentStyle = "class=\"bm-slot-accent\"";
	var _fbArmor = window.ARMOR_COSMETIC_IMG_FB || "package://browsers/inventory/img/armor.svg";
	for (var _ai = 0; _ai < ARMOR_SHOP_VARIANTS.length; _ai++) {
	  var _av = ARMOR_SHOP_VARIANTS[_ai];
	  var _label = String(_av.name || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
	  var _img = typeof window.armorCosmeticImgUrl === "function" ? window.armorCosmeticImgUrl(_av.img) : _av.img;
	  var _liStyle = _ai % 4 === 2 ? accentStyle : "";
	  var _eqPct = (100 / ARMOR_SHOP_VARIANTS.length).toFixed(1);
	  var _tier = caseRarityTierFromPct(_eqPct);
	  var _bar = caseRarityBarHtml(_tier);
	  var _glyph = casePrizeGlyph(_label);
	  rouletteHtml += "<li " + _liStyle + "><div class=\"case-prize-cell\">" + _bar + "<span class=\"bm-prize-ico\" data-g=\"" + _glyph + "\">" + _glyph + "</span><span class=\"prize-label\">" + _label + "</span><span class=\"prize-chance\">" + _eqPct + "%</span></div></li>";
	  prizesHtml += "<li><div class=\"case-prize-hint\">" + _bar + "<span class=\"bm-prize-ico\" data-g=\"" + _glyph + "\">" + _glyph + "</span><span class=\"prize-label\">" + _label + "</span><span class=\"prize-chance\">" + _eqPct + "%</span></div></li>";
	}
	if ($slots.length) {
	  $slots.html(rouletteHtml);
	  var $armorUl = $(".Slots.armor_case");
	  if ($armorUl.length) {
	    var baseCount = $armorUl.children("li").length;
	    cloneCaseStrip(".Slots.armor_case", caseRouletteStripCopies(baseCount) - 1);
	    var liCount = $armorUl.children("li").length;
	    var stripPx = liCount * 180 + Math.max(0, liCount - 1) * 12;
	    $(".SlotsWindow.armor_case").css("min-width", Math.max(25000, stripPx) + "px");
	  }
	}
	if ($prizes.length) $prizes.html(prizesHtml);
	decorateAllCaseRarityBars(document.getElementById("boxes") || document);
  }
  $(function () {
	buildArmorCaseDom();
	decorateAllCaseRarityBars(document.getElementById("boxes") || document);
  });

  function parseCaseClothToken(p) {
	if (!p || String(p).indexOf("CaseCloth|") !== 0) return null;
	var parts = String(p).split("|");
	if (parts.length < 5) return null;
	var itemid = parseInt(parts[1], 10);
	var clothid = parseInt(parts[2], 10);
	var frac = parseInt(parts[4], 10);
	var itemname = "";
	try { itemname = decodeURIComponent(parts[3]); } catch (_dec) { itemname = parts[3] || ""; }
	if (!isFinite(itemid) || !isFinite(clothid)) return null;
	return { itemid: itemid, clothid: clothid, frac: isFinite(frac) ? frac : 1, itemname: itemname };
  }
  function casePrizeEquals(a, b) {
	var sa = String(a || "").trim();
	var sb = String(b || "").trim();
	if (sa === sb) return true;
	var pa = parseCaseClothToken(sa);
	var pb = parseCaseClothToken(sb);
	if (pa && pb) {
	  if (pa.itemid === pb.itemid && pa.clothid === pb.clothid && pa.frac === pb.frac) {
		if (!pa.itemname || !pb.itemname || pa.itemname === pb.itemname) return true;
	  }
	}
	return false;
  }
  function rebuildDonateClothCaseDom(slotsSel, prizesSel, arr) {
	if (!arr || !arr.length) return;
	var rouletteHtml = "";
	var prizesHtml = "";
	for (var i = 0; i < arr.length; i++) {
	  var row = arr[i];
	  var accent = (i % 4 === 1) ? ' class="bm-slot-accent"' : '';
	  var label = row.Label || row.Prize;
	  var pct = row.chancePct != null ? row.chancePct : (row.chance || "");
	  var tier = typeof caseRarityTierFromPct === "function" ? caseRarityTierFromPct(parseFloat(String(pct).replace("%", ""))) : "green";
	  var bar = typeof caseRarityBarHtml === "function" ? caseRarityBarHtml(tier) : "";
	  var glyph = casePrizeGlyph(label);
	  rouletteHtml += "<li" + accent + "><div class=\"case-prize-cell\">" + bar + "<span class=\"bm-prize-ico\" data-g=\"" + glyph + "\">" + glyph + "</span><span class=\"prize-label\">" + label + "</span><span class=\"prize-chance\">" + pct + "%</span></div></li>";
	  prizesHtml += "<li><div class=\"case-prize-hint\">" + bar + "<span class=\"bm-prize-ico\" data-g=\"" + glyph + "\">" + glyph + "</span><span class=\"prize-label\">" + label + "</span><span class=\"prize-chance\">" + pct + "%</span></div></li>";
	}
	var $slots = $(slotsSel);
	var $prizes = $(prizesSel);
	if ($slots.length) {
	  $slots.html(rouletteHtml);
	  cloneCaseStrip(slotsSel, caseRouletteStripCopies(arr.length) - 1);
	}
	if ($prizes.length) $prizes.html(prizesHtml);
  }
  function syncCaseCatalogFromServer(payload) {
	var data = payload;
	if (typeof payload === "string") {
	  try { data = JSON.parse(payload); } catch (_e) { return; }
	}
	if (!data || typeof data !== "object") return;
	if (typeof decorateAllCaseRarityBars === "function") {
	  decorateAllCaseRarityBars(document.getElementById("boxes") || document);
	}
  }
  window.syncCaseCatalogFromServer = syncCaseCatalogFromServer;

  function caseRouletteBaseCount(caseName) {
	var arr = null;
	switch (caseName) {
	  case "SilverCase": arr = SilverCase; break;
	  case "GoldCase": arr = GoldCase; break;
	  case "ArmorCase": arr = ArmorCase; break;
	  case "GunCase": arr = GunCase; break;
	  default: arr = null;
	}
	var base = arr && arr.length ? arr.length : 10;
	if (caseName === "ArmorCase" && base === 10 && typeof ARMOR_SHOP_VARIANTS !== "undefined" && ARMOR_SHOP_VARIANTS.length) {
	  base = ARMOR_SHOP_VARIANTS.length;
	}
	return base;
  }
  /**
   * Индекс <li> для остановки рулетки: не раньше 20-го приза от старта и не ближе 20 присов к концу ленты.
   */
  function caseRouletteLiIndexForCase(caseName, slotIndexRaw) {
	var base = caseRouletteBaseCount(caseName);
	var slotIndex = parseInt(slotIndexRaw, 10);
	if (!Number.isFinite(slotIndex) || slotIndex < 0) slotIndex = 0;
	if (slotIndex >= base) slotIndex = base - 1;

	var totalCopies = caseRouletteStripCopies(base);
	var totalItems = totalCopies * base;
	var rightBuf = CASE_ROULETTE_RIGHT_BUFFER;
	var minSpin = CASE_ROULETTE_MIN_SPIN;

	var maxCopy = Math.floor((totalItems - rightBuf - 1 - slotIndex) / base);
	var minCopy = Math.ceil((minSpin - slotIndex) / base);
	if (!Number.isFinite(minCopy) || minCopy < 0) minCopy = 0;
	if (!Number.isFinite(maxCopy) || maxCopy < 0) maxCopy = 0;
	if (maxCopy > totalCopies - 1) maxCopy = totalCopies - 1;

	var preferredCopy = Math.min(4, maxCopy);
	var copy = Math.max(minCopy, preferredCopy);
	if (copy > maxCopy) copy = maxCopy;
	if (copy < minCopy) copy = minCopy;

	return copy * base + slotIndex;
  }
  window.casesDoRoll = casesDoRoll;
  window.flowF2CasesDoRoll = casesDoRoll;
  window.decorateAllCaseRarityBars = decorateAllCaseRarityBars;
  window.openDonateCase = openDonateCase;
  window.openFreeCase = openFreeCase;