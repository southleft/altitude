/**
 * Setup for the `react` unit project.
 *
 * NOTE what is deliberately NOT here: `globalThis.alAutoRegistry`. Per
 * .altitude/REGISTRATION.md:69-81 a React app must never set it — each wrapper
 * registers its own element with a version suffix. Setting it makes every
 * component module self-register the PLAIN tag first, and the wrapper's
 * subsequent `customElements.define('al-x-1-0-0', SameClass)` then throws
 * `NotSupportedError: this constructor has already been used with this
 * registry`. register.ts:60 swallows that into a console.error, so the versioned
 * tag silently never exists and every wrapper renders an unknown element.
 * Reproduced while building this suite.
 *
 * `IS_REACT_ACT_ENVIRONMENT` keeps React 19's `act()` from warning.
 *
 * The BUILT token bundle: the react project resolves `@southleft/al-web-components`
 * through its exports map (i.e. `dist/`), so it consumes the shipped
 * stylesheet too. Run `pnpm run build` first.
 */
import '../../libs/al-web-components/dist/css/main.css';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
