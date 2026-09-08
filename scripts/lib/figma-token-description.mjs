/** Carry authored usage guidance into Figma without inventing token semantics. */
export function figmaTokenDescription(path, leaf) {
  const ext = leaf.$extensions ?? {};
  const parts = [leaf.$description, ext['org.primer.llm']?.usage];
  const css = ext['com.salesforce.styling']?.cssProperties;
  if (css?.length) parts.push(`CSS properties: ${css.join(', ')}.`);
  if (/^(theme\.)?animation\.duration\./.test(path)) {
    parts.push('Figma value is milliseconds. Reference metadata; prototype durations cannot bind this variable.');
  }
  if (/^(theme\.)?animation\.timing\./.test(path)) {
    parts.push('CSS easing curve stored verbatim. Reference metadata; prototype easing cannot bind this variable.');
  }
  return [...new Set(parts.filter(Boolean))].join('\n');
}
