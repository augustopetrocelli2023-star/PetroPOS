const { downloadArtifact } = require('@electron/get');
const extract = require('extract-zip');
const path = require('path');
const fs = require('fs');

(async ()=>{
  try{
    const version = require('../node_modules/electron/package').version;
    console.log('electron version', version);
    const platform = process.platform;
    const arch = process.arch;
    console.log('platform', platform, 'arch', arch);
    const zipPath = await downloadArtifact({ version, artifactName: 'electron', platform, arch, force: true });
    console.log('downloaded to', zipPath);
    const distDir = path.join(__dirname, '..', 'node_modules', 'electron', 'dist');
    console.log('extract to', distDir);
    await extract(zipPath, { dir: distDir });
    console.log('extracted');
    const platformPath = (platform === 'win32') ? 'electron.exe' : (platform==='darwin'?'Electron.app/Contents/MacOS/Electron':'electron');
    const pathTxt = path.join(__dirname, '..','node_modules','electron','path.txt');
    fs.writeFileSync(pathTxt, platformPath,'utf8');
    console.log('wrote path.txt');
  }catch(err){
    console.error('ERROR', err.stack||err);
    process.exit(1);
  }
})();