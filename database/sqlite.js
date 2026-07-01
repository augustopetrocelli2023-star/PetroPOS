// Lightweight sqlite adapter prepared for migration from JSON
const path = require('path');
const fs = require('fs');
const repo = require('../repositories/jsonRepository');

const DB_PATH = path.join(repo.DATA_DIR, 'petropos.sqlite');

function ready(){ // placeholder: ensure file exists
  if(!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH,'');
}

// Expose same interface as repo for future migration
module.exports = { ready };
