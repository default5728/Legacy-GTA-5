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
function changeTattooShopDisplay(_0x13F19) {
  switch (_0x13F19) {
    case "open":
      document.getElementById("tattoo-menu").style.display = "block";
      if (typeof loadTattooItems === "function") loadTattooItems();
      if (typeof tattooShopSetActiveZone === "function") tattooShopSetActiveZone(tattooShopState.activeZone);
      break;
    case "close":
      document.getElementById("tattoo-menu").style.display = "none";
      tattooShopState.selectedIdx = -1;
      tattooShopState.searchQuery = "";
      break;
  }
}
var TattooShopList = [
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_000_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_000_F",
    Zone: 0,
    Name: "Devil",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_001_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_001_F",
    Zone: 0,
    Name: "Indian",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_003_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_003_F",
    Zone: 0,
    Name: "Tiger",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_004_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_004_F",
    Zone: 0,
    Name: "Eye of Providence",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_005_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_005_F",
    Zone: 0,
    Name: "Owl",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_006_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_006_F",
    Zone: 0,
    Name: "Always Ready",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_007_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_007_F",
    Zone: 0,
    Name: "OverWolf",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_008_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_008_F",
    Zone: 0,
    Name: "S.O.V.A",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_009_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_009_F",
    Zone: 0,
    Name: "Filipin",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_010_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_010_F",
    Zone: 0,
    Name: "Redskin",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_011_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_011_F",
    Zone: 0,
    Name: "Dead Flowers",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_012_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_012_F",
    Zone: 0,
    Name: "Deadly Rose",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_013_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_013_F",
    Zone: 0,
    Name: "Hades",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_014_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_014_F",
    Zone: 0,
    Name: "Royal",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_015_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_015_F",
    Zone: 0,
    Name: "Croco",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_016_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_016_F",
    Zone: 0,
    Name: "Puggy",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_017_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_017_F",
    Zone: 0,
    Name: "Skull & Snake",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_018_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_018_F",
    Zone: 0,
    Name: "Dragon Lore",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_019_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_019_F",
    Zone: 0,
    Name: "Flower",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_020_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_020_F",
    Zone: 0,
    Name: "Legion Commander",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_021_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_021_F",
    Zone: 0,
    Name: "Kisa",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_022_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_022_F",
    Zone: 0,
    Name: "PVP",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_023_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_023_F",
    Zone: 0,
    Name: "Horse",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_024_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_024_F",
    Zone: 0,
    Name: "Birds",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_025_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_025_F",
    Zone: 0,
    Name: "Dead Legion Commander",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_026_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_026_F",
    Zone: 0,
    Name: "Demorgan",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_027_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_027_F",
    Zone: 0,
    Name: "Sun Eye",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_028_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_028_F",
    Zone: 0,
    Name: "Samurai",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_029_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_029_F",
    Zone: 0,
    Name: "Warrior",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_030_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_030_F",
    Zone: 0,
    Name: "Triforce",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_031_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_031_F",
    Zone: 0,
    Name: "Magic Animal",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_032_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_032_F",
    Zone: 0,
    Name: "Elephant",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_033_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_033_F",
    Zone: 0,
    Name: "Lynx",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_040_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_040_F",
    Zone: 0,
    Name: "Feather of the Phoenix",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_041_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_041_F",
    Zone: 0,
    Name: "Bloods Gang",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_042_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_042_F",
    Zone: 0,
    Name: "Brokers",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_043_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_043_F",
    Zone: 0,
    Name: "Crips Gang",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_044_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_044_F",
    Zone: 0,
    Name: "KJEZ",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_045_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_045_F",
    Zone: 0,
    Name: "Ballas Gang",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_046_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_046_F",
    Zone: 0,
    Name: "SF",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_047_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_047_F",
    Zone: 0,
    Name: "LostMC",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_048_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_048_F",
    Zone: 0,
    Name: "ECF",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_049_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_049_F",
    Zone: 0,
    Name: "719",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_050_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_050_F",
    Zone: 0,
    Name: "ACF",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_051_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_051_F",
    Zone: 0,
    Name: "Pandora",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_053_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_053_F",
    Zone: 0,
    Name: "Fairy Wings",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_054_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_054_F",
    Zone: 0,
    Name: "Mad Tiger",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_055_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_055_F",
    Zone: 0,
    Name: "Motorcycle",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_056_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_056_F",
    Zone: 0,
    Name: "Biker Forever",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_057_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_057_F",
    Zone: 0,
    Name: "Spartan",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_058_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_058_F",
    Zone: 0,
    Name: "Fast and Loud",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_059_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_059_F",
    Zone: 0,
    Name: "Bang4Life",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_060_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_060_F",
    Zone: 0,
    Name: "Cyber Animal",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_061_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_061_F",
    Zone: 0,
    Name: "Mister Capture",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_062_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_062_F",
    Zone: 0,
    Name: "Asterix",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_063_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_063_F",
    Zone: 0,
    Name: "Obelix",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_064_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_064_F",
    Zone: 0,
    Name: "Bandit",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_065_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_065_F",
    Zone: 0,
    Name: "Miss Capture",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_066_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_066_F",
    Zone: 0,
    Name: "Bad to the Bones",
    Price: "15000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_023_M",
    OverlayFemale: "mpHeist3_Tat_023_F",
    Zone: 0,
    Name: "Bigfoot",
    Price: "15000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_024_M",
    OverlayFemale: "mpHeist3_Tat_024_F",
    Zone: 0,
    Name: "Mount Chiliad",
    Price: "15000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_025_M",
    OverlayFemale: "mpHeist3_Tat_025_F",
    Zone: 0,
    Name: "Davis",
    Price: "15000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_026_M",
    OverlayFemale: "mpHeist3_Tat_026_F",
    Zone: 0,
    Name: "Dignity",
    Price: "15000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_027_M",
    OverlayFemale: "mpHeist3_Tat_027_F",
    Zone: 0,
    Name: "Epsilon",
    Price: "15000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_028_M",
    OverlayFemale: "mpHeist3_Tat_028_F",
    Zone: 0,
    Name: "Bananas Gone Bad",
    Price: "15000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_029_M",
    OverlayFemale: "mpHeist3_Tat_029_F",
    Zone: 0,
    Name: "Fatal Incursion",
    Price: "15000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_030_M",
    OverlayFemale: "mpHeist3_Tat_030_F",
    Zone: 0,
    Name: "Howitzer",
    Price: "15000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_033_M",
    OverlayFemale: "mpHeist3_Tat_033_F",
    Zone: 0,
    Name: "LS City",
    Price: "20000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_035_M",
    OverlayFemale: "mpHeist3_Tat_035_F",
    Zone: 0,
    Name: "LS Panic",
    Price: "20000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_036_M",
    OverlayFemale: "mpHeist3_Tat_036_F",
    Zone: 0,
    Name: "LS Shield",
    Price: "20000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_037_M",
    OverlayFemale: "mpHeist3_Tat_037_F",
    Zone: 0,
    Name: "Ladybug",
    Price: "20000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_038_M",
    OverlayFemale: "mpHeist3_Tat_038_F",
    Zone: 0,
    Name: "Robot Bubblegum",
    Price: "20000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_039_M",
    OverlayFemale: "mpHeist3_Tat_039_F",
    Zone: 0,
    Name: "Space Rangers",
    Price: "20000"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_000_M",
    OverlayFemale: "MP_Vinewood_Tat_000_F",
    Zone: 0,
    Name: "In the Pocket",
    Price: "7500"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_001_M",
    OverlayFemale: "MP_Vinewood_Tat_001_F",
    Zone: 0,
    Name: "Jackpot",
    Price: "7500"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_003_M",
    OverlayFemale: "MP_Vinewood_Tat_003_F",
    Zone: 0,
    Name: "Royal Flush",
    Price: "7500"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_006_M",
    OverlayFemale: "MP_Vinewood_Tat_006_F",
    Zone: 0,
    Name: "Wheel of Suits",
    Price: "7500"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_007_M",
    OverlayFemale: "MP_Vinewood_Tat_007_F",
    Zone: 0,
    Name: "777",
    Price: "15000"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_008_M",
    OverlayFemale: "MP_Vinewood_Tat_008_F",
    Zone: 0,
    Name: "Snake Eyes",
    Price: "12500"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_009_M",
    OverlayFemale: "MP_Vinewood_Tat_009_F",
    Zone: 0,
    Name: "Till Death Do Us Part",
    Price: "12500"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_010_M",
    OverlayFemale: "MP_Vinewood_Tat_010_F",
    Zone: 0,
    Name: "Photo Finish",
    Price: "12500"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_011_M",
    OverlayFemale: "MP_Vinewood_Tat_011_F",
    Zone: 0,
    Name: "Life's a Gamble",
    Price: "12500"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_012_M",
    OverlayFemale: "MP_Vinewood_Tat_012_F",
    Zone: 0,
    Name: "Skull of Suits",
    Price: "12500"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_015_M",
    OverlayFemale: "MP_Vinewood_Tat_015_F",
    Zone: 0,
    Name: "The Jolly Joker",
    Price: "12500"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_016_M",
    OverlayFemale: "MP_Vinewood_Tat_016_F",
    Zone: 0,
    Name: "Rose & Aces",
    Price: "12500"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_017_M",
    OverlayFemale: "MP_Vinewood_Tat_017_F",
    Zone: 0,
    Name: "Roll the Dice",
    Price: "12500"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_021_M",
    OverlayFemale: "MP_Vinewood_Tat_021_F",
    Zone: 0,
    Name: "Show Your Hand",
    Price: "12500"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_022_M",
    OverlayFemale: "MP_Vinewood_Tat_022_F",
    Zone: 0,
    Name: "Blood Money",
    Price: "12500"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_023_M",
    OverlayFemale: "MP_Vinewood_Tat_023_F",
    Zone: 0,
    Name: "Lucky 7s",
    Price: "12500"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_024_M",
    OverlayFemale: "MP_Vinewood_Tat_024_F",
    Zone: 0,
    Name: "Cash Mouth",
    Price: "12500"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_029_M",
    OverlayFemale: "MP_Vinewood_Tat_029_F",
    Zone: 0,
    Name: "The Table",
    Price: "12500"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_030_M",
    OverlayFemale: "MP_Vinewood_Tat_030_F",
    Zone: 0,
    Name: "The Royals",
    Price: "12500"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_031_M",
    OverlayFemale: "MP_Vinewood_Tat_031_F",
    Zone: 0,
    Name: "Gambling Royalty",
    Price: "12500"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_032_M",
    OverlayFemale: "MP_Vinewood_Tat_032_F",
    Zone: 0,
    Name: "Play Your Ace",
    Price: "12500"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "MP_Buis_M_Stomach_000",
    OverlayFemale: "",
    Zone: 0,
    Name: "Refined Hustler",
    Price: "12500"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "MP_Buis_M_Chest_000",
    OverlayFemale: "",
    Zone: 0,
    Name: "Rich",
    Price: "5000"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "MP_Buis_M_Chest_001",
    OverlayFemale: "",
    Zone: 0,
    Name: "$$$",
    Price: "5000"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "MP_Buis_M_Back_000",
    OverlayFemale: "",
    Zone: 0,
    Name: "Makin' Paper",
    Price: "5000"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "",
    OverlayFemale: "MP_Buis_F_Chest_000",
    Zone: 0,
    Name: "High Roller",
    Price: "5000"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "",
    OverlayFemale: "MP_Buis_F_Chest_001",
    Zone: 0,
    Name: "Makin' Money",
    Price: "5000"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "",
    OverlayFemale: "MP_Buis_F_Chest_002",
    Zone: 0,
    Name: "Love Money",
    Price: "5000"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "",
    OverlayFemale: "MP_Buis_F_Stom_000",
    Zone: 0,
    Name: "Diamond Back",
    Price: "5000"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "",
    OverlayFemale: "MP_Buis_F_Stom_001",
    Zone: 0,
    Name: "Santo Capra Logo",
    Price: "5000"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "",
    OverlayFemale: "MP_Buis_F_Stom_002",
    Zone: 0,
    Name: "Money Bag",
    Price: "5000"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "",
    OverlayFemale: "MP_Buis_F_Back_000",
    Zone: 0,
    Name: "Respect",
    Price: "5000"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "",
    OverlayFemale: "MP_Buis_F_Back_001",
    Zone: 0,
    Name: "Gold Digger",
    Price: "7500"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_005",
    OverlayFemale: "MP_Xmas2_F_Tat_005",
    Zone: 0,
    Name: "Carp Outline",
    Price: "7500"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_006",
    OverlayFemale: "MP_Xmas2_F_Tat_006",
    Zone: 0,
    Name: "Carp Shaded",
    Price: "7500"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_009",
    OverlayFemale: "MP_Xmas2_F_Tat_009",
    Zone: 0,
    Name: "Time To Die",
    Price: "7500"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_011",
    OverlayFemale: "MP_Xmas2_F_Tat_011",
    Zone: 0,
    Name: "Roaring Tiger",
    Price: "7500"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_013",
    OverlayFemale: "MP_Xmas2_F_Tat_013",
    Zone: 0,
    Name: "Lizard",
    Price: "7500"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_015",
    OverlayFemale: "MP_Xmas2_F_Tat_015",
    Zone: 0,
    Name: "Japanese Warrior",
    Price: "7500"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_016",
    OverlayFemale: "MP_Xmas2_F_Tat_016",
    Zone: 0,
    Name: "Loose Lips Outline",
    Price: "7500"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_017",
    OverlayFemale: "MP_Xmas2_F_Tat_017",
    Zone: 0,
    Name: "Loose Lips Color",
    Price: "7500"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_018",
    OverlayFemale: "MP_Xmas2_F_Tat_018",
    Zone: 0,
    Name: "Royal Dagger Outline",
    Price: "7500"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_019",
    OverlayFemale: "MP_Xmas2_F_Tat_019",
    Zone: 0,
    Name: "Royal Dagger Color",
    Price: "7500"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_028",
    OverlayFemale: "MP_Xmas2_F_Tat_028",
    Zone: 0,
    Name: "Executioner",
    Price: "7500"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_000_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_000_F",
    Zone: 0,
    Name: "Bullet Proof",
    Price: "7500"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_001_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_001_F",
    Zone: 0,
    Name: "Crossed Weapons",
    Price: "7500"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_009_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_009_F",
    Zone: 0,
    Name: "Butterfly Knife",
    Price: "10000"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_010_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_010_F",
    Zone: 0,
    Name: "Cash Money",
    Price: "10000"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_012_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_012_F",
    Zone: 0,
    Name: "Dollar Daggers",
    Price: "10000"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_013_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_013_F",
    Zone: 0,
    Name: "Wolf Insignia",
    Price: "10000"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_014_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_014_F",
    Zone: 0,
    Name: "Backstabber",
    Price: "10000"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_017_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_017_F",
    Zone: 0,
    Name: "Dog Tags",
    Price: "10000"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_018_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_018_F",
    Zone: 0,
    Name: "Dual Wield Skull",
    Price: "10000"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_019_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_019_F",
    Zone: 0,
    Name: "Pistol Wings",
    Price: "10000"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_020_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_020_F",
    Zone: 0,
    Name: "Crowned Weapons",
    Price: "10000"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_022_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_022_F",
    Zone: 0,
    Name: "Explosive Heart",
    Price: "10000"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_028_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_028_F",
    Zone: 0,
    Name: "Micro SMG Chain",
    Price: "10000"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_029_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_029_F",
    Zone: 0,
    Name: "Win Some Lose Some",
    Price: "10000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_000",
    OverlayFemale: "FM_Hip_F_Tat_000",
    Zone: 0,
    Name: "Crossed Arrows",
    Price: "10000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_002",
    OverlayFemale: "FM_Hip_F_Tat_002",
    Zone: 0,
    Name: "Chemistry",
    Price: "10000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_006",
    OverlayFemale: "FM_Hip_F_Tat_006",
    Zone: 0,
    Name: "Feather Birds",
    Price: "10000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_011",
    OverlayFemale: "FM_Hip_F_Tat_011",
    Zone: 0,
    Name: "Infinity",
    Price: "10000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_012",
    OverlayFemale: "FM_Hip_F_Tat_012",
    Zone: 0,
    Name: "Antlers",
    Price: "10000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_013",
    OverlayFemale: "FM_Hip_F_Tat_013",
    Zone: 0,
    Name: "Boombox",
    Price: "10000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_024",
    OverlayFemale: "FM_Hip_F_Tat_024",
    Zone: 0,
    Name: "Pyramid",
    Price: "10000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_025",
    OverlayFemale: "FM_Hip_F_Tat_025",
    Zone: 0,
    Name: "Watch Your Step",
    Price: "7500"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_029",
    OverlayFemale: "FM_Hip_F_Tat_029",
    Zone: 0,
    Name: "Sad",
    Price: "7500"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_030",
    OverlayFemale: "FM_Hip_F_Tat_030",
    Zone: 0,
    Name: "Shark Fin",
    Price: "7500"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_031",
    OverlayFemale: "FM_Hip_F_Tat_031",
    Zone: 0,
    Name: "Skateboard",
    Price: "7500"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_032",
    OverlayFemale: "FM_Hip_F_Tat_032",
    Zone: 0,
    Name: "Paper Plane",
    Price: "7500"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_033",
    OverlayFemale: "FM_Hip_F_Tat_033",
    Zone: 0,
    Name: "Stag",
    Price: "7500"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_035",
    OverlayFemale: "FM_Hip_F_Tat_035",
    Zone: 0,
    Name: "Sewn Heart",
    Price: "7500"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_041",
    OverlayFemale: "FM_Hip_F_Tat_041",
    Zone: 0,
    Name: "Tooth",
    Price: "7500"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_046",
    OverlayFemale: "FM_Hip_F_Tat_046",
    Zone: 0,
    Name: "Triangles",
    Price: "7500"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_047",
    OverlayFemale: "FM_Hip_F_Tat_047",
    Zone: 0,
    Name: "Cassette",
    Price: "7500"
  },
  {
    Collection: "mpimportexport_overlays",
    OverlayMale: "MP_MP_ImportExport_Tat_000_M",
    OverlayFemale: "MP_MP_ImportExport_Tat_000_F",
    Zone: 0,
    Name: "Block Back",
    Price: "7500"
  },
  {
    Collection: "mpimportexport_overlays",
    OverlayMale: "MP_MP_ImportExport_Tat_001_M",
    OverlayFemale: "MP_MP_ImportExport_Tat_001_F",
    Zone: 0,
    Name: "Power Plant",
    Price: "7500"
  },
  {
    Collection: "mpimportexport_overlays",
    OverlayMale: "MP_MP_ImportExport_Tat_002_M",
    OverlayFemale: "MP_MP_ImportExport_Tat_002_F",
    Zone: 0,
    Name: "Tuned to Death",
    Price: "7500"
  },
  {
    Collection: "mpimportexport_overlays",
    OverlayMale: "MP_MP_ImportExport_Tat_009_M",
    OverlayFemale: "MP_MP_ImportExport_Tat_009_F",
    Zone: 0,
    Name: "Serpents of Destruction",
    Price: "7500"
  },
  {
    Collection: "mpimportexport_overlays",
    OverlayMale: "MP_MP_ImportExport_Tat_010_M",
    OverlayFemale: "MP_MP_ImportExport_Tat_010_F",
    Zone: 0,
    Name: "Take the Wheel",
    Price: "7500"
  },
  {
    Collection: "mpimportexport_overlays",
    OverlayMale: "MP_MP_ImportExport_Tat_011_M",
    OverlayFemale: "MP_MP_ImportExport_Tat_011_F",
    Zone: 0,
    Name: "Talk Shit Get Hit",
    Price: "7500"
  },
  {
    Collection: "mplowrider_overlays",
    OverlayMale: "MP_LR_Tat_001_M",
    OverlayFemale: "MP_LR_Tat_001_F",
    Zone: 0,
    Name: "King Fight",
    Price: "7500"
  },
  {
    Collection: "mplowrider_overlays",
    OverlayMale: "MP_LR_Tat_002_M",
    OverlayFemale: "MP_LR_Tat_002_F",
    Zone: 0,
    Name: "Holy Mary",
    Price: "7500"
  },
  {
    Collection: "mplowrider_overlays",
    OverlayMale: "MP_LR_Tat_004_M",
    OverlayFemale: "MP_LR_Tat_004_F",
    Zone: 0,
    Name: "Gun Mic",
    Price: "7500"
  },
  {
    Collection: "mplowrider_overlays",
    OverlayMale: "MP_LR_Tat_009_M",
    OverlayFemale: "MP_LR_Tat_009_F",
    Zone: 0,
    Name: "Amazon",
    Price: "7500"
  },
  {
    Collection: "mplowrider_overlays",
    OverlayMale: "MP_LR_Tat_010_M",
    OverlayFemale: "MP_LR_Tat_010_F",
    Zone: 0,
    Name: "Bad Angel",
    Price: "7500"
  },
  {
    Collection: "mplowrider_overlays",
    OverlayMale: "MP_LR_Tat_013_M",
    OverlayFemale: "MP_LR_Tat_013_F",
    Zone: 0,
    Name: "Love Gamble",
    Price: "7500"
  },
  {
    Collection: "mplowrider_overlays",
    OverlayMale: "MP_LR_Tat_014_M",
    OverlayFemale: "MP_LR_Tat_014_F",
    Zone: 0,
    Name: "Love is Blind",
    Price: "7500"
  },
  {
    Collection: "mplowrider_overlays",
    OverlayMale: "MP_LR_Tat_021_M",
    OverlayFemale: "MP_LR_Tat_021_F",
    Zone: 0,
    Name: "Sad Angel",
    Price: "7500"
  },
  {
    Collection: "mplowrider_overlays",
    OverlayMale: "MP_LR_Tat_026_M",
    OverlayFemale: "MP_LR_Tat_026_F",
    Zone: 0,
    Name: "Royal Takeover",
    Price: "7500"
  },
  {
    Collection: "mpairraces_overlays",
    OverlayMale: "MP_Airraces_Tattoo_000_M",
    OverlayFemale: "MP_Airraces_Tattoo_000_F",
    Zone: 0,
    Name: "Turbulence",
    Price: "7500"
  },
  {
    Collection: "mpairraces_overlays",
    OverlayMale: "MP_Airraces_Tattoo_001_M",
    OverlayFemale: "MP_Airraces_Tattoo_001_F",
    Zone: 0,
    Name: "Pilot Skull",
    Price: "7500"
  },
  {
    Collection: "mpairraces_overlays",
    OverlayMale: "MP_Airraces_Tattoo_002_M",
    OverlayFemale: "MP_Airraces_Tattoo_002_F",
    Zone: 0,
    Name: "Winged Bombshell",
    Price: "7500"
  },
  {
    Collection: "mpairraces_overlays",
    OverlayMale: "MP_Airraces_Tattoo_004_M",
    OverlayFemale: "MP_Airraces_Tattoo_004_F",
    Zone: 0,
    Name: "Balloon Pioneer",
    Price: "7500"
  },
  {
    Collection: "mpairraces_overlays",
    OverlayMale: "MP_Airraces_Tattoo_005_M",
    OverlayFemale: "MP_Airraces_Tattoo_005_F",
    Zone: 0,
    Name: "Parachute Belle",
    Price: "7500"
  },
  {
    Collection: "mpairraces_overlays",
    OverlayMale: "MP_Airraces_Tattoo_006_M",
    OverlayFemale: "MP_Airraces_Tattoo_006_F",
    Zone: 0,
    Name: "Bombs Away",
    Price: "7500"
  },
  {
    Collection: "mpairraces_overlays",
    OverlayMale: "MP_Airraces_Tattoo_007_M",
    OverlayFemale: "MP_Airraces_Tattoo_007_F",
    Zone: 0,
    Name: "Eagle Eyes",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_000_M",
    OverlayFemale: "MP_MP_Biker_Tat_000_F",
    Zone: 0,
    Name: "Demon Rider",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_001_M",
    OverlayFemale: "MP_MP_Biker_Tat_001_F",
    Zone: 0,
    Name: "Both Barrels",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_003_M",
    OverlayFemale: "MP_MP_Biker_Tat_003_F",
    Zone: 0,
    Name: "Web Rider",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_005_M",
    OverlayFemale: "MP_MP_Biker_Tat_005_F",
    Zone: 0,
    Name: "Made In America",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_006_M",
    OverlayFemale: "MP_MP_Biker_Tat_006_F",
    Zone: 0,
    Name: "Chopper Freedom",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_008_M",
    OverlayFemale: "MP_MP_Biker_Tat_008_F",
    Zone: 0,
    Name: "Freedom Wheels",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_010_M",
    OverlayFemale: "MP_MP_Biker_Tat_010_F",
    Zone: 0,
    Name: "Skull Of Taurus",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_011_M",
    OverlayFemale: "MP_MP_Biker_Tat_011_F",
    Zone: 0,
    Name: "R.I.P. My Brothers",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_013_M",
    OverlayFemale: "MP_MP_Biker_Tat_013_F",
    Zone: 0,
    Name: "Demon Crossbones",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_017_M",
    OverlayFemale: "MP_MP_Biker_Tat_017_F",
    Zone: 0,
    Name: "Clawed Beast",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_018_M",
    OverlayFemale: "MP_MP_Biker_Tat_018_F",
    Zone: 0,
    Name: "Skeletal Chopper",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_019_M",
    OverlayFemale: "MP_MP_Biker_Tat_019_F",
    Zone: 0,
    Name: "Gruesome Talons",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_021_M",
    OverlayFemale: "MP_MP_Biker_Tat_021_F",
    Zone: 0,
    Name: "Flaming Reaper",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_023_M",
    OverlayFemale: "MP_MP_Biker_Tat_023_F",
    Zone: 0,
    Name: "Western MC",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_026_M",
    OverlayFemale: "MP_MP_Biker_Tat_026_F",
    Zone: 0,
    Name: "American Dream",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_029_M",
    OverlayFemale: "MP_MP_Biker_Tat_029_F",
    Zone: 0,
    Name: "Bone Wrench",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_030_M",
    OverlayFemale: "MP_MP_Biker_Tat_030_F",
    Zone: 0,
    Name: "Brothers For Life",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_031_M",
    OverlayFemale: "MP_MP_Biker_Tat_031_F",
    Zone: 0,
    Name: "Gear Head",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_032_M",
    OverlayFemale: "MP_MP_Biker_Tat_032_F",
    Zone: 0,
    Name: "Western Eagle",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_034_M",
    OverlayFemale: "MP_MP_Biker_Tat_034_F",
    Zone: 0,
    Name: "Brotherhood of Bikes",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_039_M",
    OverlayFemale: "MP_MP_Biker_Tat_039_F",
    Zone: 0,
    Name: "Gas Guzzler",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_041_M",
    OverlayFemale: "MP_MP_Biker_Tat_041_F",
    Zone: 0,
    Name: "No Regrets",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_043_M",
    OverlayFemale: "MP_MP_Biker_Tat_043_F",
    Zone: 0,
    Name: "Ride Forever",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_050_M",
    OverlayFemale: "MP_MP_Biker_Tat_050_F",
    Zone: 0,
    Name: "Unforgiven",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_052_M",
    OverlayFemale: "MP_MP_Biker_Tat_052_F",
    Zone: 0,
    Name: "Biker Mount",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_058_M",
    OverlayFemale: "MP_MP_Biker_Tat_058_F",
    Zone: 0,
    Name: "Reaper Vulture",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_059_M",
    OverlayFemale: "MP_MP_Biker_Tat_059_F",
    Zone: 0,
    Name: "Faggio",
    Price: "7500"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_060_M",
    OverlayFemale: "MP_MP_Biker_Tat_060_F",
    Zone: 0,
    Name: "We Are The Mods!",
    Price: "7500"
  },
  {
    Collection: "mplowrider2_overlays",
    OverlayMale: "MP_LR_Tat_000_M",
    OverlayFemale: "MP_LR_Tat_000_F",
    Zone: 0,
    Name: "SA Assault",
    Price: "7500"
  },
  {
    Collection: "mplowrider2_overlays",
    OverlayMale: "MP_LR_Tat_008_M",
    OverlayFemale: "MP_LR_Tat_008_F",
    Zone: 0,
    Name: "Love the Game",
    Price: "7500"
  },
  {
    Collection: "mplowrider2_overlays",
    OverlayMale: "MP_LR_Tat_011_M",
    OverlayFemale: "MP_LR_Tat_011_F",
    Zone: 0,
    Name: "Lady Liberty",
    Price: "7500"
  },
  {
    Collection: "mplowrider2_overlays",
    OverlayMale: "MP_LR_Tat_012_M",
    OverlayFemale: "MP_LR_Tat_012_F",
    Zone: 0,
    Name: "Royal Kiss",
    Price: "7500"
  },
  {
    Collection: "mplowrider2_overlays",
    OverlayMale: "MP_LR_Tat_016_M",
    OverlayFemale: "MP_LR_Tat_016_F",
    Zone: 0,
    Name: "Two Face",
    Price: "7500"
  },
  {
    Collection: "mplowrider2_overlays",
    OverlayMale: "MP_LR_Tat_019_M",
    OverlayFemale: "MP_LR_Tat_019_F",
    Zone: 0,
    Name: "Death Behind",
    Price: "7500"
  },
  {
    Collection: "mplowrider2_overlays",
    OverlayMale: "MP_LR_Tat_031_M",
    OverlayFemale: "MP_LR_Tat_031_F",
    Zone: 0,
    Name: "Dead Pretty",
    Price: "7500"
  },
  {
    Collection: "mplowrider2_overlays",
    OverlayMale: "MP_LR_Tat_032_M",
    OverlayFemale: "MP_LR_Tat_032_F",
    Zone: 0,
    Name: "Reign Over",
    Price: "7500"
  },
  {
    Collection: "mpluxe_overlays",
    OverlayMale: "MP_LUXE_TAT_003_M",
    OverlayFemale: "MP_LUXE_TAT_003_F",
    Zone: 0,
    Name: "Abstract Skull",
    Price: "7500"
  },
  {
    Collection: "mpluxe_overlays",
    OverlayMale: "MP_LUXE_TAT_007_M",
    OverlayFemale: "MP_LUXE_TAT_007_F",
    Zone: 0,
    Name: "Eye of the Griffin",
    Price: "7500"
  },
  {
    Collection: "mpluxe_overlays",
    OverlayMale: "MP_LUXE_TAT_008_M",
    OverlayFemale: "MP_LUXE_TAT_008_F",
    Zone: 0,
    Name: "Flying Eye",
    Price: "7500"
  },
  {
    Collection: "mpluxe_overlays",
    OverlayMale: "MP_LUXE_TAT_014_M",
    OverlayFemale: "MP_LUXE_TAT_014_F",
    Zone: 0,
    Name: "Ancient Queen",
    Price: "7500"
  },
  {
    Collection: "mpluxe_overlays",
    OverlayMale: "MP_LUXE_TAT_015_M",
    OverlayFemale: "MP_LUXE_TAT_015_F",
    Zone: 0,
    Name: "Smoking Sisters",
    Price: "7500"
  },
  {
    Collection: "mpluxe_overlays",
    OverlayMale: "MP_LUXE_TAT_024_M",
    OverlayFemale: "MP_LUXE_TAT_024_F",
    Zone: 0,
    Name: "Feather Mural",
    Price: "7500"
  },
  {
    Collection: "mpluxe2_overlays",
    OverlayMale: "MP_LUXE_TAT_002_M",
    OverlayFemale: "MP_LUXE_TAT_002_F",
    Zone: 0,
    Name: "The Howler",
    Price: "7500"
  },
  {
    Collection: "mpluxe2_overlays",
    OverlayMale: "MP_LUXE_TAT_012_M",
    OverlayFemale: "MP_LUXE_TAT_012_F",
    Zone: 0,
    Name: "Geometric Galaxy",
    Price: "7500"
  },
  {
    Collection: "mpluxe2_overlays",
    OverlayMale: "MP_LUXE_TAT_022_M",
    OverlayFemale: "MP_LUXE_TAT_022_F",
    Zone: 0,
    Name: "Cloaked Angel",
    Price: "7500"
  },
  {
    Collection: "mpluxe2_overlays",
    OverlayMale: "MP_LUXE_TAT_025_M",
    OverlayFemale: "MP_LUXE_TAT_025_F",
    Zone: 0,
    Name: "Reaper Sway",
    Price: "7500"
  },
  {
    Collection: "mpluxe2_overlays",
    OverlayMale: "MP_LUXE_TAT_027_M",
    OverlayFemale: "MP_LUXE_TAT_027_F",
    Zone: 0,
    Name: "Cobra Dawn",
    Price: "7500"
  },
  {
    Collection: "mpluxe2_overlays",
    OverlayMale: "MP_LUXE_TAT_029_M",
    OverlayFemale: "MP_LUXE_TAT_029_F",
    Zone: 0,
    Name: "Geometric Design T",
    Price: "7500"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_000_M",
    OverlayFemale: "MP_Smuggler_Tattoo_000_F",
    Zone: 0,
    Name: "Bless The Dead",
    Price: "7500"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_002_M",
    OverlayFemale: "MP_Smuggler_Tattoo_002_F",
    Zone: 0,
    Name: "Dead Lies",
    Price: "7500"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_003_M",
    OverlayFemale: "MP_Smuggler_Tattoo_003_F",
    Zone: 0,
    Name: "Give Nothing Back",
    Price: "7500"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_006_M",
    OverlayFemale: "MP_Smuggler_Tattoo_006_F",
    Zone: 0,
    Name: "Never Surrender",
    Price: "7500"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_007_M",
    OverlayFemale: "MP_Smuggler_Tattoo_007_F",
    Zone: 0,
    Name: "No Honor",
    Price: "7500"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_009_M",
    OverlayFemale: "MP_Smuggler_Tattoo_009_F",
    Zone: 0,
    Name: "Tall Ship Conflict",
    Price: "7500"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_010_M",
    OverlayFemale: "MP_Smuggler_Tattoo_010_F",
    Zone: 0,
    Name: "See You In Hell",
    Price: "7500"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_013_M",
    OverlayFemale: "MP_Smuggler_Tattoo_013_F",
    Zone: 0,
    Name: "Torn Wings",
    Price: "7500"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_015_M",
    OverlayFemale: "MP_Smuggler_Tattoo_015_F",
    Zone: 0,
    Name: "Jolly Roger",
    Price: "7500"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_016_M",
    OverlayFemale: "MP_Smuggler_Tattoo_016_F",
    Zone: 0,
    Name: "Skull Compass",
    Price: "7500"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_017_M",
    OverlayFemale: "MP_Smuggler_Tattoo_017_F",
    Zone: 0,
    Name: "Framed Tall Ship",
    Price: "7500"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_018_M",
    OverlayFemale: "MP_Smuggler_Tattoo_018_F",
    Zone: 0,
    Name: "Finders Keepers",
    Price: "7500"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_019_M",
    OverlayFemale: "MP_Smuggler_Tattoo_019_F",
    Zone: 0,
    Name: "Lost At Sea",
    Price: "7500"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_021_M",
    OverlayFemale: "MP_Smuggler_Tattoo_021_F",
    Zone: 0,
    Name: "Dead Tales",
    Price: "7500"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_022_M",
    OverlayFemale: "MP_Smuggler_Tattoo_022_F",
    Zone: 0,
    Name: "X Marks The Spot",
    Price: "7500"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_024_M",
    OverlayFemale: "MP_Smuggler_Tattoo_024_F",
    Zone: 0,
    Name: "Pirate Captain",
    Price: "7500"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_025_M",
    OverlayFemale: "MP_Smuggler_Tattoo_025_F",
    Zone: 0,
    Name: "Claimed By The Beast",
    Price: "7500"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_011_M",
    OverlayFemale: "MP_MP_Stunt_Tat_011_F",
    Zone: 0,
    Name: "Wheels of Death",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_012_M",
    OverlayFemale: "MP_MP_Stunt_Tat_012_F",
    Zone: 0,
    Name: "Punk Biker",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_014_M",
    OverlayFemale: "MP_MP_Stunt_Tat_014_F",
    Zone: 0,
    Name: "Bat Cat of Spades",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_018_M",
    OverlayFemale: "MP_MP_Stunt_Tat_018_F",
    Zone: 0,
    Name: "Vintage Bully",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_019_M",
    OverlayFemale: "MP_MP_Stunt_Tat_019_F",
    Zone: 0,
    Name: "Engine Heart",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_024_M",
    OverlayFemale: "MP_MP_Stunt_Tat_024_F",
    Zone: 0,
    Name: "Road Kill",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_026_M",
    OverlayFemale: "MP_MP_Stunt_Tat_026_F",
    Zone: 0,
    Name: "Winged Wheel",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_027_M",
    OverlayFemale: "MP_MP_Stunt_Tat_027_F",
    Zone: 0,
    Name: "Punk Road Hog",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_029_M",
    OverlayFemale: "MP_MP_Stunt_Tat_029_F",
    Zone: 0,
    Name: "Majestic Finish",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_030_M",
    OverlayFemale: "MP_MP_Stunt_Tat_030_F",
    Zone: 0,
    Name: "Man's Ruin",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_033_M",
    OverlayFemale: "MP_MP_Stunt_Tat_033_F",
    Zone: 0,
    Name: "Sugar Skull Trucker",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_034_M",
    OverlayFemale: "MP_MP_Stunt_Tat_034_F",
    Zone: 0,
    Name: "Feather Road Kill",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_037_M",
    OverlayFemale: "MP_MP_Stunt_Tat_037_F",
    Zone: 0,
    Name: "Big Grills",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_040_M",
    OverlayFemale: "MP_MP_Stunt_Tat_040_F",
    Zone: 0,
    Name: "Monkey Chopper",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_041_M",
    OverlayFemale: "MP_MP_Stunt_Tat_041_F",
    Zone: 0,
    Name: "Brapp",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_044_M",
    OverlayFemale: "MP_MP_Stunt_Tat_044_F",
    Zone: 0,
    Name: "Ram Skull",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_046_M",
    OverlayFemale: "MP_MP_Stunt_Tat_046_F",
    Zone: 0,
    Name: "Full Throttle",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_048_M",
    OverlayFemale: "MP_MP_Stunt_Tat_048_F",
    Zone: 0,
    Name: "Racing Doll",
    Price: "5000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_Award_M_003",
    OverlayFemale: "FM_Tat_Award_F_003",
    Zone: 0,
    Name: "Blackjack",
    Price: "5000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_Award_M_004",
    OverlayFemale: "FM_Tat_Award_F_004",
    Zone: 0,
    Name: "Hustler",
    Price: "5000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_Award_M_005",
    OverlayFemale: "FM_Tat_Award_F_005",
    Zone: 0,
    Name: "Angel",
    Price: "5000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_Award_M_008",
    OverlayFemale: "FM_Tat_Award_F_008",
    Zone: 0,
    Name: "Los Santos Customs",
    Price: "5000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_Award_M_011",
    OverlayFemale: "FM_Tat_Award_F_011",
    Zone: 0,
    Name: "Blank Scroll",
    Price: "5000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_Award_M_012",
    OverlayFemale: "FM_Tat_Award_F_012",
    Zone: 0,
    Name: "Embellished Scroll",
    Price: "5000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_Award_M_013",
    OverlayFemale: "FM_Tat_Award_F_013",
    Zone: 0,
    Name: "Seven Deadly Sins",
    Price: "5000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_Award_M_014",
    OverlayFemale: "FM_Tat_Award_F_014",
    Zone: 0,
    Name: "Trust No One",
    Price: "5000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_Award_M_016",
    OverlayFemale: "FM_Tat_Award_F_016",
    Zone: 0,
    Name: "Clown",
    Price: "5000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_Award_M_017",
    OverlayFemale: "FM_Tat_Award_F_017",
    Zone: 0,
    Name: "Clown and Gun",
    Price: "5000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_Award_M_018",
    OverlayFemale: "FM_Tat_Award_F_018",
    Zone: 0,
    Name: "Clown Dual Wield",
    Price: "5000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_Award_M_019",
    OverlayFemale: "FM_Tat_Award_F_019",
    Zone: 0,
    Name: "Clown Dual Wield Dollars",
    Price: "5000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_004",
    OverlayFemale: "FM_Tat_F_004",
    Zone: 0,
    Name: "Faith T",
    Price: "5000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_009",
    OverlayFemale: "FM_Tat_F_009",
    Zone: 0,
    Name: "Skull on the Cross",
    Price: "5000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_010",
    OverlayFemale: "FM_Tat_F_010",
    Zone: 0,
    Name: "LS Flames",
    Price: "5000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_011",
    OverlayFemale: "FM_Tat_F_011",
    Zone: 0,
    Name: "LS Script",
    Price: "5000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_012",
    OverlayFemale: "FM_Tat_F_012",
    Zone: 0,
    Name: "Los Santos Bills",
    Price: "5000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_013",
    OverlayFemale: "FM_Tat_F_013",
    Zone: 0,
    Name: "Eagle and Serpent",
    Price: "5000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_016",
    OverlayFemale: "FM_Tat_F_016",
    Zone: 0,
    Name: "Evil Clown",
    Price: "12500"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_019",
    OverlayFemale: "FM_Tat_F_019",
    Zone: 0,
    Name: "The Wages of Sin",
    Price: "12500"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_020",
    OverlayFemale: "FM_Tat_F_020",
    Zone: 0,
    Name: "Dragon T",
    Price: "12500"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_024",
    OverlayFemale: "FM_Tat_F_024",
    Zone: 0,
    Name: "Flaming Cross",
    Price: "12500"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_025",
    OverlayFemale: "FM_Tat_F_025",
    Zone: 0,
    Name: "LS Bold",
    Price: "12500"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_029",
    OverlayFemale: "FM_Tat_F_029",
    Zone: 0,
    Name: "Trinity Knot",
    Price: "12500"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_030",
    OverlayFemale: "FM_Tat_F_030",
    Zone: 0,
    Name: "Lucky Celtic Dogs",
    Price: "12500"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_034",
    OverlayFemale: "FM_Tat_F_034",
    Zone: 0,
    Name: "Flaming Shamrock",
    Price: "12500"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_036",
    OverlayFemale: "FM_Tat_F_036",
    Zone: 0,
    Name: "Way of the Gun",
    Price: "12500"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_044",
    OverlayFemale: "FM_Tat_F_044",
    Zone: 0,
    Name: "Stone Cross",
    Price: "12500"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_045",
    OverlayFemale: "FM_Tat_F_045",
    Zone: 0,
    Name: "Skulls and Rose",
    Price: "12500"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_160_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_160_F",
    Zone: 0,
    Name: "Ink Cross",
    Price: "150000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_103_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_103_F",
    Zone: 0,
    Name: "Blackwork Shade Torso",
    Price: "150000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_104_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_104_F",
    Zone: 0,
    Name: "Blackwork Comb Torso",
    Price: "150000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_105_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_105_f",
    Zone: 0,
    Name: "Blackwork Ink Torso",
    Price: "150000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_035_M",
    OverlayFemale: "",
    Zone: 1,
    Name: "Leo Skin 1",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_036_M",
    OverlayFemale: "",
    Zone: 1,
    Name: "Leo Skin 2",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_038_M",
    OverlayFemale: "",
    Zone: 1,
    Name: "Dragon Lore",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_039_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_039_F",
    Zone: 1,
    Name: "Feather of the Phoenix",
    Price: "15000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_000_M",
    OverlayFemale: "mpHeist3_Tat_000_F",
    Zone: 1,
    Name: "Five Stars",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_001_M",
    OverlayFemale: "mpHeist3_Tat_001_F",
    Zone: 1,
    Name: "Ace of Spades",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_002_M",
    OverlayFemale: "mpHeist3_Tat_002_F",
    Zone: 1,
    Name: "Animal",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_003_M",
    OverlayFemale: "mpHeist3_Tat_003_F",
    Zone: 1,
    Name: "Assault Rifle",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_004_M",
    OverlayFemale: "mpHeist3_Tat_004_F",
    Zone: 1,
    Name: "Bandage",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_005_M",
    OverlayFemale: "mpHeist3_Tat_005_F",
    Zone: 1,
    Name: "Spades",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_006_M",
    OverlayFemale: "mpHeist3_Tat_006_F",
    Zone: 1,
    Name: "Crowned",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_007_M",
    OverlayFemale: "mpHeist3_Tat_007_F",
    Zone: 1,
    Name: "Two Horns",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_008_M",
    OverlayFemale: "mpHeist3_Tat_008_F",
    Zone: 1,
    Name: "Ice Cream",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_009_M",
    OverlayFemale: "mpHeist3_Tat_009_F",
    Zone: 1,
    Name: "Knifed",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_010_M",
    OverlayFemale: "mpHeist3_Tat_010_F",
    Zone: 1,
    Name: "Green Leaf",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_011_M",
    OverlayFemale: "mpHeist3_Tat_011_F",
    Zone: 1,
    Name: "Lipstick Kiss",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_012_M",
    OverlayFemale: "mpHeist3_Tat_012_F",
    Zone: 1,
    Name: "Razor Pop",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_013_M",
    OverlayFemale: "mpHeist3_Tat_013_F",
    Zone: 1,
    Name: "LS Star",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_014_M",
    OverlayFemale: "mpHeist3_Tat_014_F",
    Zone: 1,
    Name: "LS Wings",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_015_M",
    OverlayFemale: "mpHeist3_Tat_015_F",
    Zone: 1,
    Name: "On/Off",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_016_M",
    OverlayFemale: "mpHeist3_Tat_016_F",
    Zone: 1,
    Name: "Sleepy",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_017_M",
    OverlayFemale: "mpHeist3_Tat_017_F",
    Zone: 1,
    Name: "Space Monkey",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_018_M",
    OverlayFemale: "mpHeist3_Tat_018_F",
    Zone: 1,
    Name: "Stitches",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_019_M",
    OverlayFemale: "mpHeist3_Tat_019_F",
    Zone: 1,
    Name: "Teddy Bear",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_020_M",
    OverlayFemale: "mpHeist3_Tat_020_F",
    Zone: 1,
    Name: "UFO",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_021_M",
    OverlayFemale: "mpHeist3_Tat_021_F",
    Zone: 1,
    Name: "Wanted",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_022_M",
    OverlayFemale: "mpHeist3_Tat_022_F",
    Zone: 1,
    Name: "Thog's Sword",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_042_M",
    OverlayFemale: "mpHeist3_Tat_042_F",
    Zone: 1,
    Name: "Hearts",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_043_M",
    OverlayFemale: "mpHeist3_Tat_043_F",
    Zone: 1,
    Name: "Diamonds",
    Price: "5000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_044_M",
    OverlayFemale: "mpHeist3_Tat_044_F",
    Zone: 1,
    Name: "Clubs",
    Price: "5000"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "MP_Buis_M_Neck_000",
    OverlayFemale: "",
    Zone: 1,
    Name: "Cash is King",
    Price: "10000"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "MP_Buis_M_Neck_001",
    OverlayFemale: "",
    Zone: 1,
    Name: "Bold Dollar Sign",
    Price: "10000"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "MP_Buis_M_Neck_002",
    OverlayFemale: "",
    Zone: 1,
    Name: "Script Dollar Sign",
    Price: "10000"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "MP_Buis_M_Neck_003",
    OverlayFemale: "",
    Zone: 1,
    Name: "$100",
    Price: "10000"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "",
    OverlayFemale: "MP_Buis_F_Neck_000",
    Zone: 1,
    Name: "Val-de-Grace Logo",
    Price: "10000"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "",
    OverlayFemale: "MP_Buis_F_Neck_001",
    Zone: 1,
    Name: "Money Rose",
    Price: "10000"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_007",
    OverlayFemale: "MP_Xmas2_F_Tat_007",
    Zone: 1,
    Name: "Los Muertos",
    Price: "10000"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_024",
    OverlayFemale: "MP_Xmas2_F_Tat_024",
    Zone: 1,
    Name: "Snake Head Outline",
    Price: "10000"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_025",
    OverlayFemale: "MP_Xmas2_F_Tat_025",
    Zone: 1,
    Name: "Snake Head Color",
    Price: "10000"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_029",
    OverlayFemale: "MP_Xmas2_F_Tat_029",
    Zone: 1,
    Name: "Beautiful Death",
    Price: "10000"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_003_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_003_F",
    Zone: 1,
    Name: "Lock & Load",
    Price: "10000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_005",
    OverlayFemale: "FM_Hip_F_Tat_005",
    Zone: 1,
    Name: "Beautiful Eye",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_021",
    OverlayFemale: "FM_Hip_F_Tat_021",
    Zone: 1,
    Name: "Geo Fox",
    Price: "5000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_009_M",
    OverlayFemale: "MP_MP_Biker_Tat_009_F",
    Zone: 1,
    Name: "Morbid Arachnid",
    Price: "5000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_038_M",
    OverlayFemale: "MP_MP_Biker_Tat_038_F",
    Zone: 1,
    Name: "FTW",
    Price: "5000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_051_M",
    OverlayFemale: "MP_MP_Biker_Tat_051_F",
    Zone: 1,
    Name: "Western Stylized",
    Price: "5000"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_011_M",
    OverlayFemale: "MP_Smuggler_Tattoo_011_F",
    Zone: 1,
    Name: "Sinner",
    Price: "5000"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_012_M",
    OverlayFemale: "MP_Smuggler_Tattoo_012_F",
    Zone: 1,
    Name: "Thief",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_000_M",
    OverlayFemale: "MP_MP_Stunt_Tat_000_F",
    Zone: 1,
    Name: "Stunt Skull",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_004_M",
    OverlayFemale: "MP_MP_Stunt_Tat_004_F",
    Zone: 1,
    Name: "Scorpion",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_006_M",
    OverlayFemale: "MP_MP_Stunt_Tat_006_F",
    Zone: 1,
    Name: "Toxic Spider",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_017_M",
    OverlayFemale: "MP_MP_Stunt_Tat_017_F",
    Zone: 1,
    Name: "Bat Wheel",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_042_M",
    OverlayFemale: "MP_MP_Stunt_Tat_042_F",
    Zone: 1,
    Name: "Flaming Quad",
    Price: "5000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_108_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_108_F",
    Zone: 1,
    Name: "Blackwork Shade Neck",
    Price: "75000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_109_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_109_F",
    Zone: 1,
    Name: "Blackwork Shade Chin",
    Price: "75000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_118_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_118_F",
    Zone: 1,
    Name: "Blackwork Full Neck",
    Price: "75000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_002_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_002_F",
    Zone: 2,
    Name: "Deamon",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_034_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_034_F",
    Zone: 2,
    Name: "Sea Horse",
    Price: "15000"
  },
  {
    Collection: "hstattoos_overlays",
    OverlayMale: "MP_Hstattoos_Tattoo_052_M",
    OverlayFemale: "MP_Hstattoos_Tattoo_052_F",
    Zone: 2,
    Name: "CUP4EVER",
    Price: "15000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_040_M",
    OverlayFemale: "mpHeist3_Tat_040_F",
    Zone: 2,
    Name: "Tiger Heart",
    Price: "10000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_041_M",
    OverlayFemale: "mpHeist3_Tat_041_F",
    Zone: 2,
    Name: "Mighty Thog",
    Price: "20000"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_002_M",
    OverlayFemale: "MP_Vinewood_Tat_002_F",
    Zone: 2,
    Name: "Suits",
    Price: "7500"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_005_M",
    OverlayFemale: "MP_Vinewood_Tat_005_F",
    Zone: 2,
    Name: "Get Lucky",
    Price: "7500"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_014_M",
    OverlayFemale: "MP_Vinewood_Tat_014_F",
    Zone: 2,
    Name: "Vice",
    Price: "7500"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_019_M",
    OverlayFemale: "MP_Vinewood_Tat_019_F",
    Zone: 2,
    Name: "Can't Win Them All",
    Price: "7500"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_026_M",
    OverlayFemale: "MP_Vinewood_Tat_026_F",
    Zone: 2,
    Name: "Banknote Rose",
    Price: "7500"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "MP_Buis_M_LeftArm_000",
    OverlayFemale: "",
    Zone: 2,
    Name: "$100 Bill",
    Price: "7500"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "MP_Buis_M_LeftArm_001",
    OverlayFemale: "",
    Zone: 2,
    Name: "All-Seeing Eye",
    Price: "7500"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "",
    OverlayFemale: "MP_Buis_F_LArm_000",
    Zone: 2,
    Name: "Greed is Good",
    Price: "7500"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_000",
    OverlayFemale: "MP_Xmas2_F_Tat_000",
    Zone: 2,
    Name: "Skull Rider",
    Price: "7500"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_010",
    OverlayFemale: "MP_Xmas2_F_Tat_010",
    Zone: 2,
    Name: "Electric Snake",
    Price: "7500"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_012",
    OverlayFemale: "MP_Xmas2_F_Tat_012",
    Zone: 2,
    Name: "8 Ball Skull",
    Price: "7500"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_020",
    OverlayFemale: "MP_Xmas2_F_Tat_020",
    Zone: 2,
    Name: "Time's Up Outline",
    Price: "7500"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_021",
    OverlayFemale: "MP_Xmas2_F_Tat_021",
    Zone: 2,
    Name: "Time's Up Color",
    Price: "7500"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_004_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_004_F",
    Zone: 2,
    Name: "Sidearm",
    Price: "7500"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_008_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_008_F",
    Zone: 2,
    Name: "Bandolier",
    Price: "7500"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_015_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_015_F",
    Zone: 2,
    Name: "Spiked Skull",
    Price: "7500"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_016_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_016_F",
    Zone: 2,
    Name: "Blood Money",
    Price: "7500"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_025_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_025_F",
    Zone: 2,
    Name: "Praying Skull",
    Price: "7500"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_027_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_027_F",
    Zone: 2,
    Name: "Serpent Revolver",
    Price: "7500"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_003",
    OverlayFemale: "FM_Hip_F_Tat_003",
    Zone: 2,
    Name: "Diamond Sparkle",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_007",
    OverlayFemale: "FM_Hip_F_Tat_007",
    Zone: 2,
    Name: "Bricks",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_015",
    OverlayFemale: "FM_Hip_F_Tat_015",
    Zone: 2,
    Name: "Mustache",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_016",
    OverlayFemale: "FM_Hip_F_Tat_016",
    Zone: 2,
    Name: "Lightning Bolt",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_026",
    OverlayFemale: "FM_Hip_F_Tat_026",
    Zone: 2,
    Name: "Pizza",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_027",
    OverlayFemale: "FM_Hip_F_Tat_027",
    Zone: 2,
    Name: "Padlock",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_028",
    OverlayFemale: "FM_Hip_F_Tat_028",
    Zone: 2,
    Name: "Thorny Rose",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_034",
    OverlayFemale: "FM_Hip_F_Tat_034",
    Zone: 2,
    Name: "Stop",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_037",
    OverlayFemale: "FM_Hip_F_Tat_037",
    Zone: 2,
    Name: "Sunrise",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_039",
    OverlayFemale: "FM_Hip_F_Tat_039",
    Zone: 2,
    Name: "Sleeve",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_043",
    OverlayFemale: "FM_Hip_F_Tat_043",
    Zone: 2,
    Name: "Triangle White",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_048",
    OverlayFemale: "FM_Hip_F_Tat_048",
    Zone: 2,
    Name: "Peace",
    Price: "5000"
  },
  {
    Collection: "mpimportexport_overlays",
    OverlayMale: "MP_MP_ImportExport_Tat_004_M",
    OverlayFemale: "MP_MP_ImportExport_Tat_004_F",
    Zone: 2,
    Name: "Piston Sleeve",
    Price: "5000"
  },
  {
    Collection: "mpimportexport_overlays",
    OverlayMale: "MP_MP_ImportExport_Tat_008_M",
    OverlayFemale: "MP_MP_ImportExport_Tat_008_F",
    Zone: 2,
    Name: "Scarlett",
    Price: "5000"
  },
  {
    Collection: "mplowrider_overlays",
    OverlayMale: "MP_LR_Tat_005_M",
    OverlayFemale: "MP_LR_Tat_005_F",
    Zone: 2,
    Name: "No Evil",
    Price: "5000"
  },
  {
    Collection: "mplowrider_overlays",
    OverlayMale: "MP_LR_Tat_027_M",
    OverlayFemale: "MP_LR_Tat_027_F",
    Zone: 2,
    Name: "Los Santos Life",
    Price: "5000"
  },
  {
    Collection: "mplowrider_overlays",
    OverlayMale: "MP_LR_Tat_033_M",
    OverlayFemale: "MP_LR_Tat_033_F",
    Zone: 2,
    Name: "City Sorrow",
    Price: "5000"
  },
  {
    Collection: "mpairraces_overlays",
    OverlayMale: "MP_Airraces_Tattoo_003_M",
    OverlayFemale: "MP_Airraces_Tattoo_003_F",
    Zone: 2,
    Name: "Toxic Trails",
    Price: "5000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_012_M",
    OverlayFemale: "MP_MP_Biker_Tat_012_F",
    Zone: 2,
    Name: "Urban Stunter",
    Price: "10000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_016_M",
    OverlayFemale: "MP_MP_Biker_Tat_016_F",
    Zone: 2,
    Name: "Macabre Tree",
    Price: "10000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_020_M",
    OverlayFemale: "MP_MP_Biker_Tat_020_F",
    Zone: 2,
    Name: "Cranial Rose",
    Price: "10000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_024_M",
    OverlayFemale: "MP_MP_Biker_Tat_024_F",
    Zone: 2,
    Name: "Live to Ride",
    Price: "10000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_025_M",
    OverlayFemale: "MP_MP_Biker_Tat_025_F",
    Zone: 2,
    Name: "Good Luck",
    Price: "10000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_035_M",
    OverlayFemale: "MP_MP_Biker_Tat_035_F",
    Zone: 2,
    Name: "Chain Fist",
    Price: "10000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_045_M",
    OverlayFemale: "MP_MP_Biker_Tat_045_F",
    Zone: 2,
    Name: "Ride Hard Die Fast",
    Price: "10000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_053_M",
    OverlayFemale: "MP_MP_Biker_Tat_053_F",
    Zone: 2,
    Name: "Muffler Helmet",
    Price: "10000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_055_M",
    OverlayFemale: "MP_MP_Biker_Tat_055_F",
    Zone: 2,
    Name: "Poison Scorpion",
    Price: "10000"
  },
  {
    Collection: "mplowrider2_overlays",
    OverlayMale: "MP_LR_Tat_006_M",
    OverlayFemale: "MP_LR_Tat_006_F",
    Zone: 2,
    Name: "Love Hustle",
    Price: "10000"
  },
  {
    Collection: "mplowrider2_overlays",
    OverlayMale: "MP_LR_Tat_018_M",
    OverlayFemale: "MP_LR_Tat_018_F",
    Zone: 2,
    Name: "Skeleton Party",
    Price: "10000"
  },
  {
    Collection: "mplowrider2_overlays",
    OverlayMale: "MP_LR_Tat_022_M",
    OverlayFemale: "MP_LR_Tat_022_F",
    Zone: 2,
    Name: "My Crazy Life",
    Price: "10000"
  },
  {
    Collection: "mpluxe_overlays",
    OverlayMale: "MP_LUXE_TAT_020_M",
    OverlayFemale: "MP_LUXE_TAT_020_F",
    Zone: 2,
    Name: "Archangel & Mary",
    Price: "10000"
  },
  {
    Collection: "mpluxe_overlays",
    OverlayMale: "MP_LUXE_TAT_021_M",
    OverlayFemale: "MP_LUXE_TAT_021_F",
    Zone: 2,
    Name: "Gabriel",
    Price: "10000"
  },
  {
    Collection: "mpluxe2_overlays",
    OverlayMale: "MP_LUXE_TAT_005_M",
    OverlayFemale: "MP_LUXE_TAT_005_F",
    Zone: 2,
    Name: "Fatal Dagger",
    Price: "10000"
  },
  {
    Collection: "mpluxe2_overlays",
    OverlayMale: "MP_LUXE_TAT_016_M",
    OverlayFemale: "MP_LUXE_TAT_016_F",
    Zone: 2,
    Name: "Egyptian Mural",
    Price: "10000"
  },
  {
    Collection: "mpluxe2_overlays",
    OverlayMale: "MP_LUXE_TAT_018_M",
    OverlayFemale: "MP_LUXE_TAT_018_F",
    Zone: 2,
    Name: "Divine Goddess",
    Price: "10000"
  },
  {
    Collection: "mpluxe2_overlays",
    OverlayMale: "MP_LUXE_TAT_028_M",
    OverlayFemale: "MP_LUXE_TAT_028_F",
    Zone: 2,
    Name: "Python Skull",
    Price: "10000"
  },
  {
    Collection: "mpluxe2_overlays",
    OverlayMale: "MP_LUXE_TAT_031_M",
    OverlayFemale: "MP_LUXE_TAT_031_F",
    Zone: 2,
    Name: "Geometric Design LA",
    Price: "10000"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_004_M",
    OverlayFemale: "MP_Smuggler_Tattoo_004_F",
    Zone: 2,
    Name: "Honor",
    Price: "10000"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_008_M",
    OverlayFemale: "MP_Smuggler_Tattoo_008_F",
    Zone: 2,
    Name: "Horrors Of The Deep",
    Price: "10000"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_014_M",
    OverlayFemale: "MP_Smuggler_Tattoo_014_F",
    Zone: 2,
    Name: "Mermaid's Curse",
    Price: "10000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_001_M",
    OverlayFemale: "MP_MP_Stunt_Tat_001_F",
    Zone: 2,
    Name: "8 Eyed Skull",
    Price: "10000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_002_M",
    OverlayFemale: "MP_MP_Stunt_Tat_002_F",
    Zone: 2,
    Name: "Big Cat",
    Price: "10000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_008_M",
    OverlayFemale: "MP_MP_Stunt_Tat_008_F",
    Zone: 2,
    Name: "Moonlight Ride",
    Price: "10000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_022_M",
    OverlayFemale: "MP_MP_Stunt_Tat_022_F",
    Zone: 2,
    Name: "Piston Head",
    Price: "10000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_023_M",
    OverlayFemale: "MP_MP_Stunt_Tat_023_F",
    Zone: 2,
    Name: "Tanked",
    Price: "10000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_035_M",
    OverlayFemale: "MP_MP_Stunt_Tat_035_F",
    Zone: 2,
    Name: "Stuntman's End",
    Price: "10000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_039_M",
    OverlayFemale: "MP_MP_Stunt_Tat_039_F",
    Zone: 2,
    Name: "Kaboom",
    Price: "10000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_043_M",
    OverlayFemale: "MP_MP_Stunt_Tat_043_F",
    Zone: 2,
    Name: "Engine Arm",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_Award_M_001",
    OverlayFemale: "FM_Tat_Award_F_001",
    Zone: 2,
    Name: "Burning Heart",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_Award_M_007",
    OverlayFemale: "FM_Tat_Award_F_007",
    Zone: 2,
    Name: "Racing Blonde",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_Award_M_015",
    OverlayFemale: "FM_Tat_Award_F_015",
    Zone: 2,
    Name: "Racing Brunette",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_005",
    OverlayFemale: "FM_Tat_F_005",
    Zone: 2,
    Name: "Serpents",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_006",
    OverlayFemale: "FM_Tat_F_006",
    Zone: 2,
    Name: "Oriental Mural",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_015",
    OverlayFemale: "FM_Tat_F_015",
    Zone: 2,
    Name: "Zodiac Skull",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_031",
    OverlayFemale: "FM_Tat_F_031",
    Zone: 2,
    Name: "Lady M",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_041",
    OverlayFemale: "FM_Tat_F_041",
    Zone: 2,
    Name: "Dope Skull",
    Price: "10000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_000_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_000_F",
    Zone: 2,
    Name: "Blackwork Lines LA",
    Price: "100000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_001_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_001_F",
    Zone: 2,
    Name: "Blackwork Shade LA",
    Price: "100000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_019_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_019_F",
    Zone: 2,
    Name: "Blackwork Shade Mid LA",
    Price: "100000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_121_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_121_F",
    Zone: 2,
    Name: "Blackwork Comb LA",
    Price: "100000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_122_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_122_F",
    Zone: 2,
    Name: "Blackwork Comb Forearm LA",
    Price: "100000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_034_M",
    OverlayFemale: "mpHeist3_Tat_034_F",
    Zone: 3,
    Name: "LS Monogram",
    Price: "10000"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_004_M",
    OverlayFemale: "MP_Vinewood_Tat_004_F",
    Zone: 3,
    Name: "Lady Luck",
    Price: "10000"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_018_M",
    OverlayFemale: "MP_Vinewood_Tat_018_F",
    Zone: 3,
    Name: "The Gambler's Life",
    Price: "10000"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_025_M",
    OverlayFemale: "MP_Vinewood_Tat_025_F",
    Zone: 3,
    Name: "Queen of Roses",
    Price: "10000"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_028_M",
    OverlayFemale: "MP_Vinewood_Tat_028_F",
    Zone: 3,
    Name: "Skull & Aces",
    Price: "10000"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "MP_Buis_M_RightArm_000",
    OverlayFemale: "",
    Zone: 3,
    Name: "Dollar Skull",
    Price: "5000"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "MP_Buis_M_RightArm_001",
    OverlayFemale: "",
    Zone: 3,
    Name: "Green",
    Price: "5000"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "",
    OverlayFemale: "MP_Buis_F_RArm_000",
    Zone: 3,
    Name: "Dollar Sign",
    Price: "5000"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_003",
    OverlayFemale: "MP_Xmas2_F_Tat_003",
    Zone: 3,
    Name: "Snake Outline",
    Price: "5000"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_004",
    OverlayFemale: "MP_Xmas2_F_Tat_004",
    Zone: 3,
    Name: "Snake Shaded",
    Price: "5000"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_008",
    OverlayFemale: "MP_Xmas2_F_Tat_008",
    Zone: 3,
    Name: "Death Before Dishonor",
    Price: "5000"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_022",
    OverlayFemale: "MP_Xmas2_F_Tat_022",
    Zone: 3,
    Name: "You're Next Outline",
    Price: "5000"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_023",
    OverlayFemale: "MP_Xmas2_F_Tat_023",
    Zone: 3,
    Name: "You're Next Color",
    Price: "5000"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_026",
    OverlayFemale: "MP_Xmas2_F_Tat_026",
    Zone: 3,
    Name: "Fuck Luck Outline",
    Price: "5000"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_027",
    OverlayFemale: "MP_Xmas2_F_Tat_027",
    Zone: 3,
    Name: "Fuck Luck Color",
    Price: "5000"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_002_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_002_F",
    Zone: 3,
    Name: "Grenade",
    Price: "5000"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_021_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_021_F",
    Zone: 3,
    Name: "Have a Nice Day",
    Price: "5000"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_024_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_024_F",
    Zone: 3,
    Name: "Combat Reaper",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_001",
    OverlayFemale: "FM_Hip_F_Tat_001",
    Zone: 3,
    Name: "Single Arrow",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_004",
    OverlayFemale: "FM_Hip_F_Tat_004",
    Zone: 3,
    Name: "Bone",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_008",
    OverlayFemale: "FM_Hip_F_Tat_008",
    Zone: 3,
    Name: "Cube",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_010",
    OverlayFemale: "FM_Hip_F_Tat_010",
    Zone: 3,
    Name: "Horseshoe",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_014",
    OverlayFemale: "FM_Hip_F_Tat_014",
    Zone: 3,
    Name: "Spray Can",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_017",
    OverlayFemale: "FM_Hip_F_Tat_017",
    Zone: 3,
    Name: "Eye Triangle",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_018",
    OverlayFemale: "FM_Hip_F_Tat_018",
    Zone: 3,
    Name: "Origami",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_020",
    OverlayFemale: "FM_Hip_F_Tat_020",
    Zone: 3,
    Name: "Geo Pattern",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_022",
    OverlayFemale: "FM_Hip_F_Tat_022",
    Zone: 3,
    Name: "Pencil",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_023",
    OverlayFemale: "FM_Hip_F_Tat_023",
    Zone: 3,
    Name: "Smiley",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_036",
    OverlayFemale: "FM_Hip_F_Tat_036",
    Zone: 3,
    Name: "Shapes",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_044",
    OverlayFemale: "FM_Hip_F_Tat_044",
    Zone: 3,
    Name: "Triangle Black",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_045",
    OverlayFemale: "FM_Hip_F_Tat_045",
    Zone: 3,
    Name: "Mesh Band",
    Price: "5000"
  },
  {
    Collection: "mpimportexport_overlays",
    OverlayMale: "MP_MP_ImportExport_Tat_003_M",
    OverlayFemale: "MP_MP_ImportExport_Tat_003_F",
    Zone: 3,
    Name: "Mechanical Sleeve",
    Price: "5000"
  },
  {
    Collection: "mpimportexport_overlays",
    OverlayMale: "MP_MP_ImportExport_Tat_005_M",
    OverlayFemale: "MP_MP_ImportExport_Tat_005_F",
    Zone: 3,
    Name: "Dialed In",
    Price: "5000"
  },
  {
    Collection: "mpimportexport_overlays",
    OverlayMale: "MP_MP_ImportExport_Tat_006_M",
    OverlayFemale: "MP_MP_ImportExport_Tat_006_F",
    Zone: 3,
    Name: "Engulfed Block",
    Price: "5000"
  },
  {
    Collection: "mpimportexport_overlays",
    OverlayMale: "MP_MP_ImportExport_Tat_007_M",
    OverlayFemale: "MP_MP_ImportExport_Tat_007_F",
    Zone: 3,
    Name: "Drive Forever",
    Price: "5000"
  },
  {
    Collection: "mplowrider_overlays",
    OverlayMale: "MP_LR_Tat_015_M",
    OverlayFemale: "MP_LR_Tat_015_F",
    Zone: 3,
    Name: "Seductress",
    Price: "5000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_007_M",
    OverlayFemale: "MP_MP_Biker_Tat_007_F",
    Zone: 3,
    Name: "Swooping Eagle",
    Price: "5000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_014_M",
    OverlayFemale: "MP_MP_Biker_Tat_014_F",
    Zone: 3,
    Name: "Lady Mortality",
    Price: "5000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_033_M",
    OverlayFemale: "MP_MP_Biker_Tat_033_F",
    Zone: 3,
    Name: "Eagle Emblem",
    Price: "5000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_042_M",
    OverlayFemale: "MP_MP_Biker_Tat_042_F",
    Zone: 3,
    Name: "Grim Rider",
    Price: "5000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_046_M",
    OverlayFemale: "MP_MP_Biker_Tat_046_F",
    Zone: 3,
    Name: "Skull Chain",
    Price: "5000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_047_M",
    OverlayFemale: "MP_MP_Biker_Tat_047_F",
    Zone: 3,
    Name: "Snake Bike",
    Price: "5000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_049_M",
    OverlayFemale: "MP_MP_Biker_Tat_049_F",
    Zone: 3,
    Name: "These Colors Don't Run",
    Price: "5000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_054_M",
    OverlayFemale: "MP_MP_Biker_Tat_054_F",
    Zone: 3,
    Name: "Mum",
    Price: "5000"
  },
  {
    Collection: "mplowrider2_overlays",
    OverlayMale: "MP_LR_Tat_003_M",
    OverlayFemale: "MP_LR_Tat_003_F",
    Zone: 3,
    Name: "Lady Vamp",
    Price: "5000"
  },
  {
    Collection: "mplowrider2_overlays",
    OverlayMale: "MP_LR_Tat_028_M",
    OverlayFemale: "MP_LR_Tat_028_F",
    Zone: 3,
    Name: "Loving Los Muertos",
    Price: "5000"
  },
  {
    Collection: "mplowrider2_overlays",
    OverlayMale: "MP_LR_Tat_035_M",
    OverlayFemale: "MP_LR_Tat_035_F",
    Zone: 3,
    Name: "Black Tears",
    Price: "5000"
  },
  {
    Collection: "mpluxe_overlays",
    OverlayMale: "MP_LUXE_TAT_004_M",
    OverlayFemale: "MP_LUXE_TAT_004_F",
    Zone: 3,
    Name: "Floral Raven",
    Price: "5000"
  },
  {
    Collection: "mpluxe_overlays",
    OverlayMale: "MP_LUXE_TAT_013_M",
    OverlayFemale: "MP_LUXE_TAT_013_F",
    Zone: 3,
    Name: "Mermaid Harpist",
    Price: "5000"
  },
  {
    Collection: "mpluxe_overlays",
    OverlayMale: "MP_LUXE_TAT_019_M",
    OverlayFemale: "MP_LUXE_TAT_019_F",
    Zone: 3,
    Name: "Geisha Bloom",
    Price: "5000"
  },
  {
    Collection: "mpluxe2_overlays",
    OverlayMale: "MP_LUXE_TAT_010_M",
    OverlayFemale: "MP_LUXE_TAT_010_F",
    Zone: 3,
    Name: "Intrometric",
    Price: "5000"
  },
  {
    Collection: "mpluxe2_overlays",
    OverlayMale: "MP_LUXE_TAT_017_M",
    OverlayFemale: "MP_LUXE_TAT_017_F",
    Zone: 3,
    Name: "Heavenly Deity",
    Price: "5000"
  },
  {
    Collection: "mpluxe2_overlays",
    OverlayMale: "MP_LUXE_TAT_026_M",
    OverlayFemale: "MP_LUXE_TAT_026_F",
    Zone: 3,
    Name: "Floral Print",
    Price: "5000"
  },
  {
    Collection: "mpluxe2_overlays",
    OverlayMale: "MP_LUXE_TAT_030_M",
    OverlayFemale: "MP_LUXE_TAT_030_F",
    Zone: 3,
    Name: "Geometric Design RA",
    Price: "5000"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_001_M",
    OverlayFemale: "MP_Smuggler_Tattoo_001_F",
    Zone: 3,
    Name: "Crackshot",
    Price: "7500"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_005_M",
    OverlayFemale: "MP_Smuggler_Tattoo_005_F",
    Zone: 3,
    Name: "Mutiny",
    Price: "7500"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_023_M",
    OverlayFemale: "MP_Smuggler_Tattoo_023_F",
    Zone: 3,
    Name: "Stylized Kraken",
    Price: "7500"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_003_M",
    OverlayFemale: "MP_MP_Stunt_Tat_003_F",
    Zone: 3,
    Name: "Poison Wrench",
    Price: "7500"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_009_M",
    OverlayFemale: "MP_MP_Stunt_Tat_009_F",
    Zone: 3,
    Name: "Arachnid of Death",
    Price: "7500"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_010_M",
    OverlayFemale: "MP_MP_Stunt_Tat_010_F",
    Zone: 3,
    Name: "Grave Vulture",
    Price: "7500"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_016_M",
    OverlayFemale: "MP_MP_Stunt_Tat_016_F",
    Zone: 3,
    Name: "Coffin Racer",
    Price: "7500"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_036_M",
    OverlayFemale: "MP_MP_Stunt_Tat_036_F",
    Zone: 3,
    Name: "Biker Stallion",
    Price: "7500"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_038_M",
    OverlayFemale: "MP_MP_Stunt_Tat_038_F",
    Zone: 3,
    Name: "One Down Five Up",
    Price: "7500"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_049_M",
    OverlayFemale: "MP_MP_Stunt_Tat_049_F",
    Zone: 3,
    Name: "Seductive Mechanic",
    Price: "7500"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_Award_M_002",
    OverlayFemale: "FM_Tat_Award_F_002",
    Zone: 3,
    Name: "Grim Reaper Smoking Gun",
    Price: "7500"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_Award_M_010",
    OverlayFemale: "FM_Tat_Award_F_010",
    Zone: 3,
    Name: "Ride or Die RA",
    Price: "7500"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_000",
    OverlayFemale: "FM_Tat_F_000",
    Zone: 3,
    Name: "Brotherhood",
    Price: "7500"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_001",
    OverlayFemale: "FM_Tat_F_001",
    Zone: 3,
    Name: "Dragons",
    Price: "7500"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_003",
    OverlayFemale: "FM_Tat_F_003",
    Zone: 3,
    Name: "Dragons and Skull",
    Price: "7500"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_014",
    OverlayFemale: "FM_Tat_F_014",
    Zone: 3,
    Name: "Flower Mural",
    Price: "7500"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_018",
    OverlayFemale: "FM_Tat_F_018",
    Zone: 3,
    Name: "Serpent Skull RA",
    Price: "7500"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_027",
    OverlayFemale: "FM_Tat_F_027",
    Zone: 3,
    Name: "Virgin Mary",
    Price: "7500"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_028",
    OverlayFemale: "FM_Tat_F_028",
    Zone: 3,
    Name: "Mermaid",
    Price: "7500"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_038",
    OverlayFemale: "FM_Tat_F_038",
    Zone: 3,
    Name: "Dagger",
    Price: "7500"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_047",
    OverlayFemale: "FM_Tat_F_047",
    Zone: 3,
    Name: "Lion",
    Price: "7500"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_010_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_010_F",
    Zone: 3,
    Name: "Blackwork Lines RA",
    Price: "100000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_018_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_018_F",
    Zone: 3,
    Name: "Blackwork Shade RA",
    Price: "100000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_002_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_002_F",
    Zone: 3,
    Name: "Blackwork Shade Mid RA",
    Price: "100000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_134_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_134_F",
    Zone: 3,
    Name: "Blackwork Comb RA",
    Price: "100000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_135_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_135_F",
    Zone: 3,
    Name: "Blackwork Comb Forearm RA",
    Price: "100000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_032_M",
    OverlayFemale: "mpHeist3_Tat_032_F",
    Zone: 4,
    Name: "Love Fist",
    Price: "20000"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_013_M",
    OverlayFemale: "MP_Vinewood_Tat_013_F",
    Zone: 4,
    Name: "One-armed Bandit",
    Price: "7500"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_027_M",
    OverlayFemale: "MP_Vinewood_Tat_027_F",
    Zone: 4,
    Name: "8-Ball Rose",
    Price: "7500"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "",
    OverlayFemale: "MP_Buis_F_LLeg_000",
    Zone: 4,
    Name: "Single",
    Price: "7500"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_001",
    OverlayFemale: "MP_Xmas2_F_Tat_001",
    Zone: 4,
    Name: "Spider Outline",
    Price: "7500"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_002",
    OverlayFemale: "MP_Xmas2_F_Tat_002",
    Zone: 4,
    Name: "Spider Color",
    Price: "7500"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_005_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_005_F",
    Zone: 4,
    Name: "Patriot Skull",
    Price: "7500"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_007_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_007_F",
    Zone: 4,
    Name: "Stylized Tiger",
    Price: "7500"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_011_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_011_F",
    Zone: 4,
    Name: "Death Skull",
    Price: "7500"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_023_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_023_F",
    Zone: 4,
    Name: "Rose Revolver",
    Price: "7500"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_009",
    OverlayFemale: "FM_Hip_F_Tat_009",
    Zone: 4,
    Name: "Squares",
    Price: "10000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_019",
    OverlayFemale: "FM_Hip_F_Tat_019",
    Zone: 4,
    Name: "Charm",
    Price: "10000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_040",
    OverlayFemale: "FM_Hip_F_Tat_040",
    Zone: 4,
    Name: "Black Anchor",
    Price: "10000"
  },
  {
    Collection: "mplowrider_overlays",
    OverlayMale: "MP_LR_Tat_007_M",
    OverlayFemale: "MP_LR_Tat_007_F",
    Zone: 4,
    Name: "LS Serpent",
    Price: "10000"
  },
  {
    Collection: "mplowrider_overlays",
    OverlayMale: "MP_LR_Tat_020_M",
    OverlayFemale: "MP_LR_Tat_020_F",
    Zone: 4,
    Name: "Presidents",
    Price: "10000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_002_M",
    OverlayFemale: "MP_MP_Biker_Tat_002_F",
    Zone: 4,
    Name: "Rose Tribute",
    Price: "10000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_015_M",
    OverlayFemale: "MP_MP_Biker_Tat_015_F",
    Zone: 4,
    Name: "Ride or Die LL",
    Price: "10000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_027_M",
    OverlayFemale: "MP_MP_Biker_Tat_027_F",
    Zone: 4,
    Name: "Bad Luck",
    Price: "10000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_036_M",
    OverlayFemale: "MP_MP_Biker_Tat_036_F",
    Zone: 4,
    Name: "Engulfed Skull",
    Price: "10000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_037_M",
    OverlayFemale: "MP_MP_Biker_Tat_037_F",
    Zone: 4,
    Name: "Scorched Soul",
    Price: "10000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_044_M",
    OverlayFemale: "MP_MP_Biker_Tat_044_F",
    Zone: 4,
    Name: "Ride Free",
    Price: "10000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_056_M",
    OverlayFemale: "MP_MP_Biker_Tat_056_F",
    Zone: 4,
    Name: "Bone Cruiser",
    Price: "10000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_057_M",
    OverlayFemale: "MP_MP_Biker_Tat_057_F",
    Zone: 4,
    Name: "Laughing Skull",
    Price: "10000"
  },
  {
    Collection: "mplowrider2_overlays",
    OverlayMale: "MP_LR_Tat_029_M",
    OverlayFemale: "MP_LR_Tat_029_F",
    Zone: 4,
    Name: "Death Us Do Part",
    Price: "10000"
  },
  {
    Collection: "mpluxe_overlays",
    OverlayMale: "MP_LUXE_TAT_000_M",
    OverlayFemale: "MP_LUXE_TAT_000_F",
    Zone: 4,
    Name: "Serpent of Death",
    Price: "10000"
  },
  {
    Collection: "mpluxe2_overlays",
    OverlayMale: "MP_LUXE_TAT_011_M",
    OverlayFemale: "MP_LUXE_TAT_011_F",
    Zone: 4,
    Name: "Cross of Roses",
    Price: "10000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_007_M",
    OverlayFemale: "MP_MP_Stunt_Tat_007_F",
    Zone: 4,
    Name: "Dagger Devil",
    Price: "10000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_013_M",
    OverlayFemale: "MP_MP_Stunt_Tat_013_F",
    Zone: 4,
    Name: "Dirt Track Hero",
    Price: "10000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_021_M",
    OverlayFemale: "MP_MP_Stunt_Tat_021_F",
    Zone: 4,
    Name: "Golden Cobra",
    Price: "10000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_028_M",
    OverlayFemale: "MP_MP_Stunt_Tat_028_F",
    Zone: 4,
    Name: "Quad Goblin",
    Price: "10000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_031_M",
    OverlayFemale: "MP_MP_Stunt_Tat_031_F",
    Zone: 4,
    Name: "Stunt Jesus",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_Award_M_009",
    OverlayFemale: "FM_Tat_Award_F_009",
    Zone: 4,
    Name: "Dragon and Dagger",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_002",
    OverlayFemale: "FM_Tat_F_002",
    Zone: 4,
    Name: "Melting Skull",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_008",
    OverlayFemale: "FM_Tat_F_008",
    Zone: 4,
    Name: "Dragon Mural",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_021",
    OverlayFemale: "FM_Tat_F_021",
    Zone: 4,
    Name: "Serpent Skull LL",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_023",
    OverlayFemale: "FM_Tat_F_023",
    Zone: 4,
    Name: "Hottie",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_026",
    OverlayFemale: "FM_Tat_F_026",
    Zone: 4,
    Name: "Smoking Dagger",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_032",
    OverlayFemale: "FM_Tat_F_032",
    Zone: 4,
    Name: "Faith LL",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_033",
    OverlayFemale: "FM_Tat_F_033",
    Zone: 4,
    Name: "Chinese Dragon",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_035",
    OverlayFemale: "FM_Tat_F_035",
    Zone: 4,
    Name: "Dragon LL",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_037",
    OverlayFemale: "FM_Tat_F_037",
    Zone: 4,
    Name: "Grim Reaper",
    Price: "10000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_170_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_170_F",
    Zone: 4,
    Name: "Blackwork Detail 1 LL",
    Price: "125000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_171_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_171_F",
    Zone: 4,
    Name: "Blackwork Full LL",
    Price: "125000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_172_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_172_F",
    Zone: 4,
    Name: "Blackwork Detail 2 LL",
    Price: "125000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_173_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_173_F",
    Zone: 4,
    Name: "Blackwork Detail 3 LL",
    Price: "125000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_174_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_174_F",
    Zone: 4,
    Name: "Blackwork Detail 4 LL",
    Price: "125000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_175_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_175_F",
    Zone: 4,
    Name: "Blackwork Detail 5 LL",
    Price: "125000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_176_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_176_F",
    Zone: 4,
    Name: "Blackwork Detail 6 LL",
    Price: "125000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_177_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_177_F",
    Zone: 4,
    Name: "Blackwork Comb LL",
    Price: "125000"
  },
  {
    Collection: "mpheist3_overlays",
    OverlayMale: "mpHeist3_Tat_031_M",
    OverlayFemale: "mpHeist3_Tat_031_F",
    Zone: 5,
    Name: "Kifflom",
    Price: "20000"
  },
  {
    Collection: "mpvinewood_overlays",
    OverlayMale: "MP_Vinewood_Tat_020_M",
    OverlayFemale: "MP_Vinewood_Tat_020_F",
    Zone: 5,
    Name: "Cash is King",
    Price: "10000"
  },
  {
    Collection: "mpbusiness_overlays",
    OverlayMale: "",
    OverlayFemale: "MP_Buis_F_RLeg_000",
    Zone: 5,
    Name: "Diamond Crown",
    Price: "10000"
  },
  {
    Collection: "mpchristmas2_overlays",
    OverlayMale: "MP_Xmas2_M_Tat_014",
    OverlayFemale: "MP_Xmas2_F_Tat_014",
    Zone: 5,
    Name: "Floral Dagger",
    Price: "10000"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_006_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_006_F",
    Zone: 5,
    Name: "Combat Skull",
    Price: "10000"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_026_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_026_F",
    Zone: 5,
    Name: "Restless Skull",
    Price: "10000"
  },
  {
    Collection: "mpgunrunning_overlays",
    OverlayMale: "MP_Gunrunning_Tattoo_030_M",
    OverlayFemale: "MP_Gunrunning_Tattoo_030_F",
    Zone: 5,
    Name: "Pistol Ace",
    Price: "10000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_038",
    OverlayFemale: "FM_Hip_F_Tat_038",
    Zone: 5,
    Name: "Grub",
    Price: "5000"
  },
  {
    Collection: "mphipster_overlays",
    OverlayMale: "FM_Hip_M_Tat_042",
    OverlayFemale: "FM_Hip_F_Tat_042",
    Zone: 5,
    Name: "Sparkplug",
    Price: "5000"
  },
  {
    Collection: "mplowrider_overlays",
    OverlayMale: "MP_LR_Tat_017_M",
    OverlayFemale: "MP_LR_Tat_017_F",
    Zone: 5,
    Name: "Ink Me",
    Price: "5000"
  },
  {
    Collection: "mplowrider_overlays",
    OverlayMale: "MP_LR_Tat_023_M",
    OverlayFemale: "MP_LR_Tat_023_F",
    Zone: 5,
    Name: "Dance of Hearts",
    Price: "5000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_004_M",
    OverlayFemale: "MP_MP_Biker_Tat_004_F",
    Zone: 5,
    Name: "Dragon's Fury",
    Price: "5000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_022_M",
    OverlayFemale: "MP_MP_Biker_Tat_022_F",
    Zone: 5,
    Name: "Western Insignia",
    Price: "5000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_028_M",
    OverlayFemale: "MP_MP_Biker_Tat_028_F",
    Zone: 5,
    Name: "Dusk Rider",
    Price: "5000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_040_M",
    OverlayFemale: "MP_MP_Biker_Tat_040_F",
    Zone: 5,
    Name: "American Made",
    Price: "5000"
  },
  {
    Collection: "mpbiker_overlays",
    OverlayMale: "MP_MP_Biker_Tat_048_M",
    OverlayFemale: "MP_MP_Biker_Tat_048_F",
    Zone: 5,
    Name: "STFU",
    Price: "5000"
  },
  {
    Collection: "mplowrider2_overlays",
    OverlayMale: "MP_LR_Tat_030_M",
    OverlayFemale: "MP_LR_Tat_030_F",
    Zone: 5,
    Name: "San Andreas Prayer",
    Price: "5000"
  },
  {
    Collection: "mpluxe_overlays",
    OverlayMale: "MP_LUXE_TAT_001_M",
    OverlayFemale: "MP_LUXE_TAT_001_F",
    Zone: 5,
    Name: "Elaborate Los Muertos",
    Price: "5000"
  },
  {
    Collection: "mpluxe2_overlays",
    OverlayMale: "MP_LUXE_TAT_023_M",
    OverlayFemale: "MP_LUXE_TAT_023_F",
    Zone: 5,
    Name: "Starmetric",
    Price: "5000"
  },
  {
    Collection: "mpsmuggler_overlays",
    OverlayMale: "MP_Smuggler_Tattoo_020_M",
    OverlayFemale: "MP_Smuggler_Tattoo_020_F",
    Zone: 5,
    Name: "Homeward Bound",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_005_M",
    OverlayFemale: "MP_MP_Stunt_Tat_005_F",
    Zone: 5,
    Name: "Demon Spark Plug",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_015_M",
    OverlayFemale: "MP_MP_Stunt_Tat_015_F",
    Zone: 5,
    Name: "Praying Gloves",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_020_M",
    OverlayFemale: "MP_MP_Stunt_Tat_020_F",
    Zone: 5,
    Name: "Piston Angel",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_025_M",
    OverlayFemale: "MP_MP_Stunt_Tat_025_F",
    Zone: 5,
    Name: "Speed Freak",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_032_M",
    OverlayFemale: "MP_MP_Stunt_Tat_032_F",
    Zone: 5,
    Name: "Wheelie Mouse",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_045_M",
    OverlayFemale: "MP_MP_Stunt_Tat_045_F",
    Zone: 5,
    Name: "Severed Hand",
    Price: "5000"
  },
  {
    Collection: "mpstunt_overlays",
    OverlayMale: "MP_MP_Stunt_Tat_047_M",
    OverlayFemale: "MP_MP_Stunt_Tat_047_F",
    Zone: 5,
    Name: "Brake Knife",
    Price: "5000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_Award_M_006",
    OverlayFemale: "FM_Tat_Award_F_006",
    Zone: 5,
    Name: "Skull and Sword",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_007",
    OverlayFemale: "FM_Tat_F_007",
    Zone: 5,
    Name: "The Warrior",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_017",
    OverlayFemale: "FM_Tat_F_017",
    Zone: 5,
    Name: "Tribal",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_022",
    OverlayFemale: "FM_Tat_F_022",
    Zone: 5,
    Name: "Fiery Dragon",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_039",
    OverlayFemale: "FM_Tat_F_039",
    Zone: 5,
    Name: "Broken Skull",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_040",
    OverlayFemale: "FM_Tat_F_040",
    Zone: 5,
    Name: "Flaming Skull",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_042",
    OverlayFemale: "FM_Tat_F_042",
    Zone: 5,
    Name: "Flaming Scorpion",
    Price: "10000"
  },
  {
    Collection: "multiplayer_overlays",
    OverlayMale: "FM_Tat_M_043",
    OverlayFemale: "FM_Tat_F_043",
    Zone: 5,
    Name: "Indian Ram",
    Price: "10000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_162_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_162_F",
    Zone: 5,
    Name: "Blackwork Detail 1 RL",
    Price: "125000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_163_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_163_F",
    Zone: 5,
    Name: "Blackwork Full RL",
    Price: "125000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_164_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_164_F",
    Zone: 5,
    Name: "Blackwork Detail 2 RL",
    Price: "125000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_165_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_165_F",
    Zone: 5,
    Name: "Blackwork Detail 3 RL",
    Price: "125000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_166_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_166_F",
    Zone: 5,
    Name: "Blackwork Detail 4 RL",
    Price: "125000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_167_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_167_F",
    Zone: 5,
    Name: "Blackwork Detail 5 RL",
    Price: "125000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_168_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_168_F",
    Zone: 5,
    Name: "Blackwork Detail 6 RL",
    Price: "125000"
  },
  {
    Collection: "gta5rptattoo_overlays",
    OverlayMale: "MP_Gta5rptattoo_Tat_169_M",
    OverlayFemale: "MP_Gta5rptattoo_Tat_169_F",
    Zone: 5,
    Name: "Blackwork Comb RL",
    Price: "125000"
  }
];
var TattooZonesList = [{
  Name: "Торс"
}, {
  Name: "Голова"
}, {
  Name: "Левая рука"
}, {
  Name: "Правая рука"
}, {
  Name: "Левая нога"
}, {
  Name: "Правая нога"
}];
var TattooShopByZone = [[], [], [], [], [], []];
var TATTOO_ZONE_LIST_IDS = [
  "TattooShopBodyList",
  "TattooShopHeadList",
  "TattooShopLeftHandList",
  "TattooShopRightHandList",
  "TattooShopLeftLegList",
  "TattooShopRightLegList"
];
var TATTOO_ZONE_HREFS = [
  "#tattoo-body",
  "#tattoo-head",
  "#tattoo-left-hand",
  "#tattoo-right-hand",
  "#tattoo-left-leg",
  "#tattoo-right-leg"
];
var tattooShopState = {
  activeZone: 0,
  selectedIdx: -1,
  searchQuery: ""
};

