cd C:\PetroPOS
npm uninstall electron
npm cache clean --force
npm install electron@31.7.7 --save-dev
[System.IO.File]::WriteAllText("C:\PetroPOS\node_modules\electron\path.txt", "electron.exe")
Write-Host "Si npm start falla por falta de electron.exe, extraer electron-v31.7.7-win32-x64.zip y copiar su contenido en C:\PetroPOS\node_modules\electron\dist"
