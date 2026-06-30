@echo off
cd /d %~dp0
echo Instalando PetroPOS Professional...
call npm install
if errorlevel 1 (
  echo.
  echo ERROR: No se pudo completar npm install.
  pause
  exit /b 1
)
echo.
echo Iniciando PetroPOS...
call npm start
pause
