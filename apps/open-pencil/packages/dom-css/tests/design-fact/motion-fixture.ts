/** Altitude-shaped motion tokens: legacy durations plus role tokens omitted from `full`. */
const INITIAL = { 'org.altitude.axis': { css: 'initial' } }

function mode(reduced: boolean) {
  const role = (value: string, type: string) => ({
    $value: value,
    $type: type,
    ...(reduced ? {} : { $extensions: INITIAL })
  })
  return {
    theme: {
      animation: {
        duration: {
          '@': { $type: 'duration', $value: reduced ? '0s' : '{animation.duration.2}' },
          role: {
            fast: role(reduced ? '0s' : '{theme.animation.duration.@}', 'duration')
          }
        },
        timing: { role: { standard: role('{theme.animation.timing.@}', 'cubicBezier') } }
      }
    }
  }
}

export const motionTokenFiles = {
  'tier-1/animations.json': {
    animation: {
      duration: { $type: 'duration', 2: { $value: '0.2s' } },
      timing: { $type: 'cubicBezier', base: { $value: [0.15, 0.99, 0.18, 0.99] } }
    }
  },
  'tier-2/animations.json': {
    theme: {
      animation: { timing: { '@': { $type: 'cubicBezier', $value: '{animation.timing.base}' } } }
    }
  },
  'motion/full.json': mode(false),
  'motion/reduced.json': mode(true)
}

export const motionMapping = {
  layers: [{ files: ['tier-1/*.json', 'tier-2/*.json'] }, { files: ['motion/{motion}.json'] }],
  axes: [{ name: 'motion', modes: ['full', 'reduced'], default: 'full' }],
  collections: [
    { name: 'Primitive', files: ['tier-1/**'] },
    { name: 'Semantic', files: ['tier-2/*.json'] },
    { name: 'Motion', axes: ['motion'] }
  ],
  cssVar: { prefix: 'al', dropSegments: ['@'] },
  omitFromCSSWhen: { extension: 'org.altitude.axis', property: 'css', values: ['initial'] }
}
