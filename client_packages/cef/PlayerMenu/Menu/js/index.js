function delActive() {
	$(".main-nav li").removeClass("active");
  }
  function openShopModal(_0x1601B) {
	$(_0x1601B).addClass("shop__product--active");
	$(".shop__modal--center").addClass("shop__modal--active");
  }
  function openShopModalWeapon(_0x1601B) {
	$(_0x1601B).addClass("shop__product--active");
	$(".shop__modal--right").addClass("shop__modal--active");
  }
  function closeShopModal() {
	$(".shop__modal").removeClass("shop__modal--active");
	$(".shop__product").removeClass("shop__product--active");
  }
  $(".shop__modal").mouseup(function (_0x137AF) {
	let _0x143AB = $(".shop__modal-window");
	if (!_0x143AB.is(_0x137AF.target) && _0x143AB.has(_0x137AF.target).length === 0) {
	  closeShopModal();
	}
  });
  function hideBG() {
	$(".main-window_bg").css("background", "none");
	if (CustomCrosshair) {
	  $(".aim-setting").css("display", "block");
	}
  }
  function showBG() {
	$(".main-window_bg").css("background", "transparent");
	$(".aim-setting").css("display", "none");
  }
  function hideBG() {
	$(".main-window_bg").css("background", "transparent");
  }
  function syncPlayTabScrollClass() {
	var $content = $("#main-window .content");
	if ($("#play.tab-pane").hasClass("active") || $("#menu-minigame.tab-pane").hasClass("active")) {
	  $content.addClass("bm-content-play-active");
	} else {
	  $content.removeClass("bm-content-play-active");
	}
	/* Для embed-вкладки (мини-игра) убираем отступы и max-width content */
	if ($("#menu-minigame.tab-pane").hasClass("active")) {
	  $content.attr("data-bm-embed", "1");
	} else {
	  $content.removeAttr("data-bm-embed");
	}
  }
  function opnModalFamily2() {
	$(".family-menu_modal2").addClass("active");
  }
  function closeModalFamily2() {
	$(".family-menu_modal2").removeClass("active");
  }
  $(function () {
	$(document).on("shown.bs.tab", ".main-nav a[data-toggle=\"tab\"]", syncPlayTabScrollClass);
	syncPlayTabScrollClass();
	var $document = $(document);
	var _0x1435D = "[data-rangeslider]";
	var $element = $(_0x1435D);
	var _0x143F9 = "textContent" in document ? "textContent" : "innerText";
	function _0x14413(_0x14495) {
	  if (_0x14495 && _0x14495.id && String(_0x14495.id).indexOf("ch_r_") === 0) return;
	  var _0x14447 = _0x14495.value;
	  var _0x144AF = _0x14495.parentNode.getElementsByTagName("output")[0] || _0x14495.parentNode.parentNode.getElementsByTagName("output")[0];
	  _0x144AF[_0x143F9] = _0x14447;
	  var _0x144C9 = 70;
	  for (var _0x137C9 = 1; _0x137C9 < 100; _0x137C9++) {
		if (_0x14447 == _0x137C9) {
		  _0x144AF.style.left = _0x14447 - _0x144C9 + "px";
		}
		_0x144C9 = _0x144C9 - 3.67;
	  }
	}
	$document.on("input", "input[type=\"range\"], " + _0x1435D, function (_0x137AF) {
	  _0x14413(_0x137AF.target);
	});
	$document.on("click", "#js-example-disabled button[data-behaviour=\"toggle\"]", function (_0x137AF) {
	  var $inputRange = $(_0x1435D, _0x137AF.target.parentNode);
	  if ($inputRange[0].disabled) {
		$inputRange.prop("disabled", false);
	  } else {
		$inputRange.prop("disabled", true);
	  }
	  $inputRange.rangeslider("update");
	});
	$document.on("click", "#js-example-change-value button", function (_0x137AF) {
	  var $inputRange = $(_0x1435D, _0x137AF.target.parentNode);
	  var _0x14447 = $("input[type=\"number\"]", _0x137AF.target.parentNode)[0].value;
	  $inputRange.val(_0x14447).change();
	});
	$document.on("click", "#js-example-change-attributes button", function (_0x137AF) {
	  var $inputRange = $(_0x1435D, _0x137AF.target.parentNode);
	  var _0x14461 = {
		min: $("input[name=\"min\"]", _0x137AF.target.parentNode)[0].value,
		max: $("input[name=\"max\"]", _0x137AF.target.parentNode)[0].value,
		step: $("input[name=\"step\"]", _0x137AF.target.parentNode)[0].value
	  };
	  $inputRange.attr(_0x14461);
	  $inputRange.rangeslider("update", true);
	});
	$document.on("click", "#js-example-destroy button[data-behaviour=\"destroy\"]", function (_0x137AF) {
	  $(_0x1435D, _0x137AF.target.parentNode).rangeslider("destroy");
	}).on("click", "#js-example-destroy button[data-behaviour=\"initialize\"]", function (_0x137AF) {
	  $(_0x1435D, _0x137AF.target.parentNode).rangeslider({
		polyfill: false
	  });
	});
	$document.on("click", "#js-example-hidden button[data-behaviour=\"toggle\"]", function (_0x137AF) {
	  var $container = $(_0x137AF.target.previousElementSibling);
	  $container.toggle();
	});
	$element.rangeslider({
	  polyfill: false,
	  onInit: function () {
		_0x14413(this.$element[0]);
	  },
	  onSlide: function (_0x14343, _0x14447) {},
	  onSlideEnd: function (_0x14343, _0x14447) {}
	});
  });
  let GPShop = new Vue({
	el: "#gp-shop",
	data: {
	  GPBalance: "0",
	  vehicles: [{
		name: "Itali RSX",
		price: "35.000",
		img: "img/GPShop/italirsx.png"
	  }, {
		name: "Veto",
		price: "40.000",
		img: "img/GPShop/veto.png"
	  }, {
		name: "Issi 6",
		price: "50.000",
		img: "img/GPShop/issi6.png"
	  }, {
		name: "OpenWheel 2",
		price: "70.000",
		img: "img/GPShop/openwheel2.png"
	  }, {
		name: "Lamborghini Veneno",
		price: "100.000",
		img: "img/GPShop/LamborghiniVeneno.png"
	  }],
	  weapons: [{
		name: "CombatMG MK2",
		price: "90.000",
		img: "img/gangwarShop/CombatMGMK2.png"
	  }, {
		name: "Revolver MK2",
		price: "10.000",
		img: "img/gangwarShop/RevolverMK2.png"
	  }]
	},
	methods: {
	  setBalance: function (_0x144E3) {
		this.GPBalance = parseInt(_0x144E3).toDivideNum();
	  },
	  buyItem: function (_0x13F81) {
		mp.trigger("GPBuyItem", _0x13F81);
	  }
	}
  });
  let newyearShop = new Vue({
	el: "#newyear-shop",
	data: {
	  Active: 0,
	  Balance: "0",
	  vehicles: [{
		name: "Reaper",
		price: "0",
		img: "img/newyear/Reaper.png"
	  }, {
		name: "Specter2",
		price: "0",
		img: "img/newyear/Specter2.png"
	  }, {
		name: "Sultan2",
		price: "0",
		img: "img/newyear/Sultan2.png"
	  }, {
		name: "Tempesta",
		price: "0",
		img: "img/newyear/Tempesta.png"
	  }, {
		name: "Tezeract",
		price: "0",
		img: "img/newyear/Tezeract.png"
	  }, {
		name: "Thrax",
		price: "0",
		img: "img/newyear/Thrax.png"
	  }, {
		name: "Toros",
		price: "0",
		img: "img/newyear/Toros.png"
	  }, {
		name: "Zentorno",
		price: "0",
		img: "img/newyear/Zentorno.png"
	  }, {
		name: "Panamera",
		price: "0",
		img: "img/newyear/panamera18.png"
	  }, {
		name: "Taycan",
		price: "0",
		img: "img/newyear/taycan.png"
	  }],
	  weapons: [{
		name: "CombatMG",
		price: "3.000",
		img: "img/gangwarShop/CombatMG.png"
	  }, {
		name: "Revolver MK2",
		price: "1.400",
		img: "img/gangwarShop/RevolverMK2.png"
	  }, {
		name: "Mini SMG",
		price: "800",
		img: "img/gangwarShop/PericoPistol.png"
	  }, {
		name: "Navy Revolver",
		price: "800",
		img: "img/gangwarShop/NavyRevolver.png"
	  }, {
		name: "Sniper Rifle",
		price: "9.999",
		img: "img/gangwarShop/SniperRifle.png"
	  }]
	},
	methods: {
	  setBalance: function (_0x144E3) {
		this.GPBalance = parseInt(_0x144E3).toDivideNum();
	  },
	  buyItem: function (ItemName) {
		mp.trigger("SnowFlakesBuyItem", ItemName);
	  }
	}
  });
  let MiniGameInfo = new Vue({
	el: "#mini-games-list-info",
	data: {
	  Active: 0
	},
	methods: {}
  });
  let EMSTattoo = new Vue({
	el: "#TattooClearAlert",
	data: {
	  Active: 0
	},
	methods: {
	  cancel: function () {
		mp.trigger("EMSCancelReductionTattoo");
	  },
	  ReductionAllTattoo: function () {
		mp.trigger("EMSReductionAllTattoo");
	  }
	}
  });
  let FamilyCraft = new Vue({
	el: "#FamilyCraft",
	data: {
	  Active: 0,
	  Materials: 0
	},
	methods: {
	  cancel: function () {
		mp.trigger("EMSCancelReductionTattoo");
	  },
	  ReductionAllTattoo: function () {
		mp.trigger("EMSReductionAllTattoo");
	  }
	}
  });
  $(".square-left").mouseover(function () {
	$(".wrap").addClass("left");
  }).mouseout(function () {
	$(".wrap").removeClass("left");
  });
  $(".square-right").mouseover(function () {
	$(".wrap").addClass("right");
  }).mouseout(function () {
	$(".wrap").removeClass("right");
  });
  $(".square-top").mouseover(function () {
	$(".wrap").addClass("top");
  }).mouseout(function () {
	$(".wrap").removeClass("top");
  });
  $(".square-bottom").mouseover(function () {
	$(".wrap").addClass("bottom");
  }).mouseout(function () {
	$(".wrap").removeClass("bottom");
  });
  var images = new Array();
  function wrap() {
	for (i = 0; i < wrap.arguments.length; i++) {
	  images[i] = new Image();
	  images[i].src = wrap.arguments[i];
	}
  }
  wrap("img/main-c.png", "img/left-c.png", "img/top-c.png", "img/right-c.png", "img/bottom-c.png");
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
  let sumAll = 5993;
  let hgh = [{
	staticID: 1,
	login: "Fausto",
	sum: 100,
	chance: 0
  }, {
	staticID: 2,
	login: "kk424",
	sum: 893,
	chance: 0
  }, {
	staticID: 2,
	login: "Sage",
	sum: 5000,
	chance: 0
  }];
  function clearRouletteResultUsers() {
	document.getElementById("RouletteResultUsers").innerHTML = "";
  }
  let GALAXYGames = new Vue({
	el: "#roulette-games",
	data: {
	  GPBalance: "0",
	  winTicketFinal: 55389,
	  Login: null,
	  StaticID: null,
	  Active: 0,
	  GameStatus: "ShowResult",
	  GameNumber: 0,
	  GhettoMoneyBalance: "0",
	  Bank: 0,
	  BankString: "0",
	  LastWinner: ["-----", "---", "---"],
	  BestWinner: ["-----", "---", "---"],
	  itemsBetPicked: 0,
	  itemsBetPrice: 0,
	  itemsBetPriceString: "0",
	  GameTimerLeftSecs: "01:00",
	  GameTimerInterval: null,
	  CurrentWinner: ["Fausto", "110223"],
	  CurrentWinnerShow: 0,
	  playerBets: [],
	  playersChance: []
	},
	methods: {
	  GameTimerStartTimer: function (_0x1454B) {
		if (this.GameTimerInterval != null) {
		  clearInterval(this.GameTimerInterval);
		  this.GameTimerInterval = null;
		}
		let _0x1457F = parseInt(_0x1454B);
		let _0x14531 = _0x1457F / 3600 ^ 0;
		let _0x140D3 = (_0x1457F - _0x14531 * 3600) / 60 ^ 0;
		let _0x14565 = _0x1457F - _0x14531 * 3600 - _0x140D3 * 60;
		this.GameTimerInterval = setInterval(() => {
		  if (_0x1457F <= 0) {
			clearInterval(this.GameTimerInterval);
			return this.GameTimerLeftSecs = "00:00";
		  }
		  _0x1457F--;
		  _0x14531 = _0x1457F / 3600 ^ 0;
		  _0x140D3 = (_0x1457F - _0x14531 * 3600) / 60 ^ 0;
		  _0x14565 = _0x1457F - _0x14531 * 3600 - _0x140D3 * 60;
		  this.GameTimerLeftSecs = (_0x140D3 < 10 ? "0" + _0x140D3 : _0x140D3) + ":" + (_0x14565 < 10 ? "0" + _0x14565 : _0x14565);
		}, 1000);
	  },
	  GameTimerStopInterval: function () {
		if (this.GameTimerInterval != null) {
		  clearInterval(this.GameTimerInterval);
		  this.GameTimerInterval = null;
		}
	  },
	  GameTimerSetFreeze: function () {
		if (this.GameTimerInterval != null) {
		  clearInterval(this.GameTimerInterval);
		  this.GameTimerInterval = null;
		}
		this.GameTimerLeftSecs = "01:00";
	  },
	  setLogin: function (_0x1464F) {
		this.Login = _0x1464F;
	  },
	  setStaticID: function (_0x14669) {
		this.StaticID = _0x14669;
	  },
	  setBalance: function (_0x144E3) {
		this.GPBalance = parseInt(_0x144E3).toDivideNum();
	  },
	  changeActive: function (_0x14683) {
		this.Active = _0x14683;
	  },
	  changeChance: function () {
		this.playersChance.forEach(_0x13969 => {
		  _0x13969.chance = (parseInt(_0x13969.sum) / parseInt(this.Bank) * 100).toFixed(1);
		});
	  },
	  addBet: function (_0x146EB) {
		this.playerBets.unshift(JSON.parse(_0x146EB));
	  },
	  addUser: function (_0x146EB) {
		this.playersChance.push(JSON.parse(_0x146EB));
		this.playersChance.forEach(_0x13969 => {
		  _0x13969.chance = (parseInt(_0x13969.sum) / parseInt(this.Bank) * 100).toFixed(1);
		});
		let _0x14705 = JSON.parse(_0x146EB);
		document.getElementById("RouletteResultUsers").innerHTML += `<li>
			  <p class="Slots_id-player">#${_0x14705.staticID}</p>
			  <a class="Slots_name-player">${_0x14705.login.substring(0, 8)}</a>
			  <p class="Slots_full-name-player">${_0x14705.login}</p>
			</li>`;
	  },
	  setCurrentBank: function (_0x1471F) {
		this.Bank = parseInt(_0x1471F);
		this.BankString = parseInt(_0x1471F).toDivideNum();
	  },
	  changeGamesTop: function (_0x13F19, _0x14739) {
		switch (_0x13F19) {
		  case "lastWinner":
			this.LastWinner = JSON.parse(_0x14739);
			break;
		  case "bestWinner":
			this.BestWinner = JSON.parse(_0x14739);
			break;
		}
	  },
	  setItemsBetPicked: function (_0x14753) {
		this.itemsBetPicked = _0x14753;
	  },
	  setitemsBetPrice: function (_0x1476D) {
		this.itemsBetPrice = parseInt(_0x1476D);
		this.itemsBetPriceString = parseInt(_0x1476D).toDivideNum();
	  }
	}
  });
  function makeBetGALAXYGAMES() {
	let _0x15F65 = document.getElementById("RouletteMoneyBetInput").value;
	let _0x15F4B = 0;
	if (_0x15F65 != null && _0x15F65 != undefined && isNaN(parseInt(_0x15F65)) == false) {
	  _0x15F4B = parseInt(_0x15F65);
	}
	if (SelectedItemsForBet.length <= 0 && _0x15F4B <= 0) {
	  return pushNotify("error", "top-mid", "Сначала выберите предметы для ставки/укажите сумму ставки в $", 1000);
	}
	mp.trigger("makeBetGALAXYGAMES", JSON.stringify(SelectedItemsForBet), _0x15F4B);
  }
  var InventoryItemsList = [{
	ItemID: 0,
	Name: "Аптечка",
	img: "img/inventoryIcons/0.png",
	Type: "health",
	defaultPrice: 50
  }, {
	ItemID: 1,
	Name: "Бинт",
	img: "img/inventoryIcons/1.png",
	Type: "health",
	defaultPrice: 30
  }, {
	ItemID: 2,
	Name: "Адреналин",
	img: "img/inventoryIcons/2.png",
	Type: "adrenalin",
	defaultPrice: 250
  }, {
	ItemID: 3,
	Name: "Медовуха",
	img: "img/inventoryIcons/3.png",
	Type: "alcohol",
	defaultPrice: 1200
  }, {
	ItemID: 4,
	Name: "Броня (100%)",
	img: "img/inventoryIcons/4.png",
	Type: "armour",
	defaultPrice: 140
  }, {
	ItemID: 5,
	Name: "Броня (50%)",
	img: "img/inventoryIcons/5.png",
	Type: "armour",
	defaultPrice: 120
  }, {
	ItemID: 6,
	Name: "Revolver",
	img: "img/inventoryIcons/6.png",
	Type: "weapon",
	defaultPrice: 0
  }, {
	ItemID: 7,
	Name: "Mini SMG",
	img: "img/inventoryIcons/7.png",
	Type: "weapon",
	defaultPrice: 0
  }, {
	ItemID: 8,
	Name: "Heavy Shotgun",
	img: "img/inventoryIcons/8.png",
	Type: "weapon",
	defaultPrice: 3000
  }, {
	ItemID: 9,
	Name: "Gusenberg S.",
	img: "img/inventoryIcons/9.png",
	Type: "weapon",
	defaultPrice: 5500
  }, {
	ItemID: 10,
	Name: "Carbine Rifle",
	img: "img/inventoryIcons/10.png",
	Type: "weapon",
	defaultPrice: 350
  }, {
	ItemID: 11,
	Name: "Combat PDW",
	img: "img/inventoryIcons/11.png",
	Type: "weapon",
	defaultPrice: 300
  }, {
	ItemID: 12,
	Name: "Assault Rifle",
	img: "img/inventoryIcons/12.png",
	Type: "weapon",
	defaultPrice: 350
  }, {
	ItemID: 13,
	Name: "Revolver MK2",
	img: "img/inventoryIcons/13.png",
	Type: "weapon",
	defaultPrice: 105000
  }, {
	ItemID: 14,
	Name: "Кобура",
	img: "img/inventoryIcons/14.png",
	Type: "holster",
	defaultPrice: 0
  }, {
	ItemID: 15,
	Name: "Combat MG",
	img: "img/inventoryIcons/15.png",
	Type: "weapon",
	defaultPrice: 250000
  }, {
	ItemID: 16,
	Name: "Assault SMG",
	img: "img/inventoryIcons/16.png",
	Type: "weapon",
	defaultPrice: 2500
  }, {
	ItemID: 17,
	Name: "SMG",
	img: "img/inventoryIcons/17.png",
	Type: "weapon",
	defaultPrice: 800
  }, {
	ItemID: 18,
	Name: "SMG MK2",
	img: "img/inventoryIcons/18.png",
	Type: "weapon",
	defaultPrice: 325
  }, {
	ItemID: 19,
	Name: "Assault Shotgun",
	img: "img/inventoryIcons/19.png",
	Type: "weapon",
	defaultPrice: 3500
  }, {
	ItemID: 20,
	Name: "Advanced Rifle",
	img: "img/inventoryIcons/20.png",
	Type: "weapon",
	defaultPrice: 5600
  }, {
	ItemID: 21,
	Name: "Special Carbine",
	img: "img/inventoryIcons/21.png",
	Type: "weapon",
	defaultPrice: 320
  }, {
	ItemID: 22,
	Name: "Military Rifle",
	img: "img/inventoryIcons/22.png",
	Type: "weapon",
	defaultPrice: 3400
  }, {
	ItemID: 23,
	Name: "Sniper Rifle",
	img: "img/inventoryIcons/23.png",
	Type: "weapon",
	defaultPrice: 1200000
  }, {
	ItemID: 24,
	Name: "Compact Rifle",
	img: "img/inventoryIcons/24.png",
	Type: "weapon",
	defaultPrice: 310
  }, {
	ItemID: 25,
	Name: "Рем. набор",
	img: "img/inventoryIcons/25.png",
	Type: "repairKit",
	defaultPrice: 150
  }, {
	ItemID: 26,
	Name: "Броня (100%)",
	img: "img/inventoryIcons/26.png",
	Type: "armour",
	defaultPrice: 400
  }, {
	ItemID: 27,
	Name: "Combat MG MK2",
	img: "img/inventoryIcons/27.png",
	Type: "weapon",
	defaultPrice: 1000000
  }, {
	ItemID: 28,
	Name: "Mini SMG",
	img: "img/inventoryIcons/28.png",
	Type: "weapon",
	defaultPrice: 25000
  }, {
	ItemID: 29,
	Name: "Navy Revolver",
	img: "img/inventoryIcons/29.png",
	Type: "weapon",
	defaultPrice: 17000
  }];
  let SelectedItemsForBet = [];
  function ClearItemsForBet() {
	SelectedItemsForBet = [];
	let _0x15523 = 0;
	if (document.getElementById("RouletteMoneyBetInput").value != null && document.getElementById("RouletteMoneyBetInput").value != undefined && isNaN(parseInt(document.getElementById("RouletteMoneyBetInput").value)) == false) {
	  _0x15523 = parseInt(document.getElementById("RouletteMoneyBetInput").value);
	}
	GALAXYGames.setitemsBetPrice(parseInt(_0x15523));
  }
  function addItemInInv(_0x13ECB, _0x14E21) {
	if (parseInt(_0x13ECB) == 6 || parseInt(_0x13ECB) == 7 || parseInt(_0x13ECB) == 14 || parseInt(_0x13ECB) == 4) {
	  return;
	}
	let _0x14E3B = InventoryItemsList.find(_0x13FCF => {
	  return _0x13FCF.ItemID == parseInt(_0x13ECB);
	});
	if (_0x14E3B.Name == null || _0x14E3B.Name == undefined) {
	  return;
	}
	document.getElementById("ItemsForBetList").innerHTML += `
	  <div class="bet_item-block" id="BlockItemInInventory${_0x13ECB}${_0x14E21}" onclick="selectItemCheck('${_0x13ECB}','${_0x14E21}')">
	  <div class="bet_item-slot">
		<div class="bet_item-selected" id="Selected${_0x13ECB}${_0x14E21}" style="display: none;">
		  <img src="img/svg/item_selected.svg">
		</div>
		<div class="bet_item-img-block">
		  <img src="${_0x14E3B.img}">
		</div>
		<div class="bet_item-name">
		  <p>${_0x14E3B.Name}</p>
		</div>
	  </div>
	  <div class="roulet_item-cost">
		<b>$</b>
		<p>${parseInt(_0x14E3B.defaultPrice).toDivideNum()}</p>
	  </div>
	</div>`;
  }
  function removeItemFromInv(_0x13ECB, _0x13EE5) {
	document.getElementById(`BlockItemInInventory${_0x13ECB}${_0x13EE5}`).remove();
	let _0x162D9 = SelectedItemsForBet.findIndex(_0x13FCF => {
	  return _0x13FCF.ID == parseInt(_0x13ECB) && _0x13FCF.Serial == parseInt(_0x13EE5);
	});
	if (_0x162D9 <= -1) {
	  return;
	}
	SelectedItemsForBet.splice(parseInt(_0x162D9), 1);
	GALAXYGames.setItemsBetPicked(SelectedItemsForBet.length);
	let _0x15523 = 0;
	for (let _0x137C9 = 0; _0x137C9 < SelectedItemsForBet.length; _0x137C9++) {
	  let _0x14E3B = InventoryItemsList.find(_0x13FCF => {
		return _0x13FCF.ItemID == parseInt(SelectedItemsForBet[_0x137C9].ID);
	  });
	  if (_0x14E3B.Name == null || _0x14E3B.Name == undefined) {
		return;
	  }
	  _0x15523 = _0x15523 + _0x14E3B.defaultPrice;
	  GALAXYGames.setitemsBetPrice(parseInt(_0x15523));
	}
  }
  function selectItemCheck(_0x13ECB, _0x13EE5) {
	switch (document.getElementById(`Selected${_0x13ECB}${_0x13EE5}`).style.display) {
	  case "none":
		if (SelectedItemsForBet.length >= 5) {
		  return pushNotify("error", "top-mid", "Нельзя выбрать больше 5 предметов", 1000);
		}
		if (document.getElementById("RouletteMoneyBetInput").value != null && document.getElementById("RouletteMoneyBetInput").value != undefined && isNaN(parseInt(document.getElementById("RouletteMoneyBetInput").value)) == false) {
		  if (SelectedItemsForBet.length >= 4 && parseInt(document.getElementById("RouletteMoneyBetInput").value) >= 1) {
			return pushNotify("error", "top-mid", "Нельзя выбрать больше 4 предметов, так как вы указали сумму ставки в $", 1000);
		  }
		}
		document.getElementById(`Selected${_0x13ECB}${_0x13EE5}`).style.display = "flex";
		SelectedItemsForBet.push({
		  ID: parseInt(_0x13ECB),
		  Serial: parseInt(_0x13EE5)
		});
		GALAXYGames.setItemsBetPicked(SelectedItemsForBet.length);
		let _0x15523 = 0;
		if (document.getElementById("RouletteMoneyBetInput").value != null && document.getElementById("RouletteMoneyBetInput").value != undefined && isNaN(parseInt(document.getElementById("RouletteMoneyBetInput").value)) == false) {
		  _0x15523 = parseInt(document.getElementById("RouletteMoneyBetInput").value);
		}
		for (let _0x137C9 = 0; _0x137C9 < SelectedItemsForBet.length; _0x137C9++) {
		  let _0x14E3B = InventoryItemsList.find(_0x13FCF => {
			return _0x13FCF.ItemID == parseInt(SelectedItemsForBet[_0x137C9].ID);
		  });
		  if (_0x14E3B.Name == null || _0x14E3B.Name == undefined) {
			return;
		  }
		  _0x15523 = _0x15523 + _0x14E3B.defaultPrice;
		  GALAXYGames.setitemsBetPrice(parseInt(_0x15523));
		}
		break;
	  default:
		document.getElementById(`Selected${_0x13ECB}${_0x13EE5}`).style.display = "none";
		let _0x162D9 = SelectedItemsForBet.findIndex(_0x13FCF => {
		  return _0x13FCF.ID == parseInt(_0x13ECB) && _0x13FCF.Serial == parseInt(_0x13EE5);
		});
		if (_0x162D9 <= -1) {
		  return;
		}
		SelectedItemsForBet.splice(parseInt(_0x162D9), 1);
		GALAXYGames.setItemsBetPicked(SelectedItemsForBet.length);
		if (SelectedItemsForBet.length <= 0) {
		  return GALAXYGames.setitemsBetPrice(0);
		}
		let _0x163A9 = 0;
		for (let _0x137C9 = 0; _0x137C9 < SelectedItemsForBet.length; _0x137C9++) {
		  let _0x14E3B = InventoryItemsList.find(_0x13FCF => {
			return _0x13FCF.ItemID == parseInt(SelectedItemsForBet[_0x137C9].ID);
		  });
		  if (_0x14E3B.Name == null || _0x14E3B.Name == undefined) {
			return;
		  }
		  _0x163A9 = _0x163A9 + _0x14E3B.defaultPrice;
		  GALAXYGames.setitemsBetPrice(parseInt(_0x163A9));
		}
		break;
	}
  }
  function GGamesAddWinItem(_0x13ECB, _0x13EE5) {
	let _0x14E3B = ItemsForSellList.find(_0x13FCF => {
	  return _0x13FCF.ItemID == parseInt(_0x13ECB);
	});
	if (_0x14E3B.Name == null || _0x14E3B.Name == undefined) {
	  return;
	}
	document.getElementById("GGamesWinItemsList").innerHTML += `
	  <div class="bet_item-block" id="GGamesCurrentWinItem${_0x13ECB}${_0x13EE5}">
	  <div class="bet_item-slot bet_item-slot--inventory">
		<div class="bet_item-img-block">
		  <img src="${_0x14E3B.img}">
		</div>
		<div class="bet_item-name">
		  <p>${_0x14E3B.Name}</p>
		</div>
		<a class="bet_item-btn1" onclick="mp.trigger('GALAXYGAMESWinItemIntercation','sell','${_0x13ECB}','${_0x13EE5}')">Продать</a>
		<a class="bet_item-btn2" onclick="mp.trigger('GALAXYGAMESWinItemIntercation','take','${_0x13ECB}','${_0x13EE5}')">Забрать</a>
	  </div>
	  <div class="roulet_item-cost">
		<b>$</b>
		<p>${parseInt(_0x14E3B.sellPrice).toDivideNum()}</p>
	  </div>
	</div>`;
  }
  function GGamesRemoveWinItem(_0x13ECB, _0x13EE5) {
	document.getElementById(`GGamesCurrentWinItem${_0x13ECB}${_0x13EE5}`).remove();
  }
  function changeitemsBetsPriceInput() {
	if (SelectedItemsForBet.length >= 5) {
	  pushNotify("error", "top-mid", "Чтобы поставить ставку в $ необходимо выбрать не более 4 предметов для ставки.", 1000);
	  return document.getElementById("RouletteMoneyBetInput").value = "0";
	}
	let _0x15523 = 0;
	if (document.getElementById("RouletteMoneyBetInput").value != null && document.getElementById("RouletteMoneyBetInput").value != undefined && isNaN(parseInt(document.getElementById("RouletteMoneyBetInput").value)) == false) {
	  _0x15523 = parseInt(document.getElementById("RouletteMoneyBetInput").value);
	}
	if (SelectedItemsForBet.length <= 0) {
	  return GALAXYGames.setitemsBetPrice(parseInt(_0x15523));
	}
	for (let _0x137C9 = 0; _0x137C9 < SelectedItemsForBet.length; _0x137C9++) {
	  let _0x14E3B = InventoryItemsList.find(_0x13FCF => {
		return _0x13FCF.ItemID == parseInt(SelectedItemsForBet[_0x137C9].ID);
	  });
	  if (_0x14E3B.Name == null || _0x14E3B.Name == undefined) {
		return;
	  }
	  _0x15523 = _0x15523 + _0x14E3B.defaultPrice;
	  GALAXYGames.setitemsBetPrice(parseInt(_0x15523));
	}
  }
  var ItemsForSellList = [{
	ItemID: 0,
	Name: "Аптечка",
	img: "img/inventoryIcons/0.png",
	Type: "health",
	sellPrice: 15
  }, {
	ItemID: 1,
	Name: "Бинт",
	img: "img/inventoryIcons/1.png",
	Type: "health",
	sellPrice: 9
  }, {
	ItemID: 2,
	Name: "Адреналин",
	img: "img/inventoryIcons/2.png",
	Type: "adrenalin",
	sellPrice: 75
  }, {
	ItemID: 3,
	Name: "Медовуха",
	img: "img/inventoryIcons/3.png",
	Type: "alcohol",
	sellPrice: 360
  }, {
	ItemID: 4,
	Name: "Броня (100%)",
	img: "img/inventoryIcons/4.png",
	Type: "armour",
	sellPrice: 120
  }, {
	ItemID: 5,
	Name: "Броня (50%)",
	img: "img/inventoryIcons/5.png",
	Type: "armour",
	sellPrice: 36
  }, {
	ItemID: 6,
	Name: "Revolver",
	img: "img/inventoryIcons/6.png",
	Type: "weapon",
	sellPrice: 0
  }, {
	ItemID: 7,
	Name: "Mini SMG",
	img: "img/inventoryIcons/7.png",
	Type: "weapon",
	sellPrice: 0
  }, {
	ItemID: 8,
	Name: "Heavy Shotgun",
	img: "img/inventoryIcons/8.png",
	Type: "weapon",
	sellPrice: 900
  }, {
	ItemID: 9,
	Name: "Gusenberg S.",
	img: "img/inventoryIcons/9.png",
	Type: "weapon",
	sellPrice: 1650
  }, {
	ItemID: 10,
	Name: "Carbine Rifle",
	img: "img/inventoryIcons/10.png",
	Type: "weapon",
	sellPrice: 105
  }, {
	ItemID: 11,
	Name: "Combat PDW",
	img: "img/inventoryIcons/11.png",
	Type: "weapon",
	sellPrice: 90
  }, {
	ItemID: 12,
	Name: "Assault Rifle",
	img: "img/inventoryIcons/12.png",
	Type: "weapon",
	sellPrice: 105
  }, {
	ItemID: 13,
	Name: "Revolver MK2",
	img: "img/inventoryIcons/13.png",
	Type: "weapon",
	sellPrice: 15000
  }, {
	ItemID: 14,
	Name: "Кобура",
	img: "img/inventoryIcons/14.png",
	Type: "holster",
	sellPrice: 0
  }, {
	ItemID: 15,
	Name: "Combat MG",
	img: "img/inventoryIcons/15.png",
	Type: "weapon",
	sellPrice: 60000
  }, {
	ItemID: 16,
	Name: "Assault SMG",
	img: "img/inventoryIcons/16.png",
	Type: "weapon",
	sellPrice: 750
  }, {
	ItemID: 17,
	Name: "SMG",
	img: "img/inventoryIcons/17.png",
	Type: "weapon",
	sellPrice: 240
  }, {
	ItemID: 18,
	Name: "SMG MK2",
	img: "img/inventoryIcons/18.png",
	Type: "weapon",
	sellPrice: 97
  }, {
	ItemID: 19,
	Name: "Assault Shotgun",
	img: "img/inventoryIcons/19.png",
	Type: "weapon",
	sellPrice: 1050
  }, {
	ItemID: 20,
	Name: "Advanced Rifle",
	img: "img/inventoryIcons/20.png",
	Type: "weapon",
	sellPrice: 1680
  }, {
	ItemID: 21,
	Name: "Special Carbine",
	img: "img/inventoryIcons/21.png",
	Type: "weapon",
	sellPrice: 96
  }, {
	ItemID: 22,
	Name: "Military Rifle",
	img: "img/inventoryIcons/22.png",
	Type: "weapon",
	sellPrice: 1020
  }, {
	ItemID: 23,
	Name: "Sniper Rifle",
	img: "img/inventoryIcons/23.png",
	Type: "weapon",
	sellPrice: 360000
  }, {
	ItemID: 24,
	Name: "Compact Rifle",
	img: "img/inventoryIcons/24.png",
	Type: "weapon",
	sellPrice: 93
  }, {
	ItemID: 25,
	Name: "Рем. набор",
	img: "img/inventoryIcons/25.png",
	Type: "repairKit",
	sellPrice: 45
  }, {
	ItemID: 26,
	Name: "Броня (100%)",
	img: "img/inventoryIcons/26.png",
	Type: "armour",
	sellPrice: 120
  }, {
	ItemID: 27,
	Name: "Combat MG MK2",
	img: "img/inventoryIcons/27.png",
	Type: "weapon",
	sellPrice: 200000
  }, {
	ItemID: 28,
	Name: "Mini SMG",
	img: "img/inventoryIcons/28.png",
	Type: "weapon",
	sellPrice: 5500
  }, {
	ItemID: 29,
	Name: "Navy Revolver",
	img: "img/inventoryIcons/29.png",
	Type: "weapon",
	sellPrice: 5100
  }];
  let MainMenuBlock = new Vue({
	el: "#main-hud-menu",
	data: {
	  Active: 1,
	  MiniMenu: 0,
	  Passengers: [],
	  ActivePlayers: [],
	  DeliveryName: "Перевозка",
	  DeliveryActive: 0,
	  DeliveryInterval: null,
	  DeliveryTimeLeft: "04:00",
	  DeliveryStep: 0
	},
	methods: {
	  addPassenger: function (_0x1464F, _0x14669, _0x147D5) {
		this.Passengers.push({
		  login: _0x1464F,
		  staticID: _0x14669,
		  id: _0x147D5
		});
	  },
	  loadPassengers: function () {
		mp.trigger("loadVehiclePassengers");
	  },
	  kickTargetFromVeh: function (_0x147EF) {
		mp.trigger("kickTargetFromVeh");
	  },
	  showFamilyMenu: function () {
		mp.trigger("openFamilyMenu");
	  },
	  addActivePlayer: function (_0x1464F, _0x14809) {
		this.ActivePlayers.push({
		  name: _0x1464F,
		  StaticID: parseInt(_0x14809)
		});
	  },
	  removeActivePlayer: function (_0x14809) {
		let _0x14823 = this.ActivePlayers.findIndex(_0x13FCF => {
		  return _0x13FCF.StaticID == parseInt(_0x14809);
		});
		if (_0x14823 <= -1) {
		  return;
		}
		this.ActivePlayers.splice(parseInt(_0x14823), 1);
	  },
	  DeliveryStartTimer: function (_0x1483D) {
		if (this.DeliveryInterval != null) {
		  clearInterval(this.DeliveryInterval);
		  this.DeliveryInterval = null;
		}
		let _0x1457F = parseInt(_0x1483D);
		let _0x14531 = _0x1457F / 3600 ^ 0;
		let _0x140D3 = (_0x1457F - _0x14531 * 3600) / 60 ^ 0;
		let _0x14565 = _0x1457F - _0x14531 * 3600 - _0x140D3 * 60;
		this.DeliveryInterval = setInterval(() => {
		  if (_0x1457F <= 0) {
			return clearInterval(this.DeliveryInterval);
		  }
		  _0x1457F--;
		  _0x14531 = _0x1457F / 3600 ^ 0;
		  _0x140D3 = (_0x1457F - _0x14531 * 3600) / 60 ^ 0;
		  _0x14565 = _0x1457F - _0x14531 * 3600 - _0x140D3 * 60;
		  this.DeliveryTimeLeft = (_0x140D3 < 10 ? "0" + _0x140D3 : _0x140D3) + ":" + (_0x14565 < 10 ? "0" + _0x14565 : _0x14565);
		}, 1000);
	  },
	  DeliveryStopTimer: function () {
		if (this.DeliveryInterval != null) {
		  clearInterval(this.DeliveryInterval);
		  this.DeliveryInterval = null;
		}
	  }
	}
  });
  let FamilyMenu = new Vue({
	el: "#family-menu",
	data: {
	  PlayerRank: 0,
	  Active: 0,
	  FamilyName: null,
	  CreateData: "29.07.2021 17:31:03",
	  Users: [],
	  Location: null,
	  Interrior: null,
	  Balance: null,
	  Materials: null,
	  RankPoints: null,
	  changeRankActive: 0,
	  RankChangeTarget: null,
	  CurrentRankChange: 1,
	  RankSystem: [{
		CanInvite: 0,
		ChangeRank: 0,
		CanKick: 0,
		Bizwar: 0,
		withdrawMoney: 0,
		Craft: 0,
		BizwarEnter: 0,
		useWarehouse: 0,
		CloseOpenWarehouse: 0
	  }, {
		CanInvite: 0,
		ChangeRank: 0,
		CanKick: 0,
		Bizwar: 0,
		withdrawMoney: 0,
		Craft: 0,
		BizwarEnter: 0,
		useWarehouse: 0,
		CloseOpenWarehouse: 0
	  }, {
		CanInvite: 0,
		ChangeRank: 0,
		CanKick: 0,
		Bizwar: 0,
		withdrawMoney: 0,
		Craft: 0,
		BizwarEnter: 0,
		useWarehouse: 0,
		CloseOpenWarehouse: 0
	  }, {
		CanInvite: 0,
		ChangeRank: 0,
		CanKick: 0,
		Bizwar: 0,
		withdrawMoney: 0,
		Craft: 0,
		BizwarEnter: 0,
		useWarehouse: 0,
		CloseOpenWarehouse: 0
	  }, {
		CanInvite: 0,
		ChangeRank: 0,
		CanKick: 0,
		Bizwar: 0,
		withdrawMoney: 0,
		Craft: 0,
		BizwarEnter: 0,
		useWarehouse: 0,
		CloseOpenWarehouse: 0
	  }, {
		CanInvite: 0,
		ChangeRank: 0,
		CanKick: 0,
		Bizwar: 0,
		withdrawMoney: 0,
		Craft: 0,
		BizwarEnter: 0,
		useWarehouse: 0,
		CloseOpenWarehouse: 0
	  }, {
		CanInvite: 0,
		ChangeRank: 0,
		CanKick: 0,
		Bizwar: 0,
		withdrawMoney: 0,
		Craft: 0,
		BizwarEnter: 0,
		useWarehouse: 0,
		CloseOpenWarehouse: 0
	  }, {
		CanInvite: 0,
		ChangeRank: 0,
		CanKick: 0,
		Bizwar: 0,
		withdrawMoney: 0,
		Craft: 0,
		BizwarEnter: 0,
		useWarehouse: 0,
		CloseOpenWarehouse: 0
	  }, {
		CanInvite: 0,
		ChangeRank: 0,
		CanKick: 0,
		Bizwar: 0,
		withdrawMoney: 0,
		Craft: 0,
		BizwarEnter: 0,
		useWarehouse: 0,
		CloseOpenWarehouse: 0
	  }, {
		CanInvite: 0,
		ChangeRank: 0,
		CanKick: 0,
		Bizwar: 0,
		withdrawMoney: 0,
		Craft: 0,
		BizwarEnter: 0,
		useWarehouse: 0,
		CloseOpenWarehouse: 0
	  }, {
		CanInvite: 1,
		ChangeRank: 1,
		CanKick: 1,
		Bizwar: 1,
		withdrawMoney: 1,
		Craft: 1,
		BizwarEnter: 1,
		useWarehouse: 1,
		CloseOpenWarehouse: 1
	  }],
	  CurrentAnnouncement: 1
	},
	methods: {
	  saveRankManagement: function () {
		mp.trigger("saveRankManagement", JSON.stringify(this.RankSystem[this.CurrentRankChange]), this.CurrentRankChange);
	  },
	  setRankManagement: function (_0x14857) {
		this.RankSystem = JSON.parse(_0x14857);
	  },
	  addUser: function (_0x14669, _0x1464F, _0x1488B, _0x14871, _0x148A5) {
		this.Users.push({
		  staticID: _0x14669,
		  login: _0x1464F,
		  rank: parseInt(_0x1488B),
		  leader: parseInt(_0x14871),
		  tag: _0x148A5
		});
		this.Users.sort((a, _0x148BF) => {
		  if (a.rank < _0x148BF.rank) {
			return 1;
		  } else {
			return -1;
		  }
		});
	  },
	  closeFamilyMenu: function () {
		this.Active = 0;
		mp.trigger("CloseFamilyMenu");
	  },
	  opnModalFamily: function (_0x148D9, _0x148F3) {
		if (parseInt(this.PlayerRank) <= parseInt(_0x148D9)) {
		  return pushNotify("error", "top-mid", "Невозможно изменить ранг этому игроку", 3000);
		}
		this.changeRankActive = 1;
		this.RankChangeTarget = parseInt(_0x148F3);
	  },
	  closeModalFamily: function () {
		this.changeRankActive = 0;
		this.RankChangeTarget = null;
	  },
	  saveChangeRank: function () {
		this.changeRankActive = 0;
		if (this.RankChangeTarget == null) {
		  return pushNotify("error", "top-mid", "Ошибка. Игрок неопределён, повторите попытку.", 3000);
		}
		let _0x1490D = document.getElementById("familyChangeRankInput").value;
		if (_0x1490D == null || _0x1490D == undefined || _0x1490D == "" || isNaN(_0x1490D)) {
		  return pushNotify("error", "top-mid", "Сначала введите ранг.", 3000);
		}
		if (_0x1490D < 1) {
		  return pushNotify("error", "top-mid", "Минимальный ранг, который вы можете установить игроку - 1.", 3000);
		}
		if (_0x1490D > 9) {
		  return pushNotify("error", "top-mid", "Максимальный ранг, который вы можете установить игроку - 9.", 3000);
		}
		mp.trigger("familyChangeRankSave", this.RankChangeTarget, _0x1490D);
	  },
	  kickTargetFromFamily: function (_0x148D9, _0x148F3) {
		if (parseInt(this.PlayerRank) <= parseInt(_0x148D9)) {
		  return pushNotify("error", "top-mid", "Невозможно изменить ранг этому игроку", 3000);
		}
		mp.trigger("kickTargetFromFamily", _0x148F3, _0x148D9);
	  },
	  FamilySetTargetNewRank: function (_0x14927, _0x1490D) {
		let _0x14823 = this.Users.find(_0x14941 => {
		  return parseInt(_0x14941.staticID) == parseInt(_0x14927);
		});
		if (!_0x14823 || _0x14823 == undefined) {
		  return pushNotify("error", "top-mid", "Ошибка при перестановки нового ранга, игрок не определён. Обратитесь в /report.", 3000);
		}
		_0x14823.rank = parseInt(_0x1490D);
		this.Users.sort((a, _0x148BF) => {
		  if (a.rank < _0x148BF.rank) {
			return 1;
		  } else {
			return -1;
		  }
		});
	  },
	  FamilyKickTarget: function (_0x14927) {
		let _0x14823 = this.Users.findIndex(_0x1495B => {
		  return parseInt(_0x1495B.staticID) == parseInt(_0x14927);
		});
		if (!_0x14823) {
		  return pushNotify("error", "top-mid", "[E-1] Ошибка, обратитесь в /report", 3000);
		}
		if (_0x14823 == undefined || _0x14823 == null) {
		  return pushNotify("error", "top-mid", "[E-2] Ошибка, обратитесь в /report", 3000);
		}
		if (_0x14823 <= -1) {
		  return pushNotify("error", "top-mid", "[E-3] Ошибка, обратитесь в /report", 3000);
		}
		this.Users.splice(parseInt(_0x14823), 1);
		this.Users.sort((a, _0x148BF) => {
		  if (a.rank < _0x148BF.rank) {
			return 1;
		  } else {
			return -1;
		  }
		});
	  },
	  buyAnnouncement: function () {
		mp.trigger("FamilyBuyAnnouncement", this.CurrentAnnouncement);
	  },
	  withdrawMoney: function () {
		let _0x14975 = document.getElementById("FamilyWithdrawMoneyInput").value;
		if (_0x14975 == null || _0x14975 == undefined || _0x14975 == "" || isNaN(_0x14975) || isNaN(parseInt(_0x14975))) {
		  return pushNotify("error", "top-mid", "Сначала введите сумму.", 3000);
		}
		mp.trigger("FamilyWithdrawMoney", _0x14975);
	  }
	}
  });
  let BIZWARWrite = new Vue({
	el: "#new-war-menu",
	data: {
	  Active: 0,
	  BIZWARWeapPick: 0,
	  BIZWARWeap: "Revolver",
	  TargetFamilyID: null,
	  BizwareStartTime: null,
	  ActiveFamilies: [{
		FamilyName: "Puzanov Family",
		Online: 1,
		FamilyID: 16
	  }, {
		FamilyName: "OG Squad",
		Online: 2,
		FamilyID: 6
	  }],
	  BizwarHistory: []
	},
	methods: {
	  SetBIZWARWrite: function () {
		mp.trigger("SetBIZWARWrite", this.TargetFamilyID, this.BIZWARWeap, document.getElementById("bizwarPLCountInput").value);
	  },
	  addUser: function (_0x14669, _0x1464F, _0x1488B, _0x14871, _0x148A5) {
		this.Users.push({
		  staticID: _0x14669,
		  login: _0x1464F,
		  rank: parseInt(_0x1488B),
		  leader: parseInt(_0x14871),
		  tag: _0x148A5
		});
		this.Users.sort((a, _0x148BF) => {
		  if (a.rank < _0x148BF.rank) {
			return 1;
		  } else {
			return -1;
		  }
		});
	  },
	  closeFamilyMenu: function () {
		this.Active = 0;
		mp.trigger("CloseBIZWARWriteMenu");
	  },
	  changeBizwareStartTime: function () {
		this.BizwareStartTime = getBizwarTime();
	  },
	  addActiveFamily: function (_0x149A9, _0x149C3, _0x1498F) {
		this.ActiveFamilies.push({
		  FamilyName: _0x149A9,
		  Online: parseInt(_0x149C3),
		  FamilyID: parseInt(_0x1498F)
		});
		this.ActiveFamilies.sort((a, _0x148BF) => {
		  if (a.Online < _0x148BF.Online) {
			return 1;
		  } else {
			return -1;
		  }
		});
	  },
	  changeTargetFamilyID: function (_0x149DD) {
		this.TargetFamilyID = parseInt(_0x149DD);
	  },
	  loadBizwarHistory: function (_0x14A11) {
		let _0x149F7 = JSON.parse(_0x14A11);
		for (let _0x137C9 = 0; _0x137C9 < _0x149F7.length; _0x137C9++) {
		  this.BizwarHistory.push({
			ID: _0x149F7[_0x137C9].ID,
			Attack: _0x149F7[_0x137C9].Attack,
			Defense: _0x149F7[_0x137C9].Defense,
			Start: _0x149F7[_0x137C9].Start,
			End: _0x149F7[_0x137C9].End,
			Result: _0x149F7[_0x137C9].Result,
			ResultS: _0x149F7[_0x137C9].ResultS
		  });
		}
	  },
	  addNewBizwarHistory: function (_0x14A11) {
		let _0x149F7 = JSON.parse(_0x14A11);
		this.BizwarHistory.unshift({
		  ID: _0x149F7[0].ID,
		  Attack: _0x149F7[0].Attack,
		  Defense: _0x149F7[0].Defense,
		  Start: _0x149F7[0].Start,
		  End: _0x149F7[0].End,
		  Result: _0x149F7[0].Result,
		  ResultS: _0x149F7[0].ResultS
		});
	  },
	  changeBizwarHistoryLog: function (_0x14A5F, _0x14A2B, _0x14A45) {
		let _0x14823 = this.BizwarHistory.find(_0x14A79 => {
		  return parseInt(_0x14A79.ID) == parseInt(_0x14A5F);
		});
		_0x14823.Result = parseInt(_0x14A2B);
		_0x14823.ResultS = _0x14A45;
	  }
	}
  });
  function getBizwarTime() {
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
	return `${getterh}:${getterm} `;
  }
  function pushNotify(_0x13F19, _0x14343, _0x140ED, _0x14FC1) {
	let _0x162BF = null;
	switch (_0x14343) {
	  case "top-mid":
		_0x162BF = "NotifyBlockTop";
		break;
	  case "bottom-mid":
		_0x162BF = "NotifyBlockBottom";
		break;
	}
	if (_0x162BF == null) {
	  return;
	}
	if ($(`#${_0x162BF}`).children().length >= 3) {
	  $(`#${_0x162BF}`).children().first().remove();
	}
	let _0x162A5 = "Title";
	switch (_0x13F19) {
	  case "true":
		_0x162A5 = "Успешно";
		break;
	  case "info":
		_0x162A5 = "Информация";
		break;
	  case "error":
		_0x162A5 = "Ошибка";
		break;
	}
	const _dur = parseInt(_0x14FC1, 10);
	const _ms = Number.isFinite(_dur) && _dur > 0 ? _dur : 3000;
	$(`<div class="pop-list_pop pop-list_pop--${_0x13F19}" style="--notify-dur:${_ms}ms">
		  <div class="pop-list_body">
			<p class="pop-list_heading">${_0x162A5}!</p>
			<p class="pop-list_text">${_0x140ED}</p>
		  </div>
		  <div class="pop-list_progress"><span class="pop-list_progress_bar"></span></div>
		</div>`).appendTo(`#${_0x162BF}`).hide().fadeIn(350).delay(_ms).fadeOut(300, function () {
	  $(this).remove();
	});
  }
  let AnimMenu = new Vue({
	el: "#rp-animation",
	data: {
	  Active: 0,
	  animIndecent: [{
		animName: "Секс 1",
		animDictionary: "rcmpaparazzo_2",
		animationName: "shag_action_a",
		flag: 1
	  }, {
		animName: "Секс 2",
		animDictionary: "rcmpaparazzo_2",
		animationName: "shag_action_poppy",
		flag: 1
	  }, {
		animName: "Дёргать рукой 1",
		animDictionary: "anim@mp_player_intupperwank",
		animationName: "idle_a",
		flag: 1
	  }, {
		animName: "Дёргать рукой 2",
		animDictionary: "anim@mp_player_intcelebrationmale@wank",
		animationName: "wank",
		flag: 1
	  }],
	  animSeat: [{
		animName: "Сесть 1",
		animDictionary: "amb@prop_human_seat_chair@male@generic@base",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сесть 2",
		animDictionary: "amb@prop_human_seat_chair@male@elbows_on_knees@base",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сесть 3",
		animDictionary: "amb@prop_human_seat_chair@male@left_elbow_on_knee@base",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сесть 4",
		animDictionary: "amb@prop_human_seat_chair@male@right_foot_out@base",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сидеть расслаблено 1",
		animDictionary: "anim@amb@yacht@jacuzzi@seated@male@variation_01@",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сидеть расслаблено 2",
		animDictionary: "anim@amb@office@seating@male@var_e@base@",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сидеть расслаблено 3",
		animDictionary: "anim@amb@office@seating@male@var_d@base@",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сидеть расслаблено 4",
		animDictionary: "anim@amb@office@seating@female@var_d@base@",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сидеть расслаблено 5",
		animDictionary: "anim@amb@office@seating@female@var_c@base@",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сидеть на заборе",
		animDictionary: "anim@amb@facility@briefing_room@seating@male@var_e@",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сидеть сложив руки 1",
		animDictionary: "anim@amb@office@boardroom@crew@male@var_c@base_r@",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сидеть сложив руки 2",
		animDictionary: "anim@amb@clubhouse@seating@male@var_c@base@",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сидеть сложив руки 3",
		animDictionary: "amb@world_human_seat_steps@male@hands_in_lap@base",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сидеть 1",
		animDictionary: "amb@prop_human_seat_chair@male@generic@base",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сидеть 2",
		animDictionary: "amb@prop_human_seat_chair@male@elbows_on_knees@base",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сидеть 3",
		animDictionary: "amb@prop_human_seat_chair@male@left_elbow_on_knee@base",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сидеть 4",
		animDictionary: "amb@prop_human_seat_chair@male@right_foot_out@base",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сидеть расслаблено 1",
		animDictionary: "anim@amb@yacht@jacuzzi@seated@male@variation_01@",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сидеть расслаблено 2",
		animDictionary: "anim@amb@office@seating@male@var_e@base@",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сидеть расслаблено 3",
		animDictionary: "anim@amb@office@seating@male@var_d@base@",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сидеть расслаблено 4",
		animDictionary: "anim@amb@office@seating@female@var_d@base@",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сидеть расслаблено 5",
		animDictionary: "anim@amb@office@seating@female@var_c@base@",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сидеть на заборе",
		animDictionary: "anim@amb@facility@briefing_room@seating@male@var_e@",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сидеть сложив руки 1",
		animDictionary: "anim@amb@office@boardroom@crew@male@var_c@base_r@",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сидеть сложив руки 2",
		animDictionary: "anim@amb@clubhouse@seating@male@var_c@base@",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сидеть сложив руки 3",
		animDictionary: "amb@world_human_seat_steps@male@hands_in_lap@base",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Присесть 1",
		animDictionary: "anim@miss@low@fin@lamar@",
		animationName: "idle",
		flag: 1
	  }, {
		animName: "Присесть 2",
		animDictionary: "amb@medic@standing@tendtodead@enter",
		animationName: "enter",
		flag: 1
	  }, {
		animName: "Присесть 3",
		animDictionary: "amb@medic@standing@kneel@base",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Лежать в гамаке",
		animDictionary: "amb@prop_human_seat_sunlounger@male@base",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Лечь на бок",
		animDictionary: "amb@world_human_bum_slumped@male@laying_on_right_side@base",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Лечь на живот",
		animDictionary: "amb@world_human_sunbathe@male@front@base",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Лечь на спину",
		animDictionary: "missfbi1",
		animationName: "cpr_pumpchest_idle",
		flag: 1
	  }, {
		animName: "Сидеть на полу 1",
		animDictionary: "amb@world_human_stupor@male_looking_right@base",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сидеть на полу 2",
		animDictionary: "anim@amb@business@bgen@bgen_no_work@",
		animationName: "sit_phone_phoneputdown_idle_nowork",
		flag: 1
	  }, {
		animName: "Лежать на полу",
		animDictionary: "amb@world_human_sunbathe@male@back@base",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Сидеть с поднятым коленом",
		animDictionary: "amb@world_human_seat_steps@male@elbows_on_knees@base",
		animationName: "base",
		flag: 1
	  }],
	  animSocial: [{
		animName: "Поднять руки",
		animDictionary: "random@mugging3",
		animationName: "handsup_standing_base",
		flag: 49
	  }, {
		animName: "Поднять руки стоя на коленях",
		animDictionary: "random@arrests",
		animationName: "kneeling_arrest_idle",
		flag: 1
	  }, {
		animName: "Руки за голову",
		animDictionary: "random@shop_robbery",
		animationName: "kneel_loop_p",
		flag: 49
	  }, {
		animName: "Передать что-то по рации",
		animDictionary: "random@arrests",
		animationName: "generic_radio_chatter",
		flag: 49
	  }, {
		animName: "Свистнуть",
		animDictionary: "taxi_hail",
		animationName: "fp_hail_taxi",
		flag: 1
	  }, {
		animName: "Воинское приветствие",
		animDictionary: "anim@mp_player_intincarsalutestd@ds@",
		animationName: "idle_a"
	  }, {
		animName: "Показать пальцем",
		animDictionary: "gestures@m@standing@casual",
		animationName: "gesture_point",
		flag: 49
	  }, {
		animName: "Дать согласие 1",
		animDictionary: "gestures@m@standing@casual",
		animationName: "gesture_i_will",
		flag: 49
	  }, {
		animName: "Дать согласие 2",
		animDictionary: "gestures@m@standing@fat",
		animationName: "gesture_bye_soft",
		flag: 49
	  }, {
		animName: "Отказаться-1",
		animDictionary: "gestures@m@standing@casual",
		animationName: "gesture_nod_no_hard",
		flag: 49
	  }, {
		animName: "Отказаться-2",
		animDictionary: "gestures@m@standing@casual",
		animationName: "gesture_no_way",
		flag: 49
	  }, {
		animName: "Отказаться-3",
		animDictionary: "amb@code_human_in_car_mp_actions@nod@bodhi@ds@base",
		animationName: "nod_no_fp",
		flag: 49
	  }, {
		animName: "Рассуждать - 1",
		animDictionary: "anim@amb@board_room@diagram_blueprints@",
		animationName: "idle_01_amy_skater_01",
		flag: 49
	  }, {
		animName: "Рассуждать - 2",
		animDictionary: "anim@amb@board_room@diagram_blueprints@",
		animationName: "look_around_02_amy_skater_01",
		flag: 49
	  }, {
		animName: "Махать руками",
		animDictionary: "random@car_thief@victimpoints_ig_3",
		animationName: "arms_waving",
		flag: 49
	  }, {
		animName: "Пожать плечами",
		animDictionary: "gestures@m@standing@casual",
		animationName: "gesture_what_soft",
		flag: 1
	  }, {
		animName: "Показать два пальца",
		animDictionary: "amb@code_human_in_car_mp_actions@v_sign@bodhi@rps@base",
		animationName: "idle_a",
		flag: 49
	  }, {
		animName: "Смотреть по сторонам",
		animDictionary: "amb@world_human_guard_patrol@male@idle_a",
		animationName: "idle_b",
		flag: 49
	  }, {
		animName: "Осмотреть",
		animDictionary: "amb@medic@standing@kneel@enter",
		animationName: "enter",
		flag: 49
	  }, {
		animName: "Высматривать",
		animDictionary: "missmic4premiere",
		animationName: "crowd_c_idle_01",
		flag: 49
	  }, {
		animName: "Потереть шею",
		animDictionary: "amb@world_human_cop_idles@female@idle_a",
		animationName: "idle_c",
		flag: 49
	  }, {
		animName: "Потереть кисти",
		animDictionary: "amb@world_human_cop_idles@female@idle_b",
		animationName: "idle_d",
		flag: 49
	  }, {
		animName: "Потереть руки",
		animDictionary: "move_action@p_m_one@unarmed@idle@variations",
		animationName: "idle_a",
		flag: 49
	  }, {
		animName: "Отмахнуться-1",
		animDictionary: "taxi_hail",
		animationName: "forget_it",
		flag: 49
	  }, {
		animName: "Отмахнуться-2",
		animDictionary: "anim@mp_freemode_return@f@idle",
		animationName: "idle_b",
		flag: 49
	  }, {
		animName: "Собирать в руках",
		animDictionary: "amb@prop_human_movie_studio_light@idle_a",
		animationName: "idle_a",
		flag: 49
	  }, {
		animName: "Подумать",
		animDictionary: "amb@code_human_police_investigate@idle_a",
		animationName: "idle_a",
		flag: 49
	  }, {
		animName: "Ковырять в носу",
		animDictionary: "anim@mp_player_intcelebrationfemale@nose_pick",
		animationName: "nose_pick",
		flag: 49
	  }, {
		animName: "Поклониться-1",
		animDictionary: "anim@mp_player_intcelebrationpaired@f_f_sarcastic",
		animationName: "sarcastic_right",
		flag: 1
	  }, {
		animName: "Поклониться-2",
		animDictionary: "anim@mp_player_intcelebrationpaired@m_m_sarcastic",
		animationName: "sarcastic_left",
		flag: 1
	  }, {
		animName: "Тссс",
		animDictionary: "anim@mp_player_intcelebrationfemale@shush",
		animationName: "shush",
		flag: 49
	  }, {
		animName: "Радоваться-1",
		animDictionary: "missmic_4premiere",
		animationName: "movie_prem_01_f_a",
		flag: 49
	  }, {
		animName: "Радоваться-2",
		animDictionary: "mini@dartsoutro",
		animationName: "darts_outro_03_guy2",
		flag: 49
	  }, {
		animName: "Радоваться-3",
		animDictionary: "mini@dartsoutro",
		animationName: "darts_outro_01_guy1",
		flag: 49
	  }, {
		animName: "Радоваться-4",
		animDictionary: "anim@mp_player_intcelebrationfemale@freakout",
		animationName: "freakout",
		flag: 49
	  }, {
		animName: "Хлопать 1",
		animDictionary: "missmic_4premiere",
		animationName: "movie_prem_02_f_a",
		flag: 49
	  }, {
		animName: "Хлопать 2",
		animDictionary: "amb@world_human_cheering@female_d",
		animationName: "base",
		flag: 49
	  }, {
		animName: "Хлопать 3",
		animDictionary: "amb@world_human_cheering@male_a",
		animationName: "base",
		flag: 49
	  }, {
		animName: "Хлопать 4",
		animDictionary: "amb@world_human_cheering@male_e",
		animationName: "base",
		flag: 49
	  }, {
		animName: "Хлопать 5",
		animDictionary: "anim@mp_player_intcelebrationfemale@slow_clap",
		animationName: "slow_clap",
		flag: 49
	  }, {
		animName: "Поддержать-1",
		animDictionary: "amb@world_human_cheering@female_a",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Поддержать-2",
		animDictionary: "amb@world_human_cheering@female_c",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Поддержать-3",
		animDictionary: "amb@world_human_cheering@male_b",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Поцеловать-1",
		animDictionary: "anim@mp_player_intcelebrationfemale@blow_kiss",
		animationName: "blow_kiss",
		flag: 1
	  }, {
		animName: "Поцеловать-2",
		animDictionary: "anim@mp_player_intcelebrationfemale@chin_brush",
		animationName: "chin_brush",
		flag: 1
	  }, {
		animName: "Поцеловать-3",
		animDictionary: "anim@mp_player_intcelebrationfemale@finger_kiss",
		animationName: "finger_kiss",
		flag: 1
	  }, {
		animName: "Успокоить",
		animDictionary: "amb@code_human_police_crowd_control@idle_a",
		animationName: "idle_c",
		flag: 1
	  }, {
		animName: "Уважение",
		animDictionary: "anim@mp_player_intcelebrationfemale@bro_love",
		animationName: "bro_love",
		flag: 1
	  }, {
		animName: "Насмешка",
		animDictionary: "anim@arena@celeb@flat@solo@no_props@",
		animationName: "taunt_e_player_b",
		flag: 49
	  }, {
		animName: "Перезвони",
		animDictionary: "anim@mp_player_intcelebrationmale@call_me",
		animationName: "call_me",
		flag: 49
	  }, {
		animName: "В недоумении",
		animDictionary: "anim@arena@celeb@flat@solo@no_props@",
		animationName: "wow_b_player_b",
		flag: 49
	  }, {
		animName: "Показать Фак - 1",
		animDictionary: "anim@mp_player_intupperfinger",
		animationName: "idle_a_fp",
		flag: 2
	  }, {
		animName: "Показать Фак - 2",
		animDictionary: "anim@mp_player_intcelebrationmale@finger",
		animationName: "finger",
		flag: 2
	  }, {
		animName: "Руки вверх",
		animDictionary: "anim@move_hostages@male",
		animationName: "male_idle",
		flag: 49
	  }, {
		animName: "Руки за голову",
		animDictionary: "anim@heists@ornate_bank@hostages@cashier_b@",
		animationName: "flinch_loop_underfire",
		flag: 49
	  }, {
		animName: "Руки за спину",
		animDictionary: "anim@miss@low@fin@vagos@",
		animationName: "idle_ped06",
		flag: 49
	  }, {
		animName: "Просить пощады #1",
		animDictionary: "amb@code_human_cower@male@react_cowering",
		animationName: "base_front",
		flag: 49
	  }, {
		animName: "Просить пощады #2",
		animDictionary: "anim@heists@prison_heistunfinished_biz@popov_react",
		animationName: "popov_cower",
		flag: 49
	  }, {
		animName: "Размять руки-1",
		animDictionary: "anim@mp_player_intcelebrationfemale@knuckle_crunch",
		animationName: "knuckle_crunch",
		flag: 49
	  }, {
		animName: "Размять руки-2",
		animDictionary: "anim@mp_player_intincarknuckle_crunchbodhi@ps@",
		animationName: "idle_a_fp",
		flag: 49
	  }, {
		animName: "Показать бицепс-1",
		animDictionary: "amb@world_human_muscle_flex@arms_at_side@idle_a",
		animationName: "idle_c",
		flag: 1
	  }, {
		animName: "Показать бицепс-2",
		animDictionary: "amb@world_human_muscle_flex@arms_in_front@base",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Распальцовка-1",
		animDictionary: "missmic4premiere",
		animationName: "wave_b",
		flag: 49
	  }, {
		animName: "Распальцовка-2",
		animDictionary: "amb@code_human_in_car_mp_actions@v_sign@std@rds@base",
		animationName: "enter",
		flag: 49
	  }, {
		animName: "Пальцы вверх",
		animDictionary: "anim@mp_player_intcelebrationfemale@thumbs_up",
		animationName: "thumbs_up",
		flag: 49
	  }, {
		animName: "Палец вверх",
		animDictionary: "anim@mp_player_intincarthumbs_upbodhi@ds@",
		animationName: "enter_fp",
		flag: 49
	  }, {
		animName: "Разочароваться",
		animDictionary: "mini@dartsoutro",
		animationName: "darts_outro_03_guy1",
		flag: 49
	  }, {
		animName: "Виноват",
		animDictionary: "anim@mp_parachute_outro@female@lose",
		animationName: "lose_loop",
		flag: 49
	  }, {
		animName: "Дурак",
		animDictionary: "anim@mp_player_intcelebrationfemale@you_loco",
		animationName: "you_loco",
		flag: 49
	  }, {
		animName: "Facepalm",
		animDictionary: "anim@mp_player_intcelebrationfemale@face_palm",
		animationName: "face_palm",
		flag: 49
	  }, {
		animName: "Расстрелять",
		animDictionary: "amb@world_human_superhero@male@space_pistol@idle_a",
		animationName: "idle_b",
		flag: 49
	  }],
	  animBeat: [{
		animName: "Пнуть ногой",
		animDictionary: "anim@mp_freemode_return@f@fail",
		animationName: "fail_a",
		flag: 1
	  }, {
		animName: "Положить что-то в рот",
		animDictionary: "mp_player_int_uppersmoke",
		animationName: "mp_player_int_smoke_enter",
		flag: 49
	  }, {
		animName: "Закинуться",
		animDictionary: "move_m@drunk@transitions",
		animationName: "slightly_to_idle",
		flag: 49
	  }, {
		animName: "Постучать",
		animDictionary: "amb@code_human_in_car_mp_actions@dance@bodhi@ps@base",
		animationName: "idle_a_fp",
		flag: 49
	  }, {
		animName: "Ударить по лежащему",
		animDictionary: "anim@heists@ornate_bank@hostages@hit",
		animationName: "player_melee_long_pistol_a",
		flag: 1
	  }, {
		animName: "Взять с земли",
		animDictionary: "random@mugging4",
		animationName: "pickup_low",
		flag: 1
	  }, {
		animName: "Осмотреть землю",
		animDictionary: "amb@code_human_police_investigate@idle_b",
		animationName: "idle_f",
		flag: 49
	  }, {
		animName: "Ковыряться в земле",
		animDictionary: "amb@world_human_bum_wash@male@high@idle_a",
		animationName: "idle_a",
		flag: 1
	  }, {
		animName: "Механик",
		animDictionary: "amb@world_human_vehicle_mechanic@male@base",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Печатать на компьютере",
		animDictionary: "anim@amb@board_room@stenographer@computer@",
		animationName: "base_right_amy_skater_01",
		flag: 1
	  }, {
		animName: "Принимать душ",
		animDictionary: "mp_safehouseshower@male@",
		animationName: "male_shower_idle_d",
		flag: 1
	  }, {
		animName: "Сидеть у костра",
		animDictionary: "amb@world_human_stand_fire@male@base",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Схватиться за живот",
		animDictionary: "rcmpaparazzo1",
		animationName: "idle",
		flag: 49
	  }, {
		animName: "Почесать задницу",
		animDictionary: "anim@heists@team_respawn@respawn_02",
		animationName: "heist_spawn_02_ped_d",
		flag: 49
	  }, {
		animName: "Потерять сознание",
		animDictionary: "missfam5_blackout",
		animationName: "pass_out",
		flag: 1
	  }, {
		animName: "Помолиться",
		animDictionary: "pro_mcs_7_concat-0",
		animationName: "cs_priest_dual-0",
		flag: 49
	  }, {
		animName: "Отжиматься",
		animDictionary: "amb@world_human_push_ups@male@base",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Качать пресс",
		animDictionary: "amb@world_human_sit_ups@male@base",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Отдышаться",
		animDictionary: "timetable@reunited@ig_2",
		animationName: "jimmy_base",
		flag: 1
	  }, {
		animName: "Умыться",
		animDictionary: "missfam2_washing_face",
		animationName: "michael_washing_face",
		flag: 1
	  }, {
		animName: "Тссс",
		animDictionary: "anim@mp_player_intcelebrationfemale@shush",
		animationName: "shush",
		flag: 49
	  }, {
		animName: "Медитировать-1",
		animDictionary: "missfam5_yoga",
		animationName: "f_yogapose_a",
		flag: 1
	  }, {
		animName: "Медитация 2",
		animDictionary: "missfam5_yoga",
		animationName: "c8_pose",
		flag: 1
	  }, {
		animName: "Медитация 3",
		animDictionary: "missfam5_yoga",
		animationName: "b4_fail_to_start",
		flag: 1
	  }, {
		animName: "Медитация 4",
		animDictionary: "missfam5_yoga",
		animationName: "start_to_c1",
		flag: 1
	  }, {
		animName: "Медитация 5",
		animDictionary: "missfam5_yoga",
		animationName: "start_to_a1",
		flag: 1
	  }, {
		animName: "Медитация 6",
		animDictionary: "missfam5_yoga",
		animationName: "a2_to_a3",
		flag: 1
	  }, {
		animName: "Медитация 7",
		animDictionary: "missfam5_yoga",
		animationName: "a3_fail_to_start",
		flag: 1
	  }, {
		animName: "Победа!",
		animDictionary: "anim@arena@celeb@flat@solo@no_props@",
		animationName: "slide_a_player_a",
		flag: 1
	  }, {
		animName: "Сальто назад",
		animDictionary: "anim@arena@celeb@flat@solo@no_props@",
		animationName: "flip_a_player_a",
		flag: 1
	  }, {
		animName: "Вертушка",
		animDictionary: "anim@arena@celeb@flat@solo@no_props@",
		animationName: "cap_a_player_a",
		flag: 1
	  }, {
		animName: "Размяться 1",
		animDictionary: "amb@world_human_muscle_flex@arms_at_side@idle_a",
		animationName: "idle_a",
		flag: 1
	  }, {
		animName: "Размяться 2",
		animDictionary: "timetable@tracy@ig_5@idle_b",
		animationName: "idle_d",
		flag: 1
	  }, {
		animName: "Бег на месте разводя руки",
		animDictionary: "amb@world_human_jog_standing@female@idle_a",
		animationName: "idle_a",
		flag: 1
	  }, {
		animName: "Бег на месте",
		animDictionary: "amb@world_human_jog_standing@male@base",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Распальцовка 1",
		animDictionary: "missmic4premiere",
		animationName: "wave_b",
		flag: 49
	  }, {
		animName: "Распальцовка 2",
		animDictionary: "amb@code_human_in_car_mp_actions@v_sign@std@rds@base",
		animationName: "enter",
		flag: 49
	  }, {
		animName: "Пальцы вверх",
		animDictionary: "anim@mp_player_intcelebrationfemale@thumbs_up",
		animationName: "thumbs_up",
		flag: 49
	  }, {
		animName: "Палец вверх",
		animDictionary: "anim@mp_player_intincarthumbs_upbodhi@ds@",
		animationName: "enter_fp",
		flag: 49
	  }],
	  AninmStay: [{
		animName: "Встать в стойку-1",
		animDictionary: "anim@deathmatch_intros@unarmed",
		animationName: "intro_male_unarmed_c",
		flag: 1
	  }, {
		animName: "Встать в стойку-2",
		animDictionary: "anim@deathmatch_intros@unarmed",
		animationName: "intro_male_unarmed_a",
		flag: 1
	  }, {
		animName: "Встать в стойку-3",
		animDictionary: "anim@deathmatch_intros@unarmed",
		animationName: "intro_male_unarmed_b",
		flag: 1
	  }, {
		animName: "Встать в стойку-4",
		animDictionary: "anim@deathmatch_intros@unarmed",
		animationName: "intro_male_unarmed_d",
		flag: 1
	  }, {
		animName: "Облокотиться об стену - 1",
		animDictionary: "amb@world_human_leaning@male@wall@back@foot_up@idle_b",
		animationName: "idle_d",
		flag: 1
	  }, {
		animName: "Облокотиться об стену - 2",
		animDictionary: "amb@world_human_leaning@male@wall@back@legs_crossed@idle_a",
		animationName: "idle_a",
		flag: 1
	  }, {
		animName: "С ружьем",
		animDictionary: "anim@deathmatch_intros@2hcombat_mgmale",
		animationName: "intro_male_mg_c",
		flag: 2
	  }, {
		animName: "С битой",
		animDictionary: "anim@deathmatch_intros@melee@2h",
		animationName: "intro_male_melee_2h_b_gclub",
		flag: 2
	  }, {
		animName: "Расставить руки в стороны",
		animDictionary: "missfam5_yoga",
		animationName: "c1_pose",
		flag: 49
	  }, {
		animName: "Расставить руки и ноги в стороны",
		animDictionary: "missfam5_yoga",
		animationName: "a2_pose",
		flag: 49
	  }, {
		animName: "Охранник",
		animDictionary: "missfbi4mcs_2",
		animationName: "loop_sec_b",
		flag: 49
	  }, {
		animName: "Руки-бокс",
		animDictionary: "amb@code_human_police_investigate@base",
		animationName: "base",
		flag: 2
	  }, {
		animName: "Сложить руки 1",
		animDictionary: "rcmme_amanda1",
		animationName: "stand_loop_cop",
		flag: 2
	  }, {
		animName: "Сложить руки 2",
		animDictionary: "amb@world_human_cop_idles@female@idle_b",
		animationName: "idle_e",
		flag: 2
	  }, {
		animName: "Сложить руки 3",
		animDictionary: "anim@amb@business@bgen@bgen_no_work@",
		animationName: "stand_phone_phoneputdown_idle_nowork",
		flag: 2
	  }],
	  animDance: [{
		animName: "Танец 1",
		animDictionary: "anim@mp_player_intcelebrationfemale@dj",
		animationName: "dj",
		flag: 1
	  }, {
		animName: "Танец 1.1",
		animDictionary: "anim@amb@nightclub@djs@dixon@",
		animationName: "dixn_idle_cntr_gb_dix",
		flag: 1
	  }, {
		animName: "Танец 1.2",
		animDictionary: "anim@amb@nightclub@djs@solomun@",
		animationName: "new_sol_dance_a_sol",
		flag: 1
	  }, {
		animName: "Танец 1.3",
		animDictionary: "anim@amb@nightclub@djs@solomun@",
		animationName: "sol_dance_b_sol",
		flag: 1
	  }, {
		animName: "Танец 1.4",
		animDictionary: "anim@amb@nightclub@djs@solomun@",
		animationName: "sol_dance_i_sol",
		flag: 1
	  }, {
		animName: "Танец 1.5",
		animDictionary: "misschinese2_crystalmazemcs1_ig",
		animationName: "dance_loop_tao",
		flag: 1
	  }, {
		animName: "Танец 2",
		animDictionary: "mini@strip_club@lap_dance_2g@ld_2g_p2",
		animationName: "ld_2g_p2_s1",
		flag: 1
	  }, {
		animName: "Танец 3",
		animDictionary: "mini@strip_club@lap_dance_2g@ld_2g_p3",
		animationName: "ld_2g_p3_s2",
		flag: 1
	  }, {
		animName: "Танец 4",
		animDictionary: "amb@world_human_partying@female@partying_beer@idle_a",
		animationName: "idle_b",
		flag: 1
	  }, {
		animName: "Танец 5",
		animDictionary: "amb@world_human_prostitute@cokehead@idle_a",
		animationName: "idle_a",
		flag: 1
	  }, {
		animName: "Танец 6",
		animDictionary: "amb@world_human_prostitute@cokehead@idle_a",
		animationName: "idle_c",
		flag: 1
	  }, {
		animName: "Танец 7",
		animDictionary: "amb@world_human_jog_standing@female@base",
		animationName: "base",
		flag: 1
	  }, {
		animName: "Танец 8",
		animDictionary: "timetable@tracy@ig_8@idle_a",
		animationName: "idle_a",
		flag: 1
	  }, {
		animName: "Танец 9",
		animDictionary: "timetable@tracy@ig_5@idle_a",
		animationName: "idle_a",
		flag: 1
	  }, {
		animName: "Танец 10",
		animDictionary: "timetable@tracy@ig_5@idle_a",
		animationName: "idle_b",
		flag: 1
	  }, {
		animName: "Танец 11",
		animDictionary: "timetable@tracy@ig_5@idle_a",
		animationName: "idle_c",
		flag: 1
	  }, {
		animName: "Танец 12",
		animDictionary: "oddjobs@assassinate@multi@yachttarget@lapdance",
		animationName: "yacht_ld_f",
		flag: 1
	  }, {
		animName: "Танец 13",
		animDictionary: "mp_safehouse",
		animationName: "lap_dance_girl",
		flag: 1
	  }, {
		animName: "Танец 14",
		animDictionary: "misscarsteal4@toilet",
		animationName: "desperate_toilet_idle_a",
		flag: 1
	  }, {
		animName: "Танец 1",
		animDictionary: "anim@amb@nightclub@dancers@club_ambientpeds@med-hi_intensity",
		animationName: "mi-hi_amb_club_10_v1_male^6",
		flag: 1
	  }, {
		animName: "Танец 2",
		animDictionary: "amb@code_human_in_car_mp_actions@dance@bodhi@ds@base",
		animationName: "idle_a_fp",
		flag: 1
	  }, {
		animName: "Танец 3",
		animDictionary: "amb@code_human_in_car_mp_actions@dance@bodhi@rds@base",
		animationName: "idle_b",
		flag: 1
	  }, {
		animName: "Танец 4",
		animDictionary: "amb@code_human_in_car_mp_actions@dance@std@ds@base",
		animationName: "idle_a",
		flag: 1
	  }, {
		animName: "Танец 5",
		animDictionary: "anim@amb@nightclub@dancers@crowddance_facedj@hi_intensity",
		animationName: "hi_dance_facedj_09_v2_male^6",
		flag: 1
	  }, {
		animName: "Танец 6",
		animDictionary: "anim@amb@nightclub@dancers@crowddance_facedj@low_intesnsity",
		animationName: "li_dance_facedj_09_v1_male^6",
		flag: 1
	  }, {
		animName: "Танец 7",
		animDictionary: "anim@amb@nightclub@dancers@crowddance_facedj_transitions@from_hi_intensity",
		animationName: "trans_dance_facedj_hi_to_li_09_v1_male^6",
		flag: 1
	  }, {
		animName: "Танец 8",
		animDictionary: "anim@amb@nightclub@dancers@crowddance_facedj_transitions@from_low_intensity",
		animationName: "trans_dance_facedj_li_to_hi_07_v1_male^6",
		flag: 1
	  }, {
		animName: "Танец 9",
		animDictionary: "anim@amb@nightclub@dancers@crowddance_groups@hi_intensity",
		animationName: "hi_dance_crowd_13_v2_male^6",
		flag: 1
	  }, {
		animName: "Танец 10",
		animDictionary: "anim@amb@nightclub@dancers@crowddance_groups_transitions@from_hi_intensity",
		animationName: "trans_dance_crowd_hi_to_li__07_v1_male^6",
		flag: 1
	  }, {
		animName: "Танец 11",
		animDictionary: "anim@amb@nightclub@dancers@crowddance_single_props@hi_intensity",
		animationName: "hi_dance_prop_13_v1_male^6",
		flag: 1
	  }, {
		animName: "Танец 12",
		animDictionary: "anim@amb@nightclub@dancers@crowddance_single_props_transitions@from_med_intensity",
		animationName: "trans_crowd_prop_mi_to_li_11_v1_male^6",
		flag: 1
	  }, {
		animName: "Танец 13",
		animDictionary: "anim@amb@nightclub@mini@dance@dance_solo@male@var_a@",
		animationName: "med_center_up",
		flag: 1
	  }, {
		animName: "Танец 14",
		animDictionary: "anim@amb@nightclub@mini@dance@dance_solo@male@var_a@",
		animationName: "med_right_up",
		flag: 1
	  }, {
		animName: "Танец 15",
		animDictionary: "anim@amb@nightclub@dancers@crowddance_groups@low_intensity",
		animationName: "li_dance_crowd_17_v1_male^6",
		flag: 1
	  }, {
		animName: "Танец 16",
		animDictionary: "anim@amb@nightclub@dancers@crowddance_facedj_transitions@from_med_intensity",
		animationName: "trans_dance_facedj_mi_to_li_09_v1_male^6",
		flag: 1
	  }, {
		animName: "Танец 17",
		animDictionary: "timetable@tracy@ig_5@idle_b",
		animationName: "idle_e",
		flag: 1
	  }, {
		animName: "Танец 18",
		animDictionary: "mini@strip_club@idles@dj@idle_04",
		animationName: "idle_04",
		flag: 1
	  }, {
		animName: "Танец 19",
		animDictionary: "special_ped@mountain_dancer@monologue_1@monologue_1a",
		animationName: "mtn_dnc_if_you_want_to_get_to_heaven",
		flag: 1
	  }, {
		animName: "Танец 20",
		animDictionary: "special_ped@mountain_dancer@monologue_4@monologue_4a",
		animationName: "mnt_dnc_verse",
		flag: 1
	  }, {
		animName: "Танец 21",
		animDictionary: "special_ped@mountain_dancer@monologue_3@monologue_3a",
		animationName: "mnt_dnc_buttwag",
		flag: 1
	  }, {
		animName: "Танец 22",
		animDictionary: "anim@amb@nightclub@dancers@black_madonna_entourage@",
		animationName: "hi_dance_facedj_09_v2_male^5",
		flag: 1
	  }, {
		animName: "Танец 23",
		animDictionary: "anim@amb@nightclub@dancers@crowddance_single_props@",
		animationName: "hi_dance_prop_09_v1_male^6",
		flag: 1
	  }, {
		animName: "Танец 24",
		animDictionary: "anim@amb@nightclub@dancers@dixon_entourage@",
		animationName: "mi_dance_facedj_15_v1_male^4",
		flag: 1
	  }, {
		animName: "Танец 25",
		animDictionary: "anim@amb@nightclub@dancers@podium_dancers@",
		animationName: "hi_dance_facedj_17_v2_male^5",
		flag: 1
	  }, {
		animName: "Танец 26",
		animDictionary: "anim@amb@nightclub@dancers@tale_of_us_entourage@",
		animationName: "mi_dance_prop_13_v2_male^4",
		flag: 1
	  }, {
		animName: "Танец 27",
		animDictionary: "misschinese2_crystalmazemcs1_cs",
		animationName: "dance_loop_tao",
		flag: 1
	  }, {
		animName: "Танец 28",
		animDictionary: "misschinese2_crystalmazemcs1_ig",
		animationName: "dance_loop_tao",
		flag: 1
	  }, {
		animName: "Танец 29",
		animDictionary: "anim@mp_player_intcelebrationfemale@uncle_disco",
		animationName: "uncle_disco",
		flag: 1
	  }, {
		animName: "Танец 30",
		animDictionary: "anim@mp_player_intcelebrationfemale@raise_the_roof",
		animationName: "raise_the_roof",
		flag: 1
	  }, {
		animName: "Танец 31",
		animDictionary: "anim@mp_player_intcelebrationmale@cats_cradle",
		animationName: "cats_cradle",
		flag: 1
	  }, {
		animName: "Танец 32",
		animDictionary: "anim@mp_player_intupperbanging_tunes",
		animationName: "idle_a",
		flag: 1
	  }, {
		animName: "Танец 33",
		animDictionary: "anim@amb@nightclub@mini@dance@dance_solo@female@var_a@",
		animationName: "high_center",
		flag: 1
	  }, {
		animName: "Танец 34",
		animDictionary: "anim@amb@nightclub@mini@dance@dance_solo@female@var_b@",
		animationName: "high_center",
		flag: 1
	  }, {
		animName: "Танец 35",
		animDictionary: "anim@amb@nightclub@mini@dance@dance_solo@male@var_b@",
		animationName: "high_center",
		flag: 1
	  }, {
		animName: "Танец 36",
		animDictionary: "anim@amb@nightclub@dancers@crowddance_facedj_transitions@",
		animationName: "trans_dance_facedj_hi_to_mi_11_v1_female^6",
		flag: 1
	  }, {
		animName: "Танец 37",
		animDictionary: "anim@amb@nightclub@dancers@crowddance_facedj_transitions@from_hi_intensity",
		animationName: "trans_dance_facedj_hi_to_li_07_v1_female^6",
		flag: 1
	  }, {
		animName: "Танец 38",
		animDictionary: "anim@amb@nightclub@dancers@crowddance_facedj@",
		animationName: "hi_dance_facedj_09_v1_female^6",
		flag: 1
	  }, {
		animName: "Танец 39",
		animDictionary: "anim@amb@nightclub@dancers@crowddance_groups@hi_intensity",
		animationName: "hi_dance_crowd_09_v1_female^6",
		flag: 1
	  }, {
		animName: "Танец 40",
		animDictionary: "anim@amb@nightclub@lazlow@hi_podium@",
		animationName: "danceidle_hi_06_base_laz",
		flag: 1
	  }, {
		animName: "Танец 41",
		animDictionary: "special_ped@zombie@monologue_4@monologue_4l",
		animationName: "iamtheundead_11",
		flag: 1
	  }, {
		animName: "Танец 42",
		animDictionary: "anim@amb@nightclub@djs@black_madonna@",
		animationName: "dance_b_idle_a_blamadon",
		flag: 1
	  }, {
		animName: "Танец 44",
		animDictionary: "anim@amb@nightclub@dancers@crowddance_groups_transitions@from_hi_intensity",
		animationName: "trans_dance_crowd_hi_to_li_09_v1_male^3",
		flag: 1
	  }, {
		animName: "Танец 45",
		animDictionary: "anim@amb@nightclub@dancers@crowddance_groups_transitions@from_hi_intensity",
		animationName: "trans_dance_crowd_hi_to_mi_09_v1_male^2",
		flag: 1
	  }, {
		animName: "Танец 46",
		animDictionary: "anim@amb@nightclub@mini@dance@dance_solo@male@var_a@",
		animationName: "high_center_up",
		flag: 1
	  }, {
		animName: "Танец 47",
		animDictionary: "anim@amb@nightclub@dancers@crowddance_facedj@",
		animationName: "hi_dance_facedj_09_v1_male^4",
		flag: 1
	  }],
	  animsHistory: []
	},
	methods: {
	  playAnim: function (_0x14A93, _0x14AAD) {
		mp.trigger("Animations:playAnim", _0x14A93, _0x14AAD);
	  }
	}
  });
  let NPCDialog = new Vue({
	el: "#messages",
	data: {
	  NPCDialogActive: 0,
	  NPCName: null,
	  NPCType: null,
	  NPCText: null,
	  OfficeShipping: 0,
	  localName: null,
	  DealNrk: 0,
	  CrimeTasks: 0,
	  MaterialDelivery: 0,
	  MaterialDeliveryStart: 0
	},
	methods: {
	  changelocalName: function (_0x1464F) {
		this.localName = _0x1464F;
	  },
	  startNPCDialog: function (_0x13F19) {
		switch (_0x13F19) {
		  case "OfficeDefaultTasks":
			this.NPCName = "Alex";
			this.NPCType = "Работодатель";
			this.NPCText = `Привет, ${this.localName}! Ты что-то хотел?`;
			this.OfficeShipping = 1;
			this.NPCDialogActive = 1;
			break;
		  default:
			break;
		}
	  },
	  NPCIntercation: function (_0x13F19) {
		switch (_0x13F19) {
		  case "TakeTaskShipping":
			this.NPCText = `Хорошо, около офиса стоит машина, тебе необходимо доставить её до порта следуя маршруту. Когда машина будет доставлена, я пополню счёт семьи на 3.000$`;
			this.OfficeShipping = 2;
			break;
		  case "TakeTaskShippingStart":
			this.NPCDialogActive = 0;
			this.OfficeShipping = 0;
			mp.trigger("changeIteractionWithNPC", "stop");
			mp.trigger("FamilyTakeTaskShipping");
			break;
		  case "Exit":
			this.NPCDialogActive = 0;
			this.OfficeShipping = 0;
			mp.trigger("changeIteractionWithNPC", "stop");
			break;
		  case "DealerNrkWhat":
			this.NPCText = `У меня ты можешь купить Вещество RNK, после чего переработать его.`;
			this.DealNrk = 2;
			break;
		  case "DealerNrkDefault":
			this.NPCText = `Здарова, ${this.localName}! Что хотел?`;
			this.DealNrk = 1;
			break;
		  case "DealerNrkSelectBuy":
			this.NPCText = `Окей, сколько свёрстков тебе нужно?`;
			this.DealNrk = 3;
			break;
		  case "DealerNrkExit":
			this.NPCDialogActive = 0;
			this.DealNrk = 0;
			mp.trigger("changeIteractionWithNrkNPC", "stop");
			break;
		  case "CrimeTakeTasks":
			this.NPCText = `Выбирай одно из заданий.`;
			this.CrimeTasks = 2;
			break;
		  case "CrimeTasksDefault":
			this.NPCText = `Привет, ${this.localName}! Нужна работа?`;
			this.CrimeTasks = 1;
			break;
		  case "CrimeTasksSelectBuy":
			this.NPCText = `Окей, сколько отмечек тебе нужно?`;
			this.CrimeTasks = 3;
			break;
		  case "CrimeTasksExit":
			this.NPCDialogActive = 0;
			this.CrimeTasks = 0;
			mp.trigger("changeIteractionWithCrimeTasksNPC", "stop");
			break;
		  case "CrimeStartTaskAuto":
			this.NPCText = `Хорошо, я вышлю тебе координаты машины, которую нужно взломать и пригнать в порт. Не забудь купить отмычки и будь осторожен, сотрудники FIB могут поймать тебя.`;
			this.CrimeTasks = 4;
			break;
		  case "CrimeStartTaskHouse":
			this.NPCText = `Без проблем, я вышлю тебе координаты дома, тебе необходимо взломать дверь дома, вынести оттуда вещи и переложить их в машину. Не забудь купить отмычки и будь осторожен, сотрудники FIB могут поймать тебя.`;
			this.CrimeTasks = 5;
			break;
		  case "MaterialDeliveryDefault":
			this.NPCText = `Привет, ${this.localName}! Хочешь что-то заказать?`;
			this.MaterialDelivery = 1;
			break;
		  case "MaterialDelivery":
			this.NPCText = `Цена заказа материалов - 25.000$, они спишутся с баланса вашей семьи. После этого в гараже появится 3 матовозки, вам необходимо сесть в них и доехать до места загрузки, оно отобразится при посадке в машину. Перетащите материалы в матовозки и доставьте в гараж.`;
			this.MaterialDelivery = 2;
			break;
		  case "MaterialDeliveryExit":
			this.NPCDialogActive = 0;
			this.MaterialDelivery = 0;
			mp.trigger("changeIteractionWithNPC", "stop");
			break;
		  case "MaterialDeliveryTakeExit":
			this.NPCDialogActive = 0;
			this.MaterialDeliveryStart = 0;
			mp.trigger("changeIteractionWithDlvryMtrlsNPC", "stop");
			break;
		}
	  },
	  startNPCDealNrkDialog: function (_0x13F19) {
		switch (_0x13F19) {
		  case "Default":
			this.OfficeShipping = 0;
			this.NPCType = "Дилер";
			this.NPCText = `Здарова, ${this.localName}! Что хотел?`;
			this.DealNrk = 1;
			this.NPCDialogActive = 1;
			break;
		  default:
			break;
		}
	  },
	  dealerNrkBuy: function (_0x14753) {
		mp.trigger("gangwarShopBuyItem", 32, _0x14753);
	  },
	  startNPCCrimeTasksDialog: function (_0x13F19) {
		switch (_0x13F19) {
		  case "Default":
			this.OfficeShipping = 0;
			this.NPCType = "Бандит";
			this.NPCText = `Привет, ${this.localName}! Нужна работа?`;
			this.CrimeTasks = 1;
			this.NPCDialogActive = 1;
			break;
		  default:
			break;
		}
	  },
	  CrimeTaskLockpickBuy: function (_0x14753) {
		mp.trigger("gangwarShopBuyItem", 33, _0x14753);
	  },
	  CrimeTaskStart: function (_0x13F19) {
		mp.trigger("Client:CrimeTaskStart", _0x13F19);
	  },
	  startNPCMaterialDeliveryDialog: function (_0x13F19) {
		switch (_0x13F19) {
		  case "Default":
			this.NPCType = "Поставщик";
			this.NPCText = `Привет, ${this.localName}! Хочешь что-то заказать?`;
			this.MaterialDelivery = 1;
			this.NPCDialogActive = 1;
			break;
		  default:
			break;
		}
	  },
	  MaterialStartDelivery: function () {
		mp.trigger("MaterialStartDelivery");
	  },
	  startNPCMaterialDeliveryTakeDialog: function (_0x13F19) {
		switch (_0x13F19) {
		  case "Default":
			this.NPCType = "Поставщик материалов";
			this.NPCText = `Привет, ${this.localName}! Материалы уже прибыли, готовы начать загружать их в матовозки?`;
			this.MaterialDeliveryStart = 1;
			this.NPCDialogActive = 1;
			break;
		  default:
			break;
		}
	  },
	  MaterialDeliveryTake: function () {
		mp.trigger("MaterialDeliveryTake");
	  }
	}
  });
  let GANGWARChoose = new Vue({
	el: "#GANGWARChooseSpawn",
	data: {
	  Active: 0
	},
	methods: {}
  });
  let GANGWARHouse = new Vue({
	el: "#GangwarHouseInfo",
	data: {
	  Active: 0,
	  House: 0,
	  Price: "25.000",
	  Class: 1,
	  Owner: "Fausto"
	},
	methods: {
	  GANGWAREnterHouse: function () {
		mp.trigger("GANGWARHouseInteraction", "Enter");
	  },
	  GANGWARCloseHouseInfo: function () {
		mp.trigger("GANGWARCloseHouseInfo");
	  },
	  GANGWARBuyHouse: function () {
		mp.trigger("GANGWARHouseInteraction", "Buy");
	  },
	  GANGWARCloseOpenHouse: function () {
		mp.trigger("GANGWARHouseInteraction", "Lock");
	  },
	  GANGWARlockpickHouse: function () {
		mp.trigger("GANGWARlockpickHouse", this.House);
	  }
	}
  });
  let GANGWARVehSell = new Vue({
	el: "#sale-auto-window",
	data: {
	  Active: 0,
	  vehList: [],
	  sellModalData: [{
		Name: "Аптечка",
		numberPlate: "Fausto",
		Price: "100.000",
		Img: "img/gangwarShop/repairKit.png",
		tuningData: [1, 2, 3]
	  }]
	},
	methods: {
	  AddVehicleForSell: function (_0x147D5, _0x13E7D, _0x13E63, _0x14AC7, _0x14AE1, _0x14AFB) {
		this.vehList.push({
		  ID: _0x147D5,
		  model: _0x13E7D,
		  img: _0x13E63,
		  numberPlate: _0x14AE1,
		  Price: _0x14AC7,
		  tuningData: _0x14AFB
		});
	  },
	  removeVehicleForSell: function (_0x147D5) {
		let _0x14B15 = this.vehList.findIndex(_0x14B2F => {
		  return _0x14B2F.ID == parseInt(_0x147D5);
		});
		if (_0x14B15 <= -1) {
		  return;
		}
		this.vehList.splice(parseInt(_0x14B15), 1);
	  },
	  selectVehForSell: function (_0x147D5, _0x14A93, _0x14AE1, _0x14601, _0x14B49, _0x14AFB) {
		this.sellModalData = [{
		  Name: _0x14A93,
		  numberPlate: _0x14AE1,
		  Price: _0x14601,
		  Img: _0x14B49,
		  tuningData: _0x14AFB,
		  vehID: _0x147D5
		}];
	  },
	  startSellVehForTarget: function () {
		if (this.sellModalData[0].vehID == null || this.sellModalData[0].vehID == undefined || isNaN(parseInt(this.sellModalData[0].vehID))) {
		  return pushNotify("error", "top-mid", "Машина не определена", 1000);
		}
		let _0x1476D = document.getElementById("InputVehSellForTarget").value;
		if (_0x1476D == null || _0x1476D == undefined || isNaN(parseInt(_0x1476D))) {
		  return pushNotify("error", "top-mid", "Сначала укажите цену продажи в $", 1000);
		}
		mp.trigger("sellPlayerVehForTarget", JSON.stringify(this.sellModalData), _0x1476D);
	  }
	}
  });
  let GANGWARVehBuy = new Vue({
	el: "#buy-auto-window",
	data: {
	  Active: 0,
	  sellerName: "",
	  sellModalData: [{
		Name: "Аптечка",
		numberPlate: "Fausto",
		Price: "100.000",
		Img: "img/gangwarShop/repairKit.png",
		tuningData: [1, 2, 3]
	  }]
	},
	methods: {
	  setVehForBuy: function (_0x14B7D, _0x14B97, _0x1476D) {
		this.sellerName = _0x14B7D;
		let _0x14B63 = JSON.parse(_0x14B97);
		this.sellModalData = [{
		  Name: _0x14B63[0].Name,
		  numberPlate: _0x14B63[0].numberPlate,
		  Price: _0x14B63[0].Price,
		  Img: _0x14B63[0].Img,
		  tuningData: _0x14B63[0].tuningData,
		  vehID: _0x14B63[0].id,
		  sellPrice: _0x1476D
		}];
		this.Active = 1;
	  }
	}
  });
  let EstateAgency = new Vue({
	el: "#EstateAgency",
	data: {
	  Active: 0,
	  housesG: [],
	  housesE: [],
	  housesC: [],
	  housesB: []
	},
	methods: {
	  AddHouseFor: function (_0x147D5, _0x14BB1, _0x14BCB, _0x14BE5) {
		switch (parseInt(_0x14BB1)) {
		  case 1:
			this.housesG.push({
			  ID: _0x147D5,
			  Cl: _0x14BB1,
			  Pr: _0x14BCB,
			  Tax: _0x14BE5
			});
			break;
		  case 2:
			this.housesE.push({
			  ID: _0x147D5,
			  Cl: _0x14BB1,
			  Pr: _0x14BCB,
			  Tax: _0x14BE5
			});
			break;
		  case 3:
			this.housesC.push({
			  ID: _0x147D5,
			  Cl: _0x14BB1,
			  Pr: _0x14BCB,
			  Tax: _0x14BE5
			});
			break;
		  default:
			this.housesB.push({
			  ID: _0x147D5,
			  Cl: _0x14BB1,
			  Pr: _0x14BCB,
			  Tax: _0x14BE5
			});
			break;
		}
	  },
	  BuyAContract: function (_0x147D5) {
		mp.trigger("EstateAgencyBuyAContract", _0x147D5);
	  }
	}
  });
  let nrkMiniGame = new Vue({
	el: "#nrk-mini-games",
	data: {
	  Active: 0,
	  circleColor: `255,55,12`,
	  currentStage: 0,
	  circleLeft: 0,
	  circleTop: 0,
	  circleInterval: null,
	  circleTime: 15
	},
	methods: {
	  generateNewCircle: function () {
		this.circleColor = `${Math.floor(Math.random() * 256)},${Math.floor(Math.random() * 256)},${Math.floor(Math.random() * 256)}`;
		this.circleLeft = `${Math.round(Math.random() * 530)}px`;
		this.circleTop = `${Math.round(Math.random() * 159)}px`;
	  },
	  startCircleGame: function () {
		this.generateNewCircle();
		this.clearCircleInterval();
		this.circleTime = 15;
		this.currentStage = 0;
		this.circleInterval = setInterval(() => {
		  if (this.circleTime < 1) {
			this.endCircleGame("fail");
			return console.log(`не успел`);
		  }
		  this.circleTime--;
		  if (parseInt(this.circleTime) < 10) {
			this.circleTime = `0${this.circleTime}`;
		  }
		}, 1000);
		this.Active = 1;
	  },
	  clearCircleInterval: function () {
		if (this.circleInterval != null) {
		  clearInterval(this.circleInterval);
		  this.circleInterval = null;
		}
	  },
	  endCircleGame: function (_0x13F19) {
		this.clearCircleInterval();
		this.Active = 0;
		mp.trigger("stopNRKCraft", _0x13F19);
	  },
	  circleClick: function () {
		this.currentStage++;
		if (this.currentStage > 19) {
		  this.endCircleGame("success");
		  return console.log(`успел`);
		}
		this.generateNewCircle();
	  }
	}
  });
  let unRNK = new Vue({
	el: "#unRNK",
	data: {
	  Active: 0,
	  RNKAddiction: 0
	},
	methods: {
	  cancel: function () {
		mp.trigger("EMSCancelUnRNK");
	  },
	  startClearRNK: function () {
		mp.trigger("EMSstartClearRNK");
	  }
	}
  });
  let GANGWARHouseSell = new Vue({
	el: "#sale-house-window",
	data: {
	  Active: 0,
	  houseList: [],
	  sellModalData: [{
		houseNumber: 1,
		class: 1,
		Price: 1,
		classStr: "A"
	  }]
	},
	methods: {
	  AddHouseForSell: function (_0x14C33, _0x14C19, _0x14AC7, _0x14BFF) {
		this.houseList.push({
		  houseNumber: _0x14C33,
		  class: _0x14C19,
		  classStr: _0x14BFF,
		  Price: _0x14AC7
		});
	  },
	  removeAllHouseForSell: function () {
		this.houseList = [];
	  },
	  selectHouseForSell: function (_0x14C33, _0x14601, _0x14C4D, _0x14BFF) {
		this.sellModalData = [{
		  houseNumber: _0x14C33,
		  Price: _0x14601,
		  class: _0x14C4D,
		  classStr: _0x14BFF
		}];
	  },
	  startSellHouseForTarget: function () {
		if (this.sellModalData[0].houseNumber == null || this.sellModalData[0].houseNumber == undefined || isNaN(parseInt(this.sellModalData[0].houseNumber))) {
		  return pushNotify("error", "top-mid", "Дом не определен", 1000);
		}
		let _0x1476D = document.getElementById("InputHouseSellForTarget").value;
		if (_0x1476D == null || _0x1476D == undefined || isNaN(parseInt(_0x1476D))) {
		  return pushNotify("error", "top-mid", "Сначала укажите цену продажи в $", 1000);
		}
		mp.trigger("sellPlayerHouseForTarget", this.sellModalData[0].houseNumber, _0x1476D);
	  }
	}
  });
  let GANGWARHouseBuy = new Vue({
	el: "#buy-house-window",
	data: {
	  Active: 0,
	  sellerName: "",
	  sellModalData: [{
		houseNumber: 1,
		class: 1,
		Price: 1,
		classStr: "A"
	  }]
	},
	methods: {
	  setHouseForBuy: function (_0x14B7D, _0x14C33, _0x14C67, _0x14C81, _0x1476D) {
		this.sellerName = _0x14B7D;
		this.sellModalData = [{
		  houseNumber: _0x14C33,
		  class: _0x14C67,
		  Price: _0x1476D,
		  classStr: _0x14C81
		}];
		this.Active = 1;
	  }
	}
  });
  setTimeout(() => {
	BIZWARWrite.changeBizwareStartTime();
	setInterval(() => {
	  BIZWARWrite.changeBizwareStartTime();
	}, 60000);
  }, 10000);
  let mainMenuTabCont = new Vue({
	el: "#main-nav",
	data: {
	  ShopX2: 0
	},
	methods: {}
  });
  let PrivilegeShopListBlock = new Vue({
	el: "#hardvipblock",
	data: {
	  showny: 0
	},
	methods: {}
  });
  let newyearcase = new Vue({
	el: "#newyearcase",
	data: {
	  showny: 0
	},
	methods: {}
  });

  function armorCosmeticShopApply(payload) {
	var unlockSet = {};
	var equipped = "";
	try {
	  if (payload && payload.unlocks) {
		for (var i = 0; i < payload.unlocks.length; i++) {
		  unlockSet[String(payload.unlocks[i])] = true;
		}
	  }
	  if (payload && payload.equipped != null) equipped = String(payload.equipped);
	} catch (_pe) {}
	var el = document.getElementById("ShopArmorCosmeticList");
	if (!el || typeof ARMOR_SHOP_VARIANTS === "undefined") return;
	el.innerHTML = "";
	var giftIco = "package://browsers/inventory/img/armor_gift.svg";
	var shown = 0;
	for (var j = 0; j < ARMOR_SHOP_VARIANTS.length; j++) {
	  var v = ARMOR_SHOP_VARIANTS[j];
	  var key = v.d + ":" + v.t;
	  if (!unlockSet[key]) continue;
	  var imgUrl = typeof window.armorCosmeticImgUrl === "function" ? window.armorCosmeticImgUrl(v.img) : v.img;
	  var active = equipped === key ? " shop-armor-card--active" : "";
	  var btnLabel = equipped === key ? "Надето" : "Использовать";
	  var btnDis = equipped === key ? " disabled" : "";
	  el.innerHTML += '<div class="shop-armor-card' + active + '">' +
		'<div class="shop-armor-card__body">' +
		'<img class="shop-armor-card__img" src="' + imgUrl + '" alt="">' +
		'<div class="shop-armor-card__title">' + v.name + '</div>' +
		'</div>' +
		'<div class="shop-armor-card__foot">' +
		'<button type="button" class="shop-armor-use-btn"' + btnDis + ' data-ad="' + v.d + '" data-at="' + v.t + '">' + btnLabel + '</button>' +
		'<button type="button" class="shop-armor-gift-btn" title="Упаковать в подарок" data-ad="' + v.d + '" data-at="' + v.t + '">' +
		'<img class="shop-armor-gift-btn__ico" src="' + giftIco + '" alt="">' +
		'</button>' +
		'</div></div>';
	  shown++;
	}
	if (!shown) {
	  el.innerHTML = '<p class="shop-armor-empty">Нет открытых скинов. Откройте кейс Armor в разделе «Кейсы».</p>';
	} else {
	  el.innerHTML =
		'<div class="shop-armor-grid__head">' +
		'<span class="shop-armor-grid__counter">Открыто скинов: <b>' + shown + '</b></span>' +
		'<span class="shop-armor-grid__hint">«Использовать» — надеть скин. Квадрат с подарком — упаковать в инвентарь.</span>' +
		'</div>' +
		'<div class="shop-armor-grid__items">' + el.innerHTML + '</div>';
	}
  }
  window.armorCosmeticShopApply = armorCosmeticShopApply;

  $(document).on("click", ".shop-armor-gift-btn", function (e) {
	e.preventDefault();
	e.stopPropagation();
	var $btn = $(this);
	var di = parseInt($btn.attr("data-ad"), 10);
	var ti = parseInt($btn.attr("data-at"), 10);
	try {
	  if (typeof mp !== "undefined" && mp.trigger) mp.trigger("armorCosmeticGiftWrap", di, ti);
	} catch (_mg) {}
  });

  $(document).on("click", ".shop-armor-use-btn", function () {
	var $btn = $(this);
	var di = parseInt($btn.attr("data-ad"), 10);
	var ti = parseInt($btn.attr("data-at"), 10);
	try {
	  if (typeof mp !== "undefined" && mp.trigger) mp.trigger("armorCosmeticEquip", di, ti);
	} catch (_me) {}
  });

  $(document).on("shown.bs.tab", 'a[data-toggle="tab"][href="#shop-armor"]', function () {
	try {
	  if (typeof mp !== "undefined" && mp.trigger) mp.trigger("armorCosmeticShopPull");
	} catch (_te) {}
  });
