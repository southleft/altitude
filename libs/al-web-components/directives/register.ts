/**
 *
 * This function, register, is used to register custom elements in the browser's custom elements registry.
 * It takes an object as a parameter with the following properties:
 *   - elements: An array of tuples, where each tuple contains the name of the element and its corresponding class.
 *   - prefix (optional): A string that will be prefixed to the element name when registering it.
 *   - suffix (optional): A string that will be suffixed to the element name when registering it.

 * The function iterates over the elements array and generates an alias for each element by combining the prefix, name, and suffix (if provided).
 * If the generated alias is not already registered as a custom element, it is defined using customElements.define().
 * The function then returns a map that maps each element name to its corresponding alias.
 *
 * Example usage:
 *
 * const elements = [
 *    ['al-button', ALButton],
 *    ['al-card', ALCard]
 * ];
 *
 * const aliasesMap = register({ elements, prefix: 'app', suffix: '0.1.5' });
 *
 * The custom elements 'app-al-button-0-1-5' and 'app-al-card-0-1-5' are registered.
 *
 * aliasesMap = {
 *    'al-button': 'app-al-button-0-1-5',
 *    'al-card': 'app-al-card-0-1-5'
 * }
 *
 */

export default function register({ elements, prefix, suffix }: { elements: [string, any] | [string, any][]; prefix?: string; suffix?: string }) {
  // Normalize 'elements' to always be an array of tuples
  const normalizedElements: [string, any][] = Array.isArray(elements[0]) ? elements : [elements as [string, any]];
  // Remove any non-word characters from the prefix and suffix
  prefix = prefix ? prefix.replace(/[\W_]/g, '-') : '';
  suffix = suffix ? suffix.replace(/[\W_]/g, '-') : '';
  // Register each element and generate an alias for it
  const aliasesMap = normalizedElements.reduce((map, [name, elementClass]) => {
    let alias = prefix ? `${prefix}-${name}` : name;
    alias = suffix ? `${alias}-${suffix}` : alias;
    // If the element is not already registered, define it
    if (!customElements.get(alias)) {
      // Try/Catch for weird double module import issue in webpack
      try {
        customElements.define(alias, elementClass);
      } catch (error) {
        console?.error(`Error registering ${alias} custom element`, error);
      }
    }
    // Map the element name to its alias
    map.set(name, alias);
    return map;
  }, new Map<string, string>());

  return aliasesMap;
}
