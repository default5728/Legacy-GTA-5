'use strict';
const handlers=new Map(),original=mp.events.addCommand.bind(mp.events);
mp.events.addCommand=function(name,handler){handlers.set(String(name).toLowerCase(),handler);return original(name,handler);};
module.exports=handlers;
