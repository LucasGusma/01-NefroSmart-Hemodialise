@echo off
setlocal
title NefroSmart - Reiniciar Sistema Limpo

echo ===================================================
echo     Reiniciando NefroSmart (Liberando portas)
echo ===================================================
echo Fechando processos anteriores em execucao...
taskkill /F /IM python.exe >nul 2>nul
taskkill /F /IM node.exe >nul 2>nul
timeout /t 1 /nobreak >nul
echo.

REM 1. Tenta navegacao direta pela unidade mapeada L:
if exist "L:\ProjetoHemodialise-main\ProjetoHemodialise-main\ABRIR-SITE.cmd" (
  cd /d "L:\ProjetoHemodialise-main\ProjetoHemodialise-main"
  call ABRIR-SITE.cmd
  exit /b
)

REM 2. Se nao estiver no L:, remove a barra final de %~dp0 para pushd seguro
set "PROJ_PATH=%~dp0"
if "%PROJ_PATH:~-1%"=="\" set "PROJ_PATH=%PROJ_PATH:~0,-1%"
pushd "%PROJ_PATH%" 2>nul

call ABRIR-SITE.cmd
popd 2>nul
