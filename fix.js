const fs = require('fs');
let content = fs.readFileSync('app/admin/state-map/page.tsx');
let str = content.toString('latin1'); // read as latin1
str = str.replace(/ï¿½/g, ''); // Try removing standard replacement chars
str = str.replace(/[^\x00-\x7F]/g, ''); // remove non-ascii
fs.writeFileSync('app/admin/state-map/page.tsx', str, 'utf-8');
