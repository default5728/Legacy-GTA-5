'use strict';
const protectedModels=new Set(['vw_prop_casino_roulette_01','vw_prop_casino_blckjack_01','vw_prop_casino_track_chair_01','vw_prop_casino_slot_01a'].map(name=>mp.joaat(name)>>>0));
function guard(entity){if(protectedModels.has(entity.model>>>0)||entity.getVariable('casinoTable')||entity.getVariable('casinoBusy'))throw Error('Этот игровой объект управляется системой казино; редактирование через /placer запрещено.');}
module.exports={async begin(e){guard(e);e.setVariable('legacyEditing',true);},release(e){if(e&&mp.objects.exists(e))e.setVariable('legacyEditing',false);},commit(e){guard(e);e.setVariable('legacyEditing',false);return null;},erase(e){guard(e);}};
