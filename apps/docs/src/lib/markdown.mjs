/**
 * Markdown renderings of the generated pages.
 *
 * Every renderer takes a design-system CONTEXT (`context.mjs` — one project,
 * its scoped registry, its site copy and its href builder) and defaults to the
 * site at the root, so Southleft's Markdown describes Southleft's 21 components
 * under Southleft's name without a second set of renderers existing.
 *
 * Every docs page is also served as Markdown at the same URL plus `.md`
 * (`/docs/components/button` → `/docs/components/button.md`), and the same
 * renderers feed the machine artifacts in `artifacts.mjs` (`llms-full.txt` and
 * `llms-components.txt`). Both read the registry, so the Markdown an
 * agent fetches and the HTML a human reads are the same facts rendered twice —
 * there is no second copy of the content to drift.
 */
import { TOKEN_COUNT, colorRamps, spacingScale, radiusScale, typeScale, brandOverrides } from './tokens.mjs';
import {
  CHOREOGRAPHY_COUNT,
  MOTION_TOKEN_COUNT,
  PRESET_COUNT,
  choreographyTokens,
  durationScale,
  easingCurves,
  motionAxis,
  presetShapes,
  travelDistances,
} from './motion.mjs';
import { DEFAULT_CONTEXT } from './context.mjs';

const table = (headers, rows) =>
  rows.length
    ? [
        `| ${headers.join(' | ')} |`,
        `| ${headers.map(() => '---').join(' | ')} |`,
        ...rows.map((cells) => `| ${cells.map((c) => String(c).replace(/\|/g, '\\|')).join(' | ')} |`),
      ].join('\n')
    : '_None declared in the manifest._';

/** One component, as Markdown. */
export function componentMarkdown(component, context = DEFAULT_CONTEXT) {
  const lines = [
    `# ${component.name}`,
    '',
    `In ${context.site.fullName}, rendered under \`<al-theme brand="${context.project.brand}">\`.`,
    '',
    `\`<${component.tag}>\`${component.react ? ` · React: \`<${component.react}>\`` : ''}${
      component.status ? ` · status: ${component.status}` : ''
    } · tier: ${component.tier}`,
    '',
    component.summary ||
      `Generated from the custom elements manifest: ${component.props.length} properties, ${component.slots.length} slots, ${component.events.length} events.`,
    '',
    '## Install',
    '',
    '```js',
    `import '${component.importPath}';`,
    ...(component.react ? [`import { ${component.react} } from '@southleft/al-react';`] : []),
    '```',
    '',
    '## Properties',
    '',
    table(
      ['Prop', 'Type', 'Default', 'Description'],
      component.props.map((p) => [
        `\`${p.name}\``,
        `\`${p.type}\``,
        `\`${p.default}\``,
        p.description.replace(/\n+/g, ' ') || '—',
      ])
    ),
    '',
    '## Slots',
    '',
    table(
      ['Slot', 'Description'],
      component.slots.map((s) => [`\`${s.name}\``, s.description || '—'])
    ),
    '',
    '## Events',
    '',
    table(
      ['Event', 'Type', 'Description'],
      component.events.map((e) => [`\`${e.name}\``, `\`${e.type}\``, e.description || '—'])
    ),
  ];

  if (component.cssParts.length) {
    lines.push(
      '',
      '## CSS parts',
      '',
      table(
        ['Part', 'Description'],
        component.cssParts.map((p) => [`\`${p.name}\``, p.description || '—'])
      )
    );
  }
  if (component.cssProperties.length) {
    lines.push(
      '',
      '## CSS custom properties',
      '',
      table(
        ['Property', 'Default', 'Description'],
        component.cssProperties.map((p) => [`\`${p.name}\``, `\`${p.default}\``, p.description || '—'])
      )
    );
  }
  if (component.methods.length) {
    lines.push(
      '',
      '## Public methods',
      '',
      table(
        ['Method', 'Description'],
        component.methods.map((m) => [`\`${m.name}()\``, m.description || '—'])
      )
    );
  }

  lines.push('', `Source: \`libs/al-web-components/${component.modulePath}\``, '');
  return lines.join('\n');
}

/** The Overview page, as Markdown. */
export function overviewMarkdown(context = DEFAULT_CONTEXT) {
  const { site, registry, project } = context;
  return [
    `# ${site.title}`,
    '',
    site.description,
    '',
    '## By the numbers',
    '',
    `- Components documented: ${registry.count}${
      registry.scope.scoped
        ? " (this design system's declared scope; the shared library declares more)"
        : ''
    }`,
    `- Icon glyphs: ${registry.stats.icons}`,
    `- Custom elements in the manifest: ${registry.stats.cemTags}`,
    `- Documented properties: ${registry.stats.documentedProps} of ${registry.stats.totalProps}`,
    `- Components with a React wrapper: ${registry.stats.withReact}`,
    `- Design tokens: ${TOKEN_COUNT}`,
    `- Brand: \`<al-theme brand="${project.brand}">\``,
    '',
    '## Taxonomy',
    '',
    ...registry.tiers.map((tier) => `- ${tier.label}: ${tier.count}`),
    '',
  ].join('\n');
}

