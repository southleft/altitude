// `<ALTheme>` stories — the scoped theme host, one story per axis.
import type { StoryObj } from '@storybook/react-vite';
import React from 'react';
import { ALTheme, ALButton, ALCard, ALTextBlock } from '../..';

export default {
  title: 'Foundations/Theme',
  component: ALTheme,
  parameters: {
    status: { type: 'beta' },
    // These stories put axis values side by side. The global preset decorator
    // would wrap them in a SECOND `<al-theme>` carrying whatever the toolbar
    // says — which is exactly the ambient value each story below is trying to
    // control for. Opt out; same mechanism the ThemeSwitcher stories use.
    alPreset: { disable: true },
  },
  argTypes: {
    brand: { options: ['altitude', 'southleft'], control: { type: 'radio' } },
    mode: { options: ['light', 'dark'], control: { type: 'radio' } },
    density: { options: ['compact', 'cozy', 'comfortable'], control: { type: 'radio' } },
    contrast: { options: ['normal', 'more'], control: { type: 'radio' } },
    motion: { options: ['full', 'reduced'], control: { type: 'radio' } },
  },
};

/** The sample every axis story renders, so a difference is attributable to the axis alone. */
const Sample = ({ label }: { label: string }) => (
  <ALCard>
    <ALTextBlock>
      <strong>{label}</strong>
    </ALTextBlock>
    <ALButton>Label</ALButton>
    <ALButton variant="secondary">Label</ALButton>
  </ALCard>
);

const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>{children}</div>
);

export const Default: StoryObj<typeof ALTheme> = {
  args: { brand: 'altitude', mode: 'dark' },
  render: (args) => (
    <ALTheme {...args}>
      <Sample label="altitude / dark" />
    </ALTheme>
  ),
};

/**
 * Brand. Two `<al-theme>` subtrees, ONE document, one `:root`, no iframes.
 * Each brand's `:host([brand])` block is generated into the component's own
 * styles, so the two subtrees genuinely compute different tokens side by side.
 * Both are shown in `dark` here to isolate the brand axis from the mode axis.
 */
export const Brand: StoryObj<typeof ALTheme> = {
  render: () => (
    <Row>
      {(['altitude', 'southleft'] as const).map((brand) => (
        <ALTheme key={brand} brand={brand} mode="dark">
          <Sample label={brand} />
        </ALTheme>
      ))}
    </Row>
  ),
};

/** Mode. Each side is a generated `:host([mode])` block — 23 declarations deep, not a two-colour flip. */
export const Mode: StoryObj<typeof ALTheme> = {
  render: () => (
    <Row>
      {(['light', 'dark'] as const).map((mode) => (
        <ALTheme key={mode} brand="altitude" mode={mode}>
          <Sample label={mode} />
        </ALTheme>
      ))}
    </Row>
  ),
};

/**
 * Density. Shrinks `--al-theme-space-{sm,md,lg}` from the base ramp.
 * `comfortable` IS the base ramp — writing it and omitting it are equivalent
 * since the rule that disagreed with the bundle was deleted.
 */
export const Density: StoryObj<typeof ALTheme> = {
  render: () => (
    <Row>
      {(['comfortable', 'cozy', 'compact'] as const).map((density) => (
        <ALTheme key={density} brand="altitude" mode="dark" density={density}>
          <Sample label={density} />
        </ALTheme>
      ))}
    </Row>
  ),
};

/** Contrast. `normal` matches no rule, so only `more` does work. */
export const Contrast: StoryObj<typeof ALTheme> = {
  render: () => (
    <Row>
      {(['normal', 'more'] as const).map((contrast) => (
        <ALTheme key={contrast} brand="altitude" mode="dark" contrast={contrast}>
          <Sample label={contrast} />
        </ALTheme>
      ))}
    </Row>
  ),
};

/**
 * Motion. Absent = follow `prefers-reduced-motion`; `reduced` forces
 * `transition-duration: 0s` inside the subtree; `full` opts back in.
 */
export const Motion: StoryObj<typeof ALTheme> = {
  render: () => (
    <Row>
      {([undefined, 'full', 'reduced'] as const).map((motion) => (
        <ALTheme key={String(motion)} brand="altitude" mode="dark" motion={motion}>
          <Sample label={motion ?? '(unset — follows OS)'} />
        </ALTheme>
      ))}
    </Row>
  ),
};

/**
 * Nesting. The inner theme wins for its own subtree — the whole point of
 * scoping tokens to `:host` instead of `:root`. One page, two brands.
 */
export const Nested: StoryObj<typeof ALTheme> = {
  render: () => (
    <ALTheme brand="southleft" mode="dark">
      <ALCard>
        <ALTextBlock>
          <strong>outer — southleft</strong>
        </ALTextBlock>
        <ALButton>Label</ALButton>
        <ALTheme brand="altitude" mode="dark">
          <Sample label="inner — altitude" />
        </ALTheme>
      </ALCard>
    </ALTheme>
  ),
};
