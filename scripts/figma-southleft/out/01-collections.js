const EXPECT_KEY = "rdhBS9t89V42E7EfiPjmSa";
if (figma.fileKey && figma.fileKey !== EXPECT_KEY) throw new Error('WRONG FILE: ' + figma.fileKey);
const want = [{"name":"Tier 1","modes":["Default"]},{"name":"Tier 2","modes":["Default"]},{"name":"Tier 2 Theme","modes":["Light","Dark"]},{"name":"Tier 2 Brand","modes":["Southleft"]}];
const existing = await figma.variables.getLocalVariableCollectionsAsync();
const out = [];
for (const w of want) {
  let c = existing.find((x) => x.name === w.name);
  if (!c) { c = figma.variables.createVariableCollection(w.name); }
  c.renameMode(c.modes[0].modeId, w.modes[0]);
  for (const m of w.modes.slice(1)) if (!c.modes.some((x) => x.name === m)) c.addMode(m);
  out.push({ name: c.name, id: c.id, modes: c.modes.map((m) => m.name) });
}
return out;