/** The Components index, as Markdown. */
export function componentsIndexMarkdown(context = DEFAULT_CONTEXT) {
  const { site, registry } = context;
  return [
    `# Components (${registry.count})`,
    '',
    'Generated from `libs/al-web-components/custom-elements.json`' +
      (registry.scope.scoped
        ? ", scoped to this design system's `library.components` allowlist in `.altitude/ds-projects.json`."
        : '.'),
    '',
    ...registry.tiers.flatMap((tier) => [
      `## ${tier.label} (${tier.count})`,
      '',
      table(
        ['Component', 'Tag', 'React', 'Props', 'Slots', 'Events'],
        tier.components.map((c) => [
          `[${c.name}](${site.url}/components/${c.slug})`,
          `\`<${c.tag}>\``,
          c.react ? `\`<${c.react}>\`` : '—',
          c.props.length,
          c.slots.length,
          c.events.length,
        ])
      ),
      '',
    ]),
  ].join('\n');
}

/** The Foundations page, as Markdown. */
export function foundationsMarkdown(context = DEFAULT_CONTEXT) {
  const ramps = colorRamps();
  const overrides = brandOverrides(context.project.brand);
  return [
    '# Foundations',
    '',
    `Read at build time from the published token layer — ${TOKEN_COUNT} tokens.`,
    '',
    `## Brand — \`${context.project.brand}\``,
    '',
    overrides.available
      ? overrides.properties.length
        ? `This brand redeclares ${overrides.properties.length} of those properties inside ` +
          `\`<al-theme brand="${context.project.brand}">\`; everything else resolves to the base bundle.`
        : overrides.reason
      : overrides.reason,
    '',
    ...(overrides.properties.length
      ? [
          table(
            ['Property', 'Brand value', 'Base value'],
            overrides.properties.map((p) => [`\`${p.name}\``, p.value, p.base ?? '—'])
          ),
          '',
        ]
      : []),
    `## Color (${ramps.length} ramps)`,
    '',
    ...ramps.flatMap((ramp) => [
      `### ${ramp.label} — \`${ramp.prefix}\``,
      '',
      table(
        ['Step', 'Value', 'Token'],
        ramp.steps.map((s) => [s.name, s.value, `\`--${s.key}\``])
      ),
      '',
    ]),
    '## Typography',
    '',
    table(
      ['Preset', 'Value'],
      typeScale().map((t) => [`\`--${t.key}\``, t.value])
    ),
    '',
    '## Spacing',
    '',
    table(
      ['Step', 'Value', 'Token'],
      spacingScale().map((s) => [s.name, s.value, `\`--${s.key}\``])
    ),
    '',
    '## Radius',
    '',
    table(
      ['Step', 'Value', 'Token'],
      radiusScale().map((r) => [r.name, r.value, `\`--${r.key}\``])
    ),
    '',
  ].join('\n');
}

/**
 * The Motion page, as Markdown.
 *
 * Same three sources as the HTML page (`lib/motion.mjs`): the built token layer
 * for tier 1, `components/theme/theme.scss` for the axis matrix, and the
 * published motion runtime for the choreography tokens and keyframe presets.
 * The two renderings cannot drift because neither holds any motion data of its
 * own.
 */