function buildTattooShopByZone() {
  for (let z = 0; z < 6; z++) {
    TattooShopByZone[z] = TattooShopList.filter(function (item) {
      return item.OverlayMale != "" && item.Zone == z;
    });
  }
}

function getFilteredTattoosForZone(zone) {
  const list = TattooShopByZone[zone] || [];
  const q = String(tattooShopState.searchQuery || "").trim().toLowerCase();
  if (!q) return list;
  return list.filter(function (item) {
    return String(item.Name || "").toLowerCase().indexOf(q) !== -1;
  });
}

function renderTattooZoneLists() {
  for (let z = 0; z < 6; z++) {
    const listId = TATTOO_ZONE_LIST_IDS[z];
    const el = document.getElementById(listId);
    if (!el) continue;
    const items = getFilteredTattoosForZone(z);
    let html = "";
    for (let i = 0; i < items.length; i++) {
      const t = items[i];
      const active = tattooShopState.activeZone === z && tattooShopState.selectedIdx === i ? " active" : "";
      const priceFmt = parseInt(t.Price).toDivideNum();
      html += '<li class="' + active + '" data-zone="' + z + '" data-idx="' + i + '" onclick="tattooShopPickItem(' + z + ',' + i + ')">' +
        '<a><p>' + t.Name + '</p><p class="tattoo-price">' + priceFmt + '$</p></a></li>';
    }
    if (!items.length) {
      html = '<li class="tattoo-empty"><a><p>Ничего не найдено</p></a></li>';
    }
    el.innerHTML = html;
  }
}

