'use strict';



/**

 * Модели оружия в мире (как в руках у педа / на дропе): одна таблица для инвентаря, дропа и вложений на теле.

 */

const weaponModels = {

    weapon_heavyshotgun: 'w_sg_heavyshotgun',

    weapon_assaultshotgun: 'w_sg_assaultshotgun',

    weapon_carbinerifle: 'w_ar_carbinerifle',

    weapon_assaultrifle: 'w_ar_assaultrifle',

    weapon_combatmg: 'w_mg_combatmg',

    weapon_combatmg_mk2: 'w_mg_combatmgmk2',

    weapon_minismg: 'w_sb_minismg',

    weapon_militaryrifle: 'w_ar_militaryrifle',

    weapon_sniperrifle: 'w_sr_sniperrifle',

    weapon_heavysniper: 'w_sr_heavysniper',

    weapon_heavysniper_mk2: 'w_sr_heavysnipermk2',

    weapon_marksmanrifle: 'w_sr_marksmanrifle',

    weapon_specialcarbine: 'w_ar_specialcarbine',

    weapon_specialcarbine_mk2: 'w_ar_specialcarbinemk2',

    weapon_precisionrifle: 'w_sr_precisionrifle_reh',

    weapon_revolver: 'w_pi_revolver',

    weapon_revolver_mk2: 'w_pi_revolvermk2',

    weapon_navyrevolver: 'w_pi_wep2_gun',

    weapon_gadgetpistol: 'w_pi_singleshoth4',

    weapon_musket: 'w_ar_musket'

};



function getWeaponWorldModel(name, fallback) {

    const base = String(name == null ? '' : name).split('(')[0].trim();

    const m = weaponModels[base];

    if (m) return m;

    if (typeof fallback === 'string' && fallback.length) return fallback;

    return 'w_ar_assaultrifle';

}

/**
 * Доп. смещение по Z после getGroundZ: у длинных стволов/другого pivot модель иначе «висит» над землёй.
 */
const weaponDropZOffsets = {
    weapon_heavysniper_mk2: 0.07,
    weapon_heavysniper: 0.06,
    weapon_precisionrifle: 0.07,
    weapon_sniperrifle: 0.055,
    weapon_marksmanrifle: 0.055,
    weapon_musket: 0.06,
    weapon_combatmg: 0.05,
    weapon_combatmg_mk2: 0.05,
    weapon_carbinerifle: 0.04,
    weapon_assaultrifle: 0.04,
    weapon_militaryrifle: 0.04,
    weapon_specialcarbine: 0.04,
    weapon_specialcarbine_mk2: 0.04,
    weapon_minismg: 0.035,
    weapon_assaultshotgun: 0.04,
    weapon_heavyshotgun: 0.045,
    weapon_revolver_mk2: 0.03,
    weapon_navyrevolver: 0.03,
    weapon_gadgetpistol: 0.025
};

function getWeaponDropZOffset(name) {
    const base = String(name == null ? '' : name).split('(')[0].trim();
    if (weaponDropZOffsets[base] != null) return weaponDropZOffsets[base];
    return 0.035;
}

module.exports = { weaponModels, getWeaponWorldModel, getWeaponDropZOffset };


