/**
 * Showcase personas — one "site" per brand.
 *
 * The showcase home page (`showcase-home.ts`) renders whichever persona
 * matches the active `<al-theme brand>`. Tokens carry the skin (type,
 * color, radius, shadow, spacing); the persona carries the *structure* —
 * hero layout, section order, imagery treatment, and copy — so a theme
 * switch reads as landing on a different company's website, not a recolor.
 *
 * Spec: 2026-08-17-themed-example-home-pages.
 */

export interface PersonaStat {
  value: string;
  label: string;
}

export interface PersonaFeature {
  /** Icon element suffix, e.g. 'settings' → al-icon-settings. */
  icon: string;
  title: string;
  text: string;
}

export interface PersonaCase {
  index: string;
  title: string;
  text: string;
  tags?: string[];
}

export interface PersonaFaq {
  q: string;
  a: string;
}

export interface PersonaMarket {
  symbol: string;
  name: string;
  value: string;
  delta: string;
  deltaVariant: 'success' | 'danger';
}

export type PersonaSection =
  | { kind: 'logos'; title?: string; names: string[] }
  | {
      kind: 'features';
      eyebrow?: string;
      title: string;
      sub?: string;
      centered?: boolean;
      items: PersonaFeature[];
    }
  | { kind: 'stats'; title?: string; items: PersonaStat[] }
  | { kind: 'cases'; eyebrow?: string; title: string; items: PersonaCase[] }
  | { kind: 'faq'; eyebrow?: string; title: string; items: PersonaFaq[] }
  | { kind: 'markets'; eyebrow?: string; title: string; items: PersonaMarket[] }
  | { kind: 'testimonial'; quote: string; name: string; role: string }
  | { kind: 'cta'; title: string; sub?: string; button: string; secondary?: string };

export type PersonaMedia =
  | 'app-card'
  | 'ops-card'
  | 'terminal'
  | 'grid-art'
  | 'glow-art'
  | 'poster-type'
  | 'editorial-art';

export interface Persona {
  /** `<al-theme brand>` value this persona answers to. */
  brand: string;
  /** Site wordmark text. */
  site: string;
  /** Small mark rendered before the wordmark. */
  glyph: string;
  /** Uppercase the wordmark + nav (brutalist personas). */
  loud?: boolean;
  nav: string[];
  navCta: string;
  hero: {
    layout?: 'centered' | 'stacked' | 'poster';
    mediaPosition?: 'start';
    eyebrow?: string;
    title: string;
    sub: string;
    primaryCta: string;
    secondaryCta?: string;
    media: PersonaMedia;
    stats?: PersonaStat[];
  };
  sections: PersonaSection[];
  footer: {
    blurb: string;
    columns: { title: string; links: string[] }[];
    fine: string;
  };
}

