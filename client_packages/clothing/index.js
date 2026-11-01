const validation=require('./clothing/validation');
const rules=require('./clothing/profiles');
global.CLOTHING={
 apply(list){
   const ped=mp.players.local,gender=(ped.model>>>0)===(mp.game.joaat('mp_f_freemode_01')>>>0)?1:0;
   const fitted=validation.resolve(ped,rules.normalize(gender,list));
   for(const tuple of fitted.rows){const error=validation.validate(ped,'components',tuple);if(error)throw Error(error);}
   for(const tuple of fitted.rows)ped.setComponentVariation(...tuple);
   return fitted;
 },
 outfit(gender,look){return this.apply(rules.outfit(gender,look));}
};
