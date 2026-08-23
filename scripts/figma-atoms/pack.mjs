import { readFileSync, writeFileSync } from 'node:fs';
const s = JSON.parse(readFileSync('.altitude/figma-sync/atoms-figma-spec.json','utf8'));
const packed = s.atoms.map(a => ({
  t: a.tag, n: a.name, ax: a.axisNames,
  c: a.cases.map(c => ({
    v: c.variantName, fl: c.layout.fill ? 1 : 0,
    w: c.size.w, h: c.size.h,
    d: c.layout.dir === 'column' ? 'V' : 'H',
    al: c.layout.align, ju: c.layout.justify,
    f: c.colors.fill && c.colors.fill.kind !== 'none' ? (c.colors.fill.kind === 'var' ? ['v', c.colors.fill.name] : ['l', c.colors.fill.light]) : null,
    s: c.colors.stroke && c.colors.stroke.kind !== 'none' ? (c.colors.stroke.kind === 'var' ? ['v', c.colors.stroke.name] : ['l', c.colors.stroke.light]) : null,
    sw: c.nums.strokeWidth ? c.nums.strokeWidth.value : 0,
    tc: c.text && c.colors.text && c.colors.text.kind !== 'none' ? (c.colors.text.kind === 'var' ? ['v', c.colors.text.name] : ['l', c.colors.text.light]) : null,
    r: c.nums.radius.map(x => x ? (x.kind === 'var' ? ['v', x.name] : ['l', x.value]) : ['l', 0]),
    p: c.nums.padding.map(x => x ? (x.kind === 'var' ? ['v', x.name] : ['l', x.value]) : ['l', 0]),
    g: c.nums.gap ? (c.nums.gap.kind === 'var' ? ['v', c.nums.gap.name] : ['l', c.nums.gap.value]) : ['l', 0],
    o: c.opacity,
    tx: c.text ? { s: c.text.content, ff: c.text.fontFamily, fw: c.text.fontWeight,
                   fs: c.nums.fontSize ? (c.nums.fontSize.kind==='var'?['v',c.nums.fontSize.name]:['l',c.nums.fontSize.value]) : ['l',16],
                   lh: c.nums.lineHeight ? c.nums.lineHeight.value : null,
                   ls: c.text.letterSpacing, td: c.text.decoration } : null
  }))
}));
writeFileSync('.altitude/figma-sync/atoms-packed.json', JSON.stringify(packed));
let tot=0;
for (const a of packed) { const n=JSON.stringify(a).length; tot+=n; console.log(String(n).padStart(6), a.t, a.c.length+' cases'); }
console.log('TOTAL', tot);
