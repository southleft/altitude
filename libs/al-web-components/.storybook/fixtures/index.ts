// Storybook-only fixtures: deterministic filler text and placeholder imagery.
//
// Consumed by stories in BOTH Storybooks. al-react reaches across the workspace
// for it, matching how it already shares `.storybook/presets` and the
// `vite-plugins/*` glue (see `libs/al-react/.storybook/main.ts:10-12`):
//
//   al-web-components story:  import { loremSentences } from '../../.storybook/fixtures';
//   al-react story:           import { loremSentences } from '../../../../al-web-components/.storybook/fixtures';
//
// `./southleft.ts` is the BRAND-FLAVOURED alternative to `./lorem.ts` +
// `./images.ts`: the same export shapes filled with real Southleft copy, for
// the Southleft Storybook (`.storybook-sl/`, port 6007). No story uses it yet —
// see that module's header for the intended one-line import swap.
//
// Nothing here ships to consumers — see the scope notes in ./lorem.ts and
// ./images.ts.

export { LOREM_OPENING, loremParagraph, loremParagraphs, loremSentence, loremSentences, loremWords } from './lorem';
export { placeholderImage, placeholderImages, type PlaceholderOptions } from './images';
export {
  SOUTHLEFT_OPENING,
  southleftClients,
  southleftImage,
  southleftImages,
  southleftInsights,
  southleftParagraph,
  southleftParagraphs,
  southleftSentence,
  southleftSentences,
  southleftServices,
  southleftTestimonials,
  southleftTools,
  southleftWords,
  southleftWork,
} from './southleft';