function tattooShopScrollToItem(zone, idx) {
  const listEl = document.getElementById(TATTOO_ZONE_LIST_IDS[zone]);
  if (!listEl) return;
  const li = listEl.querySelector('li[data-idx="' + idx + '"]');
  if (li && typeof li.scrollIntoView === "function") {
    li.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

function tattooShopPickItem(zone, idx, skipScroll) {
  const items = getFilteredTattoosForZone(zone);
  const t = items[idx];
  if (!t) return;
  tattooShopState.activeZone = zone;
  tattooShopState.selectedIdx = idx;
  renderTattooZoneLists();
  setTattooInShop(t.Collection, t.OverlayMale, t.Zone, t.Name, t.Price);
  if (!skipScroll) tattooShopScrollToItem(zone, idx);
}

function tattooShopSetActiveZone(hrefOrZone) {
  let zone = parseInt(hrefOrZone, 10);
  if (!Number.isFinite(zone)) {
    zone = TATTOO_ZONE_HREFS.indexOf(String(hrefOrZone || ""));
    if (zone < 0) zone = 0;
  }
  tattooShopState.activeZone = zone;
  const items = getFilteredTattoosForZone(zone);
  if (tattooShopState.selectedIdx < 0 || tattooShopState.selectedIdx >= items.length) {
    tattooShopState.selectedIdx = items.length ? 0 : -1;
  }
  renderTattooZoneLists();
  if (tattooShopState.selectedIdx >= 0) {
    tattooShopPickItem(zone, tattooShopState.selectedIdx, true);
  }
}

function tattooShopApplySearch(query) {
  tattooShopState.searchQuery = String(query || "");
  const zone = tattooShopState.activeZone;
  const items = getFilteredTattoosForZone(zone);
  if (!items.length) {
    tattooShopState.selectedIdx = -1;
  } else if (tattooShopState.selectedIdx < 0 || tattooShopState.selectedIdx >= items.length) {
    tattooShopState.selectedIdx = 0;
  }
  renderTattooZoneLists();
  if (tattooShopState.selectedIdx >= 0) {
    tattooShopPickItem(zone, tattooShopState.selectedIdx, true);
  }
}

function tattooShopOnArrow(delta) {
  const searchEl = document.getElementById("tattooSearchInput");
  if (searchEl && document.activeElement === searchEl) return;
  const zone = tattooShopState.activeZone;
  const items = getFilteredTattoosForZone(zone);
  if (!items.length) return;
  let idx = tattooShopState.selectedIdx;
  const step = Number(delta) || 0;
  if (idx < 0 && step > 0) idx = 0;
  else idx = idx + step;
  if (idx < 0) idx = 0;
  if (idx >= items.length) idx = items.length - 1;
  if (idx === tattooShopState.selectedIdx) return;
  tattooShopPickItem(zone, idx);
}

function loadTattooItems() {
  buildTattooShopByZone();
  tattooShopState.activeZone = 0;
  tattooShopState.selectedIdx = -1;
  tattooShopState.searchQuery = "";
  const searchEl = document.getElementById("tattooSearchInput");
  if (searchEl) searchEl.value = "";
  renderTattooZoneLists();
}

function setTattooInShop(collectionId, overlayId, zoneId, tattooName, price) {
  const zoneName = TattooZonesList[parseInt(zoneId)].Name;
  const priceFmt = parseInt(price).toDivideNum();
  const html = `
    <p class="tattoo-preview__name heading">${tattooName}</p>
    <p class="tattoo-preview__zone heading2">${zoneName}</p>
    <div class="tattoo-preview__buy bottom-tattoo-menu">
      <div class="tattoo-preview__price">
        <span class="tattoo-preview__amount">${priceFmt}</span>
        <span class="tattoo-preview__currency">$</span>
      </div>
      <a class="flow-shop-btn flow-shop-btn--primary" onclick="mp.trigger('tatto:buy:c', '${collectionId}', '${overlayId}', '${price}')">Оплатить</a>
    </div>`;
  document.querySelectorAll('#tattoo-menu .tab-pane').forEach((el) => {
    if (el) el.innerHTML = html;
  });
  mp.trigger("tatto:setdemo:c", collectionId, overlayId);
}