export function motionMarkdown(context = DEFAULT_CONTEXT) {
  const axis = motionAxis();
  const tokens = choreographyTokens();
  const presets = presetShapes();
  const columns = axis.values.map((value) => value.label);

  return [
    '# Motion',
    '',
    `How ${context.site.fullName} moves, under \`<al-theme brand="${context.project.brand}">\`. ` +
      `${MOTION_TOKEN_COUNT} motion tokens, ${CHOREOGRAPHY_COUNT} choreography tokens, ` +
      `${PRESET_COUNT} keyframe presets — read from the token layer, the theme stylesheet and the ` +
      'published runtime, never transcribed.',
    '',
    '## The three tiers',
    '',
    '- **Tier 1** — raw values: `--al-animation-{duration,timing,distance}-*`. Pure CSS.',
    '- **Tier 2** — theme roles: `--al-theme-animation-{duration,timing}-role-*`, repointed by the',
    '  `<al-theme motion>` axis. This is the layer a component reads. Pure CSS.',
    '- **Tier 3** — choreography: multi-element, multi-phase sequences run from JS',
    '  (`@southleft/al-web-components/motion`). Use it only when more than one element has to move',
    '  in a coordinated way.',
    '',
    '## Tier 1 — duration',
    '',
    table(
      ['Step', 'Value', 'Token'],
      durationScale().map((step) => [step.name, step.value, `\`--${step.key}\``])
    ),
    '',
    '## Tier 1 — easing',
    '',
    table(
      ['Curve', 'Value', 'Token'],
      easingCurves().map((curve) => [
        curve.name + (curve.overshoots ? ' (overshoots)' : ''),
        curve.value,
        `\`--${curve.key}\``,
      ])
    ),
    '',
    '## Tier 1 — travel distance',
    '',
    table(
      ['Step', 'Value', 'Token'],
      travelDistances().map((step) => [step.name, step.value, `\`--${step.key}\``])
    ),
    '',
    '## Tier 2 — the `motion` axis',
    '',
    'Set `motion` on `<al-theme>`: `full`, `reduced` or `expressive`. Unset means "no opinion" —',
    'the only state that lets `prefers-reduced-motion` decide, which is why it is the default.',
    '',
    '`default` below is the unset axis. The role tokens have NO `:root` default by design, so they',
    'are genuinely absent there and a component’s `var(--role, var(--legacy))` takes its fallback.',
    '`initial` means the same thing: it computes to the guaranteed-invalid value, so the fallback wins.',
    '',
    axis.available
      ? table(
          ['Property', 'default', ...columns],
          axis.properties.map((property) => [
            `\`${property.name}\``,
            property.base ?? '_absent — fallback wins_',
            ...property.cells.map((cell) => (cell ? cell.value : '—')),
          ])
        )
      : `_${axis.reason}_`,
    '',
    "`OS reduce` is the media-query rule `@media (prefers-reduced-motion: reduce) { :host(:not([motion='full'])) }`,",
    'not a value you can set. It is declared last so it beats `expressive` at equal specificity: a',
    'decorative choice never overrides the OS preference, and only an explicit `motion="full"` opts back in.',
    '',
    '## Tier 2 — in CSS',
    '',
    'Simple state transitions never need the runtime.',
    '',
    '```scss',
    "@use '@southleft/al-web-components/styles/core/mixins/motion' as motion;",
    '',
    '.al-c-thing { @include motion.al-motion-transition(background-color border-color, fast); }',
    '.al-c-panel { @include motion.al-motion-transition(height, slow, emphasized); }',
    '```',
    '',
    'It is a mixin and not a `--al-theme-animation-use-*` token on purpose: a custom property’s',
    '`var()` chain resolves ONCE, at the element that declares it. A use-case token declared on',
    '`:root` would bake in `:root`’s durations and go blind to every `<al-theme motion>` below it.',
    'A mixin expands at the call site, where the governing theme’s values are in scope.',
    '',
    `## Tier 3 — choreography (${CHOREOGRAPHY_COUNT} tokens)`,
    '',
    'Entrances end `-enter`, exits `-exit`; discrete list sequences use `-reveal` / `-dismiss`.',
    '',
    table(
      ['Token', 'Pattern', 'Keyframes', 'Offset', 'Direction', 'Max'],
      tokens.map((token) => [
        `\`${token.name}\``,
        token.pattern,
        token.keyframes
          ? `\`${token.keyframes}\``
          : token.tracks
            ? token.tracks.map((track) => `\`${track.keyframes}\``).join(' + ')
            : '—',
        token.offset ?? '—',
        token.direction ?? '—',
        token.max ?? '—',
      ])
    ),
    '',
    '```js',
    "import { run, animatePreset } from '@southleft/al-web-components/motion';",
    '',
    "await run('modal-exit', dialogEl);   // never rejects; no-ops on the server",
    "await animatePreset(cardEl, 'blur-up', { delay: '80ms' });",
    '```',
    '',
    'From a Lit component prefer the reactive controller — it scopes to your host, owns its',
    '`IntersectionObserver` and disconnects it in `hostDisconnected()`:',
    '',
    '```ts',
    "import { MotionController } from '@southleft/al-web-components/controllers/motion';",
    '',
    'protected motion = new MotionController(this);',
    "this.motion.reveal(this.renderRoot.querySelector('.grid'), 'grid-reveal');",
    '```',
    '',
    `## Tier 3 — keyframe presets (${PRESET_COUNT})`,
    '',
    'Named shapes, independent of timing — the vocabulary the choreography tokens compose.',
    '',
    table(
      ['Preset', 'Animates', 'Frames'],
      presets.map((preset) => [
        `\`${preset.name}\``,
        preset.properties.map((property) => `\`${property}\``).join(', '),
        preset.multiFrame ? `${preset.frames} (overshoot)` : '2',
      ])
    ),
    '',
    '## Reduced motion',
    '',
    'There are two authorities and they do not always agree: the `<al-theme motion>` axis, and the',
    'OS `prefers-reduced-motion` query. The axis only zeroes tokens on `:host`, so content that is',
    'not wrapped in an `<al-theme>` gets no treatment from the token layer at all; deciding from the',
    'OS query alone would ignore an explicit `motion="full"` opt-in.',
    '',
    '`isReducedMotion(el, cache)` therefore reads the TOKENS at the element first — which encodes',
    'the whole `theme.scss` cascade without duplicating a selector in JS — and falls back to the raw',
    'OS query only for content no theme governs. A zeroed token is authoritative; a non-zero token is',
    'not read as "motion is fine", because an unthemed element resolves to the un-zeroed `:root`',
    'default whatever the reader asked their OS for.',
    '',
    '```js',
    "import { createCache, isReducedMotion } from '@southleft/al-web-components/motion';",
    '',
    'if (isReducedMotion(el, createCache())) {',
    '  el.replaceChildren(nextView);   // jump straight to the end state',
    '} else {',
    "  await run('list-reveal', el);",
    '}',
    '```',
    '',
  ].join('\n');
}
