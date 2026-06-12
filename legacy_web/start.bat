@echo off
setlocal
cd /d "%~dp0"

title O sonho ainda esta vivo - Copa 2026

echo.
echo ==========================================================
echo   O SONHO AINDA ESTA VIVO? - APOSTA COPA 2026
echo ==========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo Node.js nao foi encontrado neste computador.
  echo.
  echo Instale o Node.js LTS em: https://nodejs.org/
  echo Depois feche esta janela e abra novamente o start.bat.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Instalando dependencias na primeira execucao...
  echo Isso acontece apenas uma vez.
  echo.
  call npm install
  if %errorlevel% neq 0 (
    echo.
    echo Falha ao instalar dependencias. Verifique sua internet e tente novamente.
    pause
    exit /b 1
  )
)

echo.
echo Abrindo painel em http://localhost:3000 ...
echo Para fechar o site, feche esta janela depois de usar.
echo.
start "" http://localhost:3000
call npm start

pause
endlocal
