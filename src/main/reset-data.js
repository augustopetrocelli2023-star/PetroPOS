const fs=require('fs'); const path=require('path'); const f=path.join(__dirname,'..','..','data','petropos-data.json'); if(fs.existsSync(f)) fs.unlinkSync(f); console.log('Datos reiniciados.');
