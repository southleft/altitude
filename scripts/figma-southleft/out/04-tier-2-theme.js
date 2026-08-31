const COL = "Tier 2 Theme";
const MODES = ["Light","Dark"];
const DATA = "theme/color/background/danger-default\tCOLOR\t@color/brand/red/500\u001f@color/brand/red/500\ntheme/color/background/danger-strong\tCOLOR\t@color/brand/red/400\u001f@color/brand/red/400\ntheme/color/background/default\tCOLOR\t@color/neutral/paper/0\u001f@color/neutral/ink/800\ntheme/color/background/default-strong\tCOLOR\t@color/neutral/paper/200\u001f@color/neutral/ink/700\ntheme/color/background/default-stronger\tCOLOR\t@color/neutral/paper/300\u001f@color/neutral/ink/600\ntheme/color/background/default-weak\tCOLOR\t@color/neutral/paper/100\u001f@color/neutral/ink/900\ntheme/color/background/disabled-default\tCOLOR\t@color/neutral/dark/200\u001f@color/neutral/dark/200\ntheme/color/background/info-default\tCOLOR\t@color/brand/blue/500\u001f@color/brand/blue/500\ntheme/color/background/inverse-default\tCOLOR\t@color/neutral/dark/900\u001f@color/neutral/light/100\ntheme/color/background/inverse-strong\tCOLOR\t@color/neutral/dark/800\u001f@color/neutral/light/100\ntheme/color/background/primary-default\tCOLOR\t@color/brand/red/500\u001f@color/brand/red/500\ntheme/color/background/primary-strong\tCOLOR\t@color/brand/red/400\u001f@color/brand/red/400\ntheme/color/background/secondary-default\tCOLOR\t@color/brand/taupe/500\u001f@color/brand/taupe/500\ntheme/color/background/secondary-strong\tCOLOR\t@color/brand/taupe/400\u001f@color/brand/taupe/400\ntheme/color/background/success-default\tCOLOR\t@color/brand/green/400\u001f@color/brand/green/500\ntheme/color/background/transparent-default\tCOLOR\t@color/transparent/dark/0\u001f@color/transparent/dark/0\ntheme/color/background/transparent-strong\tCOLOR\t@color/transparent/dark/60\u001f@color/transparent/dark/80\ntheme/color/background/transparent-weak\tCOLOR\t@color/transparent/light/10\u001f@color/transparent/light/10\ntheme/color/background/warning-default\tCOLOR\t@color/brand/orange/500\u001f@color/brand/orange/500\ntheme/color/body/background\tCOLOR\t@theme/color/background/default-weak\u001f@theme/color/background/default-weak\ntheme/color/border/danger-default\tCOLOR\t@color/brand/red/500\u001f@color/brand/red/500\ntheme/color/border/default\tCOLOR\t@color/neutral/paper/300\u001f@color/neutral/ink/600\ntheme/color/border/default-strong\tCOLOR\t@color/neutral/ink/600\u001f@color/neutral/paper/400\ntheme/color/border/default-weak\tCOLOR\t@color/neutral/paper/300\u001f@color/neutral/ink/600\ntheme/color/border/disabled-default\tCOLOR\t@color/neutral/dark/200\u001f@color/neutral/dark/200\ntheme/color/border/inverse-default\tCOLOR\t@color/neutral/dark/100\u001f@color/neutral/dark/300\ntheme/color/border/primary-default\tCOLOR\t@color/brand/red/500\u001f@color/brand/red/500\ntheme/color/border/secondary-default\tCOLOR\t@color/brand/taupe/500\u001f@color/brand/taupe/500\ntheme/color/content/danger-default\tCOLOR\t@color/brand/red/500\u001f@color/brand/red/500\ntheme/color/content/danger-weak\tCOLOR\t@color/brand/red/900\u001f@color/brand/red/900\ntheme/color/content/default\tCOLOR\t@color/neutral/ink/900\u001f@color/neutral/paper/50\ntheme/color/content/default-weak\tCOLOR\t@color/neutral/paper/600\u001f@color/neutral/paper/400\ntheme/color/content/disabled-default\tCOLOR\t@color/neutral/dark/400\u001f@color/neutral/dark/400\ntheme/color/content/info-default\tCOLOR\t@color/brand/blue/500\u001f@color/brand/blue/500\ntheme/color/content/info-weak\tCOLOR\t@color/brand/blue/900\u001f@color/brand/blue/900\ntheme/color/content/inverse-default\tCOLOR\t@color/neutral/light/100\u001f@color/neutral/dark/800\ntheme/color/content/inverse-strong\tCOLOR\t@color/neutral/light/200\u001f@color/neutral/dark/700\ntheme/color/content/primary-default\tCOLOR\t@color/brand/red/500\u001f@color/brand/red/500\ntheme/color/content/primary-strong\tCOLOR\t@color/brand/red/400\u001f@color/brand/red/400\ntheme/color/content/primary-weak\tCOLOR\t@color/brand/red/900\u001f@color/brand/red/900\ntheme/color/content/secondary-default\tCOLOR\t@color/brand/taupe/500\u001f@color/brand/taupe/500\ntheme/color/content/secondary-strong\tCOLOR\t@color/brand/taupe/400\u001f@color/brand/taupe/400\ntheme/color/content/secondary-weak\tCOLOR\t@color/brand/taupe/900\u001f@color/brand/taupe/900\ntheme/color/content/success-default\tCOLOR\t@color/brand/green/500\u001f@color/brand/green/500\ntheme/color/content/success-weak\tCOLOR\t@color/brand/green/900\u001f@color/brand/green/900\ntheme/color/content/warning-default\tCOLOR\t@color/brand/orange/500\u001f@color/brand/orange/500\ntheme/color/content/warning-weak\tCOLOR\t@color/brand/orange/900\u001f@color/brand/orange/900\ntheme/color/header/background\tCOLOR\t@theme/color/background/default-strong\u001f@theme/color/background/default\ntheme/color/shadow/default\tCOLOR\t@color/shadow/light\u001f@color/shadow/dark";
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
