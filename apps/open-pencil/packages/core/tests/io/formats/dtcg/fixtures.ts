/** A three-axis token tree: mode × brand × density, plus shared primitives. */
export function themedTokenFiles(): Record<string, unknown> {
  return {
    'base/primitives.json': {
      color: {
        $type: 'color',
        blue: { 500: { $value: '#0000ff' } },
        red: { 500: { $value: '#ff0000' } }
      },
      space: { $type: 'dimension', sm: { $value: '4px' }, md: { $value: '0.5rem' } },
      motion: { $type: 'duration', fast: { $value: '100ms' } }
    },
    'theme/light/colors.json': {
      theme: {
        color: {
          $type: 'color',
          bg: { $value: '#ffffff', $description: 'Page background' },
          accent: { $value: '{brand.accent}' }
        }
      }
    },
    'theme/dark/colors.json': {
      theme: {
        color: {
          $type: 'color',
          bg: { $value: '#000000', $description: 'Page background' },
          accent: { $value: '{brand.accent}' }
        }
      }
    },
    'brand/a.json': { brand: { accent: { $type: 'color', $value: '{color.blue.500}' } } },
    'brand/b.json': {
      brand: {
        accent: { $type: 'color', $value: '{color.red.500}' },
        only: { $type: 'dimension', $value: '2px' }
      }
    },
    'density/comfortable.json': { density: { gap: { $type: 'dimension', $value: '8px' } } },
    'density/compact.json': { density: { gap: { $type: 'dimension', $value: '4px' } } }
  }
}

export const themedMapping = {
  name: 'fixture',
  layers: [
    { files: ['base/*.json'] },
    { files: ['theme/{mode}/*.json'] },
    { files: ['brand/{brand}.json'] },
    { files: ['density/{density}.json'] }
  ],
  axes: [
    { name: 'mode', modes: ['light', 'dark'] },
    { name: 'brand', modes: [{ name: 'a', label: 'Brand A' }, { name: 'b', label: 'Brand B' }] },
    { name: 'density', modes: ['comfortable', 'compact'] }
  ],
  collections: [
    { name: 'Primitives', files: ['base/**'] },
    { name: 'Theme', axes: ['mode'] },
    { name: 'Brand', axes: ['brand'] },
    { name: 'Density', axes: ['density'] }
  ],
  cssVar: { prefix: 'ds' }
}
