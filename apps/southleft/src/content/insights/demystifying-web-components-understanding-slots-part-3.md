---
title: "Demystifying Web Components: Understanding Slots (Part 3)"
date: 2024-07-15
category: "development"
categoryName: "Development"
excerpt: "Learn best practices for designing Web Components with slots and discover basic techniques for styling slotted content to create modular and visually customizable components."
hero: "https://southleft.pages.dev/media/slots-part-3.webp"
---

## TL;DR

This article covers best practices for designing Web Components with slots, including modular design principles. It also introduces techniques for styling slotted content, ensuring your components are both flexible and visually customizable.

## Introduction

In [Part 1](/insights/development/demystifying-web-components-understanding-slots-part-1/) and [Part 2](/insights/development/demystifying-web-components-understanding-slots-part-2/) of this series, we introduced slots and explored advanced slot techniques. In this part, we’ll discuss best practices for designing components with slots and dive into styling slotted content.

## Best Practices for Component Design

When designing Web Components, especially those with complex structures like tabs, it’s important to follow certain best practices to ensure your components are modular, maintainable, and reusable.

### 1\. Separate Concerns

Break down complex components into smaller, more focused sub-components. This approach helps separate logic and makes each part easier to understand and maintain.

For example, instead of creating a single monolithic tabbed content component, we could break it down into:

-   `<tab-list>`: Manages the list of tabs
-   `<tab>`: Represents an individual tab
-   `<tab-panel>`: Contains the content for each tab
-   `<tabs>`: The main component that orchestrates the others

Here’s a simplified example of how this might look:

```javascript
// tab.js
class Tab extends HTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'tab');
    this.addEventListener('click', () => this.select());
  }

  select() {
    this.dispatchEvent(new CustomEvent('tab-select', { bubbles: true }));
  }
}

customElements.define('my-tab', Tab);

// tabs.js
class Tabs extends HTMLElement {
  connectedCallback() {
    this.addEventListener('tab-select', this.onTabSelect);
  }

  onTabSelect(event) {
    const selectedTab = event.target;
    const tabs = this.querySelectorAll('my-tab');
    const panels = this.querySelectorAll('my-tab-panel');

    tabs.forEach((tab, index) => {
      const panel = panels[index];
      const selected = tab === selectedTab;
      tab.setAttribute('aria-selected', selected);
      panel.hidden = !selected;
    });
  }
}

customElements.define('my-tabs', Tabs);
```

### 2\. Use Slots Effectively

Slots allow for flexible content insertion. Use them to create components that can adapt to various use cases.

### 3\. Provide Sensible Defaults

Use fallback content in slots to ensure your component works even if the user doesn’t provide all the expected content.

### 4\. Make Your Components Accessible

Ensure your components are accessible by using appropriate ARIA attributes and managing focus correctly.

### 5\. Document Your Components

Provide clear documentation on how to use your components, what slots are available, and any events that might be emitted.

## Introduction to Styling Slotted Content

Styling slotted content can be tricky because it involves both the component’s internal styles and the styles from the light DOM. Here are some basic techniques:

### 1\. Styling the Slot Element

You can style the slot element itself, but this won’t affect the slotted content:

```css
slot {
  display: block;
  padding: 10px;
}
```

### 2\. Styling Slotted Content from the Component

Use the `::slotted()` pseudo-element to style slotted content from within the component:

```css
::slotted(p) {
  color: blue;
}
```

Note that `::slotted()` only works with top-level children of the slot.

### 3\. Styling from the Light DOM

Styles in the light DOM will also apply to slotted content:

```markup
<style>
  my-component p {
    font-weight: bold;
  }
</style>
<my-component>
  <p>This text will be bold</p>
</my-component>
```

### 4\. Using CSS Custom Properties

CSS custom properties (variables) are inherited through the shadow DOM boundary, making them useful for creating themeable components:

```javascript
class ThemedComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --text-color: black;
        }
        p {
          color: var(--text-color);
        }
      </style>
      <p><slot></slot></p>
    `;
  }
}

customElements.define('themed-component', ThemedComponent);
```

Usage:

```markup
<themed-component style="--text-color: blue;">
  This text will be blue
</themed-component>
```

## Conclusion

By following these best practices and understanding how to effectively style slotted content, you can create Web Components that are modular, maintainable, and highly customizable. Slots provide a powerful mechanism for creating flexible components, and when combined with thoughtful design and styling techniques, they enable you to build robust and reusable UI elements.

In [the next and final part of our series](/insights/development/demystifying-web-components-understanding-slots-part-4/), we’ll dive deeper into advanced styling techniques for slotted content, exploring more complex scenarios and best practices for creating highly flexible and customizable components.
