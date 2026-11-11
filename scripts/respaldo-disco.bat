@echo off
rem =====================================================================
rem  OdontoVoz - copia de las copias de seguridad a un disco externo
rem  Baja del Google Drive de ROAN la carpeta OdontoVoz-respaldos al disco.
rem  Las copias siguen ENCRIPTADAS en el disco (se abren solo con la frase).
rem  No borra nada del disco: guarda todas las copias que vaya bajando.
rem
rem  Antes de usarlo (una sola vez, ver docs/RESPALDOS.md):
rem   1) Instalar rclone en C:\rclone (rclone.org/downloads, Windows 64 bits).
rem   2) En una ventana de comandos: C:\rclone\rclone.exe config
rem      crear un remoto llamado  drive  tipo Google Drive, entrar con somosroan.
rem   3) Cambiar abajo la letra del disco si no es E:
rem =====================================================================

set RCLONE=C:\rclone\rclone.exe
set DISCO=E:
set DESTINO=%DISCO%\OdontoVoz-respaldos

if not exist %DISCO%\ (
  echo.
  echo  No encuentro el disco %DISCO%  - Conectalo y volve a abrir este archivo.
  echo.
  pause
  exit /b 1
)

if not exist "%DESTINO%" mkdir "%DESTINO%"
echo Copiando las copias de OdontoVoz a %DESTINO% (todo queda dentro de esa carpeta, encriptado) ...
"%RCLONE%" copy drive:OdontoVoz-respaldos "%DESTINO%" --progress --log-file "%DESTINO%\registro.txt" --log-level INFO
if errorlevel 1 (
  echo.
  echo  ATENCION: la copia no termino bien. Mira el archivo %DESTINO%\registro.txt
  pause
  exit /b 1
)

echo Revisando que este todo igual que en el Drive ...
"%RCLONE%" check drive:OdontoVoz-respaldos "%DESTINO%" --one-way --log-file "%DESTINO%\registro.txt" --log-level NOTICE
if errorlevel 1 (
  echo  ATENCION: hay diferencias entre el Drive y el disco. Mira %DESTINO%\registro.txt
  pause
  exit /b 1
)

echo %date% %time% > "%DESTINO%\ultima-copia-en-disco.txt"
echo.
echo  Listo. Copia en el disco al dia.
echo.
timeout /t 10
