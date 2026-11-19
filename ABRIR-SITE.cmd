@echo off
setlocal
title NefroSmart - Gestao de Hemodialise

REM 1. Tenta navegacao direta pela unidade mapeada L: (mais estavel e rapido)
if exist "L:\ProjetoHemodialise-main\ProjetoHemodialise-main\start-site.py" (
  cd /d "L:\ProjetoHemodialise-main\ProjetoHemodialise-main"
  goto :iniciar
)
if exist "L:\ProjetoHemodialise-main\start-site.py" (
  cd /d "L:\ProjetoHemodialise-main"
  goto :iniciar
)

REM 2. Se nao estiver no L:, remove a barra final de %~dp0 para pushd seguro
set "PROJ_PATH=%~dp0"
if "%PROJ_PATH:~-1%"=="\" set "PROJ_PATH=%PROJ_PATH:~0,-1%"
pushd "%PROJ_PATH%" 2>nul

if exist "ProjetoHemodialise-main\start-site.py" (
  cd "ProjetoHemodialise-main"
)

:iniciar
if not exist "start-site.py" (
  echo [ERRO] Nao foi possivel localizar os arquivos do projeto.
  echo Pasta atual: %CD%
  pause
  popd 2>nul
  exit /b 1
)

if exist "backend\venv2\Scripts\python.exe" (
  "backend\venv2\Scripts\python.exe" start-site.py
) else (
  python start-site.py
)

popd 2>nul
