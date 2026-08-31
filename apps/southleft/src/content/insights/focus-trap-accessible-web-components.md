---
title: "Accessible Design Systems: Building a Focus Trap With Web Components"
date: 2024-03-26
category: "design-systems"
categoryName: "Design Systems"
excerpt: "Web component encapsulation can hinder keyboard navigation. Discover a reusable code pattern for accessible focus trapping, solving this critical accessibility challenge in your design system."
hero: "https://southleft.pages.dev/media/focus-trap.webp"
---

Design systems offer the advantage of integrating accessibility at the component level, eliminating the need for application developers to repeatedly address common accessibility issues. In a [web component-based design system](/insights/development/web-components-first-over-javascript-frameworks/), the encapsulation properties of the Shadow DOM can present unique challenges when it comes to coding for accessibility. 

In this article, we’ll explore a reusable code pattern that unlocks the benefits of web components for crafting fully accessible design systems.

## Understanding Keyboard Navigation

[Keyboard navigation](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Understanding_WCAG/Keyboard) is fundamental to web accessibility. Users with mobility issues and those who use screen readers rely on the keyboard to operate web apps. Keyboard navigation also improves usability for any user who prefers the speed and ease of the keyboard over the mouse.

In native HTML, interactive elements, such as `<button>`,  `<a>`, and `<input>`, are inherently keyboard focusable. Keyboard users press the `Tab` and `Shift + Tab` keys to move focus forwards and backward between these elements, following the document’s [tab order](https://web.archive.org/web/20240221205111/https://accessibility.digital.gov/ux/tab-order/)

For certain accessibility scenarios, developers may manipulate the DOM’s native tab order, at times dynamically updating the [`tabindex`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex) attribute on elements to include or exclude them from tab sequence. Focus manipulation with JavaScript, when used sparingly and intentionally, is a crucial tool for web accessibility.

In the following section, I’ll detail one use case for focus manipulation and describe how it can be adopted to work with web components and the Shadow DOM.

## Implementing Focus Control for Accessible Modals

[Modal dialogs](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/#keyboardinteraction) are page overlays that restrict a user’s focus and navigation within their content, disabling interaction with the rest of the page. Accessible modals need to confine keyboard focus inside their boundaries to prevent accidental navigation to outside elements.

A common technique for achieving this is the focus trap:

```javascript
const focusableSelectors =
  'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const applyFocusTrap = (element) => {
  const focusableEls = element.querySelectorAll(focusableSelectors);

  const firstFocusableEl = focusableEls[0];
  const lastFocusableEl = focusableEls[focusableEls.length - 1];

  lastFocusableEl.addEventListener("keydown", (event) => {
    if (event.code === "Tab" && !event.shiftKey) {
      event.preventDefault();

      firstFocusableEl.focus();
    }
  });

  firstFocusableEl.addEventListener("keydown", (event) => {
    if (event.code === "Tab" && event.shiftKey) {
      event.preventDefault();

      lastFocusableEl.focus();
    }
  });
};
```

The focus trap finds the first and last focusable elements within a section of code. It then constrains focus by redirecting focus back to the first focusable element when the user tries to navigate beyond the last focusable element, and vice versa.

## Focus Trapping For Web Components

Web components introduce [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM) encapsulation, complicating the process of capturing all focusable children within a component’s tree. 

To address this, we can extend the logic of `element.querySelectorAll(focusableSelectors);`  with a utility function that will recursively traverse the Shadow DOM, accounting for different types of deeply nested child nodes, including [`<slot`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/slot)[`>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/slot)  elements and [shadowRoots](https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot):

```javascript
const isFocusable = (node) => {
  return node.matches(focusableSelectors)
}

export default const getFocusableElements = (root) => {
  const focusableElements = [];

  function traverse(node) {
    if (node instanceof HTMLElement && isFocusable(node)) {
      focusableElements.push(node);
	} if (node instanceof HTMLSlotElement) {
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
```

Using this supercharged query, now adapted for web components, we can create a custom element, `<sl-focus-trap>`, which will effectively trap focus within the Shadow DOM:

```javascript
import getFocusableElements from './getFocusableElements';

export class SLFocusTrap {
  constructor() {
    this.firstFocusableEl = undefined; 
    this.lastFocusableEl = undefined; 
    this.slottedContent = [];
    
    this.trapFocusEnd = this.trapFocusEnd.bind(this);
    this.trapFocusStart = this.trapFocusStart.bind(this);
  }

  applyFocusTrap() {
    const focusableElements = getFocusableElements(this.slottedContent[0]);
    this.firstFocusableEl = focusableElements[0];
    this.lastFocusableEl = focusableElements[focusableElements.length - 1];

    this.lastFocusableEl.addEventListener('keydown', this.trapFocusEnd);
    this.firstFocusableEl.addEventListener('keydown', this.trapFocusStart);
  }

  trapFocusEnd(evt) {
    if (evt.code === 'Tab' && !evt.shiftKey) {
	  evt.preventDefault();
      this.firstFocusableEl.focus();
    }
  }

  trapFocusStart(evt) {
    if (evt.code === 'Tab' && evt.shiftKey) {
      evt.preventDefault();
      this.lastFocusableEl.focus();
    }
  }

  render() {
    return html`
      <div class="sl-c-focus-trap">
        <slot></slot>
      </div>
    `;
  }
}
```

Additional considerations to make this a robust and reusable focus-trap component include adding functionality to dynamically apply and remove the focus trap, and manage initial focus when the trap is first applied.

## Conclusion

A focus trap custom component like this can be combined with other components, such as `<sl-dialog>`, to compose accessible interfaces across an entire design system, and any applications it powers. By effectively managing the complexities of the Shadow DOM, design system developers can harness the advantages of web components while ensuring accessibility remains uncompromised.
