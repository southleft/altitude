const COL = "Tier 2";
const MODES = ["Default"];
const DATA = "theme/border/radius/@\tFLOAT\t@border/radius/2\ntheme/border/radius/lg\tFLOAT\t@border/radius/4\ntheme/border/radius/md\tFLOAT\t@border/radius/4\ntheme/border/radius/role/action\tFLOAT\t@border/radius/pill\ntheme/border/radius/role/surface\tFLOAT\t@border/radius/4\ntheme/border/radius/sm\tFLOAT\t@border/radius/2\ntheme/border/radius/xs\tFLOAT\t@border/radius/2\ntheme/border/width/@\tFLOAT\t@border/width/2\ntheme/border/width/lg\tFLOAT\t@border/width/4\ntheme/border/width/md\tFLOAT\t@border/width/4\ntheme/icon/@\tFLOAT\t@icon/16\ntheme/icon/lg\tFLOAT\t@icon/24\ntheme/icon/md\tFLOAT\t@icon/20\ntheme/icon/sm\tFLOAT\t@icon/12\ntheme/icon/xl\tFLOAT\t@icon/32\ntheme/icon/xs\tFLOAT\t@icon/8\ntheme/icon/xxl\tFLOAT\t@icon/36\ntheme/icon/xxxl\tFLOAT\t@icon/40\ntheme/layout/height/header\tFLOAT\t80\ntheme/layout/max-width/@\tFLOAT\t@layout/max-width/1260\ntheme/layout/max-width/lg\tFLOAT\t@layout/max-width/1000\ntheme/layout/max-width/md\tFLOAT\t@layout/max-width/800\ntheme/layout/max-width/sm\tFLOAT\t@layout/max-width/600\ntheme/layout/max-width/xs\tFLOAT\t@layout/max-width/320\ntheme/layout/max-width/xxl\tFLOAT\t@layout/max-width/1440\ntheme/layout/width/container\tFLOAT\t@layout/max-width/1260\ntheme/layout/width/sidebar\tFLOAT\t@layout/max-width/320\ntheme/opacity/disabled\tFLOAT\t@opacity/40\ntheme/space/@\tFLOAT\t@space/16\ntheme/space/lg\tFLOAT\t@space/24\ntheme/space/md\tFLOAT\t@space/20\ntheme/space/sm\tFLOAT\t@space/12\ntheme/space/super\tFLOAT\t@space/64\ntheme/space/xl\tFLOAT\t@space/28\ntheme/space/xs\tFLOAT\t@space/8\ntheme/space/xxl\tFLOAT\t@space/32\ntheme/space/xxs\tFLOAT\t@space/4\ntheme/space/xxxl\tFLOAT\t@space/36\ntheme/space/xxxs\tFLOAT\t@space/2";
const EXPECT_KEY = "rdhBS9t89V42E7EfiPjmSa";
if (figma.fileKey && figma.fileKey !== EXPECT_KEY) throw new Error('WRONG FILE: ' + figma.fileKey);
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const col = cols.find((c) => c.name === COL);
if (!col) throw new Error('missing collection ' + COL);
const all = await figma.variables.getLocalVariablesAsync();
const inCol = {}; const anyName = {};
for (const v of all) { anyName[v.name] = v; if (v.variableCollectionId === col.id) inCol[v.name] = v; }
const mid = MODES.map((m) => { const x = col.modes.find((y) => y.name === m); if (!x) throw new Error('no mode ' + m); return x.modeId; });
const hex = (s) => { let t = s.slice(1); if (t.length === 3) t = t.split('').map((c) => c + c).join('');
  const n = (i) => parseInt(t.substr(i, 2), 16) / 255;
  return { r: n(0), g: n(2), b: n(4), a: t.length === 8 ? n(6) : 1 }; };
let created = 0, aliases = 0, literals = 0;
const rows = DATA.split('\n').filter(Boolean).map((l) => l.split(String.fromCharCode(9)));
for (const r of rows) {
  if (!inCol[r[0]]) { inCol[r[0]] = figma.variables.createVariable(r[0], col, r[1]); anyName[r[0]] = inCol[r[0]]; created++; }
}
const missing = [];
for (const r of rows) {
  const v = inCol[r[0]]; const type = r[1];
  const parts = r[2].split(String.fromCharCode(31));
  for (let i = 0; i < mid.length; i++) {
    const raw = parts[i];
    if (raw[0] === '@') {
      const t = anyName[raw.slice(1)];
      if (!t) { missing.push(r[0] + ' -> ' + raw.slice(1)); continue; }
      v.setValueForMode(mid[i], figma.variables.createVariableAlias(t)); aliases++;
    } else if (type === 'COLOR') { v.setValueForMode(mid[i], hex(raw)); literals++; }
    else if (type === 'FLOAT') { v.setValueForMode(mid[i], Number(raw)); literals++; }
    else { v.setValueForMode(mid[i], raw); literals++; }
  }
}
return { collection: COL, rows: rows.length, created, aliases, literals, missingAliasTargets: missing };
