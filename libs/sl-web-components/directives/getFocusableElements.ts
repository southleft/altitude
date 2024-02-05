/**
 * Traverse the shadow DOM and light DOM of a given root element and return an array of all focusable elements.
 *
*/

const focusableSelectors = 'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const isFocusable = (node: HTMLElement): boolean => {
  return node.matches(focusableSelectors)
}

const isVisible = (node: HTMLElement): boolean => {
  const rect = node.getBoundingClientRect();
  const computed = getComputedStyle(node);

  return (
    rect.width > 0 && rect.height > 0
    && computed.display !== 'none'
    && computed.visibility !== 'hidden'
    && computed.opacity !== '0'
  );
};

export default function getFocusableElements(root: HTMLElement | HTMLSlotElement | Node): Array<HTMLElement> {
  const focusableElements: Array<HTMLElement> = [];

  function traverse(node: Node): void {
    if (node instanceof HTMLElement && isFocusable(node) && isVisible(node)) {
      focusableElements.push(node);
    }

    if (node instanceof HTMLSlotElement) {
      const assignedElements = node.assignedElements();
      assignedElements.forEach((assignedElement) => traverse(assignedElement));
    } else if (node instanceof HTMLElement && node.shadowRoot) {
      const rootChildren = node.shadowRoot.querySelectorAll('*');
      rootChildren.forEach((childNode: Node) => traverse(childNode));
    } else if (node instanceof HTMLElement && node.children) {
      [...node.children].forEach((child) => traverse(child));
    }
  }

  traverse(root);

  return focusableElements;
}