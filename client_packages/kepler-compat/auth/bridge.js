(()=>{'use strict';
 const status=document.getElementById('statusMessage'),login=document.getElementById('loginUsername');
 window.authMain={
  boot(){document.body.hidden=false;},
  clearStatusLabel(){status.textContent='';status.className='status-msg';},
  focusAuthPrimaryInput(){login.focus();},
  setAuthLogin(value){login.value=String(value||'');},
  setStatusLabel(value){window.AUTH_INTERFACE.setError(String(value||''));},
  onRegisterSuccess(value){switchTab('login');login.value=String(value||'');window.AUTH_INTERFACE.setSuccess('Аккаунт создан. Войдите с вашим паролем.');},
  onRecoverySuccess(value){switchTab('login');login.value=String(value||'');window.AUTH_INTERFACE.setSuccess('Пароль изменён.');},
  hideForSession(){document.body.hidden=true;},
  setVerificationEmail(value){window.AUTH_INTERFACE.setSuccess(value?'Код подтверждён.':'Проверьте код из письма.');},
  sessionPending:false,authBlock:false
 };
 Object.defineProperty(window.authMain,'isActive',{set(value){document.body.hidden=!value;},get(){return !document.body.hidden;}});
 if(window.mp)mp.trigger('auth:browser:ready');
})();
