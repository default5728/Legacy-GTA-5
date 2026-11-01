// RAGE throws when cancelling null or an already-fired native timer.
const timeouts=new Set();
exports.timeout=function(callback,delay){let id=null;id=setTimeout(()=>{timeouts.delete(id);callback();},delay);timeouts.add(id);return id;};
exports.cancel=function(id){if(id!==null&&id!==undefined&&timeouts.delete(id))clearTimeout(id);};