export const PERSONAS: Record<string, Persona> = {
  /* ------------------------------------------------------------------ *
   * ALTITUDE — the design system's own site. Neutral reference.
   * ------------------------------------------------------------------ */
  altitude: {
    brand: 'altitude',
    site: 'Altitude',
    glyph: '▲',
    nav: ['Components', 'Tokens', 'Patterns', 'Docs'],
    navCta: 'Get started',
    hero: {
      eyebrow: 'Design system',
      title: 'One system. Any altitude.',
      sub: 'Sixty-five components, three token tiers, and a theming engine that turns the same page into a different site. You are looking at the neutral brand right now — try the switcher.',
      primaryCta: 'Browse components',
      secondaryCta: 'Read the docs',
      media: 'app-card',
      stats: [
        { value: '65+', label: 'Components' },
        { value: '3', label: 'Token tiers' },
        { value: '8', label: 'Brands on this page' }
      ]
    },
    sections: [
      {
        kind: 'features',
        eyebrow: 'Why Altitude',
        title: 'Built to be rebranded',
        sub: 'Every visual decision routes through a token, so a brand is a data change — not a fork.',
        centered: true,
        items: [
          { icon: 'layout-masonry', title: 'Composable', text: 'Slot-based components that assemble into full pages without custom CSS.' },
          { icon: 'settings', title: 'Token-driven', text: 'Type, color, radius, shadow, and spacing all resolve from the active theme.' },
          { icon: 'success', title: 'Accessible', text: 'Keyboard, focus, and contrast behavior ship inside the components.' }
        ]
      },
      {
        kind: 'cta',
        title: 'Switch the theme. Watch this page become another site.',
        sub: 'Same components, same markup — different tokens and layout variants.',
        button: 'Try the switcher'
      }
    ],
    footer: {
      blurb: 'Altitude is the design system powering every site in this demo.',
      columns: [
        { title: 'Library', links: ['Components', 'Tokens', 'Icons', 'Changelog'] },
        { title: 'Guides', links: ['Theming', 'Migration', 'SSR', 'Registry'] },
        { title: 'Community', links: ['GitHub', 'Storybook', 'ZeroHeight'] }
      ],
      fine: '© 2026 Southleft · Built with Altitude'
    }
  },

  /* ------------------------------------------------------------------ *
   * MERIDIAN — cobalt brutalist web engineering studio.
   * ------------------------------------------------------------------ */
  meridian: {
    brand: 'meridian',
    site: 'MERIDIAN.DEV',
    glyph: '◼',
    loud: true,
    nav: ['Works', 'About', 'Product', 'FAQ'],
    navCta: 'Contact',
    hero: {
      layout: 'stacked',
      eyebrow: 'Performance first',
      title: 'WEBSITES ENGINEERED, NOT DECORATED',
      sub: 'We strip away the fluff to build high-speed digital architectures that command attention and deliver seamless user experiences through raw technical precision.',
      primaryCta: 'DEPLOY PROJECT',
      secondaryCta: 'SCALABLE STACK',
      media: 'grid-art',
      stats: [
        { value: '01', label: 'Blueprint' },
        { value: '02', label: 'Clean execution' },
        { value: '03', label: 'Stress testing' }
      ]
    },
    sections: [
      {
        kind: 'cases',
        eyebrow: 'Proven architectures',
        title: 'SELECTED WORKS',
        items: [
          { index: '01', title: 'Digital Power Assets', text: 'High-converting landing systems that blend minimalist aesthetics with strong architecture.', tags: ['PORTFOLIO', 'LANDING'] },
          { index: '02', title: 'Logic-Driven Commerce', text: 'Storefronts engineered from blueprint to deployment with zero guesswork.', tags: ['COMMERCE'] },
          { index: '03', title: 'Precision Platforms', text: 'Operational dashboards that dominate the digital landscape with raw technical edge.', tags: ['PLATFORM', 'SAAS'] }
        ]
      },
      {
        kind: 'stats',
        items: [
          { value: '120+', label: 'Projects shipped' },
          { value: '0.4s', label: 'Median LCP' },
          { value: '100', label: 'Lighthouse, repeatedly' }
        ]
      },
      {
        kind: 'cta',
        title: 'READY TO LAUNCH YOUR WEBSITE?*',
        sub: '*Our process eliminates guesswork. Every project is delivered with precision.',
        button: "LET'S WORK"
      }
    ],
    footer: {
      blurb: 'Meridian is a web engineering studio. We build digital power assets.',
      columns: [
        { title: 'Studio', links: ['Works', 'Process', 'Stack', 'Careers'] },
        { title: 'Social', links: ['Instagram', 'LinkedIn', 'Dribbble'] },
        { title: 'Contact', links: ['hello@meridian.dev', '+1 807 405 331'] }
      ],
      fine: '© 2026 MERIDIAN.DEV — ENGINEERED WITH ALTITUDE'
    }
  },

  /* ------------------------------------------------------------------ *
   * VOLTAGE — black + acid hardware product site.
   * ------------------------------------------------------------------ */
  voltage: {
    brand: 'voltage',
    site: 'VOLTAGE™',
    glyph: '⚡',
    loud: true,
    nav: ['Main', 'Glass catalog', 'Technology'],
    navCta: 'Buy',
    hero: {
      layout: 'poster',
      eyebrow: 'European most popular & best',
      title: 'THIN POWER SHIELD',
      sub: 'Pure sapphire, 99.99%. Special laser-cutting machines perfect every VOLTAGE panel — one of its kind for phone, tablet, and beyond.',
      primaryCta: 'BUY',
      secondaryCta: 'WHOLESALE',
      media: 'poster-type',
      stats: [
        { value: '39kJ', label: 'Impact endurance' },
        { value: '87.1%', label: 'Fewer ruin incidents' },
        { value: '99.99%', label: 'Pure sapphire' }
      ]
    },
    sections: [
      {
        kind: 'faq',
        eyebrow: 'Introduction',
        title: 'NON-HYPE SAPPHIRE',
        items: [
          { q: '//1 — Sapphire mineral', a: 'Second only to diamond in hardness. Our panels are grown, not coated, so the protection is the material itself — not a film that wears off.' },
          { q: '//2 — Laser cutting technology', a: 'Machine work at micron tolerance. Every edge is chamfered by the same rig that cuts optical instruments.' },
          { q: '//3 — Mark IV process', a: 'Engineering and process, fused: blueprint, cut, polish, stress-test. Each unit ships with its own test log.' },
          { q: '//4 — Design & overview', a: 'True mastery cannot be programmed. The Squid Game of glass: only the flawless panels survive the line.' }
        ]
      },
      {
        kind: 'cta',
        title: 'TRUE MASTERY CAN’T BE PROGRAMMED',
        sub: 'Ready for partnership — telegram / steam / youtube.',
        button: 'SEE MORE'
      }
    ],
    footer: {
      blurb: 'VOLTAGE builds sapphire armor for the devices you refuse to baby.',
      columns: [
        { title: 'Catalog', links: ['Mark I', 'Mark II', 'Mark IV', 'Mark V'] },
        { title: 'Technology', links: ['Mineral', 'Laser cutting', 'Stress testing'] },
        { title: 'Orders', links: ['Shop', 'Wholesale', 'Track order'] }
      ],
      fine: '© 2026 VOLTAGE™ — CUT WITH ALTITUDE'
    }
  },

  /* ------------------------------------------------------------------ *
   * SOLSTICE — warm, friendly productivity SaaS.
   * ------------------------------------------------------------------ */
  solstice: {
    brand: 'solstice',
    site: 'Solstice',
    glyph: '❋',
    nav: ['Home', 'Solutions', 'Technology', 'About', 'Support'],
    navCta: 'Try it free',
    hero: {
      layout: 'centered',
      eyebrow: 'Built for modern teams',
      title: 'Work smarter, every single day',
      sub: 'Plan tasks, collaborate with your team, and track progress — all in one simple, warm, genuinely pleasant workspace.',
      primaryCta: 'Start your free trial',
      secondaryCta: 'Book a demo',
      media: 'app-card',
      stats: [
        { value: '95K+', label: 'People on board' },
        { value: '4.9/5', label: 'Best on the market' },
        { value: '99.9%', label: 'Platform uptime' }
      ]
    },
    sections: [
      {
        kind: 'logos',
        title: 'Trusted by thousands of companies worldwide',
        names: ['gusto', 'hopin', 'HubSpot', 'databricks', 'Medium']
      },
      {
        kind: 'features',
        eyebrow: 'Features',
        title: 'The complete toolkit for productive teams',
        sub: 'Everything you need to plan, collaborate, and keep every project moving forward.',
        centered: true,
        items: [
          { icon: 'check', title: 'Effortless task assign', text: 'Set clear deadlines and priorities so your team knows what to do and when.' },
          { icon: 'user', title: 'Real-time collaboration', text: 'Chat, assign, and update tasks instantly to keep your team productive.' },
          { icon: 'clock', title: 'Smart time scheduling', text: 'Manually set start and end times, or quickly confirm durations with presets.' }
        ]
      },
      {
        kind: 'testimonial',
        quote: 'We’ve all been there — juggling ten tabs, forgetting deadlines, losing track of who’s doing what. Solstice is the tool we wished we had: simple, smart, and built for real teams.',
        name: 'Emily Johnson',
        role: 'Head of Operations, Filko'
      },
      {
        kind: 'cta',
        title: 'The numbers behind our success are people',
        sub: 'Join 50K+ teams in 120 countries shipping 750K+ projects.',
        button: 'Start free — no card needed'
      }
    ],
    footer: {
      blurb: 'Solstice keeps your team focused, aligned, and out of meeting purgatory.',
      columns: [
        { title: 'Product', links: ['Features', 'Integrations', 'Pricing', 'Changelog'] },
        { title: 'Company', links: ['About', 'Customers', 'Careers', 'Press'] },
        { title: 'Resources', links: ['Help center', 'API docs', 'Community'] }
      ],
      fine: '© 2026 Solstice Inc. · Warmed up with Altitude'
    }
  },

  /* ------------------------------------------------------------------ *
   * NOCTURNE — deep-violet proactive market maker.
   * ------------------------------------------------------------------ */
  nocturne: {
    brand: 'nocturne',
    site: 'NOCTURNE',
    glyph: '◗',
    nav: ['Product', 'Community', 'Company', 'Docs', 'Media'],
    navCta: 'Start free trial',
    hero: {
      layout: 'centered',
      eyebrow: '✦ Welcome to Nocturne',
      title: 'Proactive market maker',
      sub: 'Concentrated liquidity, glowing quietly in the dark. Launch the app and let the algorithm hold the spread while you sleep.',
      primaryCta: 'Launch app',
      secondaryCta: 'Start free trial',
      media: 'glow-art'
    },
    sections: [
      {
        kind: 'markets',
        eyebrow: 'Dashboard',
        title: 'Ethereum market',
        items: [
          { symbol: 'BTC-USD', name: 'Bitcoin USD', value: '45,052.21', delta: '+2.4%', deltaVariant: 'success' },
          { symbol: 'USDT-USD', name: 'Tether USD', value: '1,987.92', delta: '+0.1%', deltaVariant: 'success' },
          { symbol: 'MFT-USD', name: 'Hifi Finance USD', value: '35,938.29', delta: '−1.2%', deltaVariant: 'danger' },
          { symbol: 'GUSD-USD', name: 'Gemini Dollar USD', value: '87,052.41', delta: '+4.8%', deltaVariant: 'success' }
        ]
      },
      {
        kind: 'features',
        eyebrow: 'Why Nocturne',
        title: 'Liquidity that anticipates',
        centered: true,
        items: [
          { icon: 'star', title: 'Concentrated pools', text: 'Capital parked exactly where the volume happens, rebalanced block by block.' },
          { icon: 'info', title: 'On-chain transparency', text: 'Every quote, every fill, every fee — inspectable by anyone, forever.' },
          { icon: 'support', title: 'Governance native', text: 'Stake, vote, and steer the maker from the same dashboard you trade in.' }
        ]
      },
      {
        kind: 'cta',
        title: 'The market never sleeps. Neither do we.',
        sub: 'Buy crypto with fiat, stake, and govern — one wallet away.',
        button: 'Launch app'
      }
    ],
    footer: {
      blurb: 'Nocturne is a proactive market maker with concentrated liquidity.',
      columns: [
        { title: 'Protocol', links: ['Markets', 'Stake', 'Governance', 'Audits'] },
        { title: 'Developers', links: ['Docs', 'SDK', 'Bug bounty'] },
        { title: 'Community', links: ['Discord', 'X', 'Forum'] }
      ],
      fine: '© 2026 Nocturne Protocol · Lit by Altitude'
    }
  },

  /* ------------------------------------------------------------------ *
   * NORTHRIGHT — dense operational logistics platform.
   * ------------------------------------------------------------------ */
  northright: {
    brand: 'northright',
    site: 'Northright',
    glyph: '⇥',
    nav: ['Overview', 'Orders', 'Drivers', 'Finance', 'Analytics'],
    navCta: 'Create shipment',
    hero: {
      mediaPosition: 'start',
      eyebrow: 'Dispatch, without the guesswork',
      title: 'Every order. Every mile. On screen.',
      sub: '1,556 active orders across 14 corridors, tracked to the kilometer. Northright is the operations console your dispatch team actually wants open.',
      primaryCta: 'Create shipment',
      secondaryCta: 'See live board',
      media: 'ops-card',
      stats: [
        { value: '1,556', label: 'Orders in flight' },
        { value: '135,351', label: 'Pieces tracked' },
        { value: '98.2%', label: 'On-time delivery' }
      ]
    },
    sections: [
      {
        kind: 'features',
        eyebrow: 'The console',
        title: 'Compact by design',
        sub: 'Dense grids, tight spacing, zero wasted pixels — because dispatch happens on one screen.',
        items: [
          { icon: 'pin', title: 'Route intelligence', text: 'Dallas → Houston or Berlin → Paris: ETAs recomputed on every ping.' },
          { icon: 'document', title: 'Cargo manifests', text: 'Loading items, weights, and specs itemized down to the pallet.' },
          { icon: 'bell', title: 'Exception alerts', text: 'Delays surface before the customer calls, not after.' }
        ]
      },
      {
        kind: 'cta',
        title: 'Upgrade to Premium',
        sub: 'Unlock advanced tracking, priority dispatch, and full fleet analytics.',
        button: 'Go Premium'
      }
    ],
    footer: {
      blurb: 'Northright moves freight data the way you move freight: on schedule.',
      columns: [
        { title: 'Platform', links: ['Orders', 'Drivers', 'Documents', 'Finance'] },
        { title: 'Company', links: ['About', 'Careers', 'Newsroom'] },
        { title: 'Support', links: ['Help center', 'Status', 'API'] }
      ],
      fine: '© 2026 Northright Logistics · Dispatched with Altitude'
    }
  },

  /* ------------------------------------------------------------------ *
   * ODYSSEY — airy editorial travel journal.
   * ------------------------------------------------------------------ */
  odyssey: {
    brand: 'odyssey',
    site: 'Odyssey Journal',
    glyph: '❖',
    nav: ['Dispatches', 'Atlas', 'Essays', 'About'],
    navCta: 'Subscribe',
    hero: {
      mediaPosition: 'start',
      eyebrow: 'Issue № 47 — The Slow Route',
      title: 'Notes from the long way around',
      sub: 'Long-form dispatches from people who missed the connecting flight on purpose. Read slowly; the serif insists.',
      primaryCta: 'Read the issue',
      secondaryCta: 'Browse the atlas',
      media: 'editorial-art'
    },
    sections: [
      {
        kind: 'cases',
        eyebrow: 'This issue',
        title: 'Field notes',
        items: [
          { index: 'I', title: 'The tea houses of the Karakoram', text: 'Eleven days, four passes, and the same pot of butter tea, refilled forever.', tags: ['Dispatch'] },
          { index: 'II', title: 'A ferry schedule as literature', text: 'On the Aegean, the timetable is a suggestion and the delay is the destination.', tags: ['Essay'] },
          { index: 'III', title: 'Cartography for the lost', text: 'Why the best maps in our atlas are the ones drawn from memory.', tags: ['Atlas'] }
        ]
      },
      {
        kind: 'testimonial',
        quote: 'Odyssey is the only newsletter I print out. On paper, with margins wide enough to argue in.',
        name: 'Marguerite Ansel',
        role: 'Reader since № 3'
      },
      {
        kind: 'cta',
        title: 'Twelve issues a year. No algorithms between us.',
        button: 'Subscribe'
      }
    ],
    footer: {
      blurb: 'Odyssey Journal is written slowly and shipped monthly.',
      columns: [
        { title: 'Read', links: ['Current issue', 'Archive', 'Atlas'] },
        { title: 'Journal', links: ['About', 'Contributors', 'Prints'] },
        { title: 'Letters', links: ['Write to us', 'Submissions'] }
      ],
      fine: '© 2026 Odyssey Journal · Typeset with Altitude'
    }
  },

  /* ------------------------------------------------------------------ *
   * SOUTHLEFT — high-contrast developer tooling.
   * ------------------------------------------------------------------ */
  southleft: {
    brand: 'southleft',
    site: 'southleft_cli',
    glyph: '▮',
    nav: ['docs', 'plugins', 'changelog', 'github'],
    navCta: '$ install',
    hero: {
      eyebrow: 'v2.0.0 — now with scoped theming',
      title: 'Ship design systems from the command line',
      sub: 'Validate usage, generate wrappers, and gate your tokens in CI. Zero config, zero radius, zero mercy.',
      primaryCta: 'npm install southleft',
      secondaryCta: 'Read the docs',
      media: 'terminal',
      stats: [
        { value: '<50ms', label: 'Cold start' },
        { value: '4', label: 'CI gates' },
        { value: '0px', label: 'Border radius' }
      ]
    },
    sections: [
      {
        kind: 'features',
        eyebrow: 'Toolchain',
        title: 'Everything is a check',
        items: [
          { icon: 'success', title: 'altitude-validate', text: 'Every <al-*> usage checked against the shipped manifest, with fixes.' },
          { icon: 'copy', title: 'Token contracts', text: 'Snapshot, hash, and diff your token surface on every commit.' },
          { icon: 'warning-triangle', title: 'Distinctiveness gate', text: 'Brands must differ beyond color — the CI says so.' }
        ]
      },
      {
        kind: 'cta',
        title: 'exit code 0 or it didn’t happen',
        sub: 'High contrast, hard shadows, honest builds.',
        button: 'Star on GitHub'
      }
    ],
    footer: {
      blurb: 'southleft_cli — the design-system toolchain for terminals with opinions.',
      columns: [
        { title: 'Tool', links: ['Install', 'Docs', 'Plugins'] },
        { title: 'Project', links: ['GitHub', 'Issues', 'Releases'] },
        { title: 'More', links: ['Southleft.com', 'Altitude DS'] }
      ],
      fine: '© 2026 Southleft · exit 0'
    }
  }
};

/** Resolve a persona for a brand attribute value, falling back to altitude. */
export function getPersona(brand: string | null | undefined): Persona {
  return PERSONAS[brand ?? 'altitude'] ?? PERSONAS.altitude;
}
