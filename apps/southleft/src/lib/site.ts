// Site constants — mirrors southleft-v5's `src/lib/site.ts` shape so this
// app's IA (nav, CTA) stays a drop-in match for the real site (spec
// 2026-08-20-southleft-example-app, T4-1).

export const SITE = {
  name: 'Southleft',
  title: 'Southleft — AI-Powered Design Systems',
  description:
    'Design systems consulting, engineering, and AI integration — built exclusively on Altitude, Southleft’s own design system.',
  url: 'https://southleft.com',
  email: 'inquiries@southleft.com',
  calendly: 'https://calendly.com/southleft/discovery-call',
  linkedin: 'https://www.linkedin.com/company/southleft/',
  github: 'https://github.com/southleft',
  substack: 'https://southleft.substack.com',
} as const;

/** Primary nav — Services · Work · Insights · Tools · About + Calendly CTA
 * (spec R-requirement, T3/T4-1). */
export const NAV = [
  { label: 'Services', href: '/services' },
  { label: 'Work', href: '/work' },
  { label: 'Insights', href: '/insights' },
  { label: 'Tools', href: '/tools' },
  { label: 'About', href: '/about' },
] as const;

export const CTA = { label: 'Start a conversation', href: '/contact' } as const;
