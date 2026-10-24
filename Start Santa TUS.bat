@echo off
rem Start Santa TUS (W1, W3). Double-click this file. Keep the black window open all day.
setlocal
title Santa TUS server
cd /d "%~dp0"

rem W3: started from inside the ZIP file?
echo "%~dp0" | find /i ".zip" >nul
if not errorlevel 1 goto inzip
if not exist "python\python.exe" goto inzip
if not exist "server\server.py" goto broken

echo.
echo   SANTA TUS is starting. Keep this window open (you can minimise it).
echo   Close it only at the end of the day.
echo.
"python\python.exe" "server\server.py" %*
if errorlevel 1 goto failed
goto end

:inzip
echo.
echo   UNZIP THE FOLDER FIRST.
echo.
echo   1. Right-click SantaTUS-Windows.zip and choose "Extract All...".
echo   2. Open the new SantaTUS folder.
echo   3. Double-click "Start Santa TUS" again.
echo.
pause
goto end

:broken
echo.
echo   Some game files are missing. Copy the SantaTUS folder again from the ZIP or the USB stick.
echo.
pause
goto end

:failed
echo.
echo   SANTA TUS STOPPED WITH AN ERROR. Read the lines above, then try again.
echo   If it keeps failing, use the spare laptop: see docs\MARKET-DAY.md, "Move to the spare laptop".
echo.
pause

:end
endlocal
