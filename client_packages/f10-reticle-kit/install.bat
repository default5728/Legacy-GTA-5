@echo off
chcp 65001 >nul
setlocal

REM Скопируйте f10-reticle-kit в корень вашей RAGE-сборки и запустите этот скрипт.
REM Он разложит файлы по client_packages и packages/server.

set "ROOT=%~dp0.."
set "KIT=%~dp0"

echo [f10-reticle] Копирование client...
copy /Y "%KIT%client\playermenu_reticle.js" "%ROOT%\client_packages\"
copy /Y "%KIT%client\playermenu_reticle_rpc.js" "%ROOT%\client_packages\"
copy /Y "%KIT%client\crosshair.js" "%ROOT%\client_packages\"

echo [f10-reticle] Копирование kit в client_packages...
xcopy /E /I /Y "%KIT%" "%ROOT%\client_packages\f10-reticle-kit\"

echo [f10-reticle] Копирование server...
copy /Y "%KIT%server\f10_reticle_server.js" "%ROOT%\packages\server\"

echo.
echo Готово. Вручную добавьте в client_packages/index.js:
echo   require('./playermenu_reticle.js');
echo   require('./playermenu_reticle_rpc.js');
echo   require('./crosshair.js');
echo.
echo И в packages/server/index.js:
echo   require('./f10_reticle_server.js');
echo.
echo Подробности — README.md
pause
