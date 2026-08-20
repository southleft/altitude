---
title: "Demystifying Web Components: Understanding Slots (Part 2)"
date: 2024-07-15
category: "development"
categoryName: "Development"
excerpt: "Explore advanced slot techniques including fallback content, slot assignment, and dynamic manipulation to create more powerful and flexible Web Components."
hero: "https://southleft.pages.dev/media/slots-part-2.webp"
---

## TL;DR

This article explores advanced slot techniques in Web Components, including fallback content, slot assignment, and dynamic slot manipulation. These techniques allow for more complex and flexible component designs.

## Introduction

In [Part 1](/insights/development/demystifying-web-components-understanding-slots-part-1/) of this series, we introduced the concept of slots in Web Components and covered basic usage. Now, we’ll dive deeper into more advanced techniques that will give you greater control and flexibility when working with slots.

## Fallback Content for Slots

Fallback content is displayed when no content is provided for a slot. This is useful for providing default content or placeholders.

```javascript
class FallbackSlotCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <div class="card">
        <slot name="header">Default Header</slot>
        <slot>Default content</slot>
        <slot name="footer">Default Footer</slot>
      </div>
    `;
  }
}

customElements.define('fallback-slot-card', FallbackSlotCard);
```

Usage:

```markup
<fallback-slot-card>
  <span slot="header">Custom Header</span>
  <!-- Main content and footer will use fallback content -->
</fallback-slot-card>
```

## Slot Assignment and the `slotchange` Event

The `slotchange` event fires when the content of a slot changes. This allows you to react to changes in slotted content.

```javascript
class SlotChangeObserver extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <slot name="observed"></slot>
      <p>Last change: <span id="lastChange"></span></p>
    `;

    const slot = this.shadowRoot.querySelector('slot');
    slot.addEventListener('slotchange', () => {
      const span = this.shadowRoot.getElementById('lastChange');
      span.textContent = new Date().toLocaleTimeString();
    });
  }
}

customElements.define('slot-change-observer', SlotChangeObserver);
```

## Checking for Assigned Nodes

You can programmatically check which nodes are assigned to a slot using the `assignedNodes()` method.

```javascript
class SlotChecker extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <slot name="content"></slot>
      <p>Content status: <span id="status"></span></p>
    `;
  }

  connectedCallback() {
    const slot = this.shadowRoot.querySelector('slot[name="content"]');
    const status = this.shadowRoot.getElementById('status');

    const updateStatus = () => {
      const nodes = slot.assignedNodes();
      status.textContent = nodes.length > 0 ? 'Content provided' : 'No content';
    };

    slot.addEventListener('slotchange', updateStatus);
    updateStatus(); // Initial check
  }
}

customElements.define('slot-checker', SlotChecker);
```

## Dynamic Slot Manipulation

You can dynamically add, remove, or modify slotted content from JavaScript.

```javascript
class DynamicSlots extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <div id="container">
        <slot name="dynamic"></slot>
      </div>
      <button id="addBtn">Add Item</button>
      <button id="removeBtn">Remove Item</button>
    `;

    this.counter = 0;
    this.container = this.shadowRoot.getElementById('container');

    this.shadowRoot.getElementById('addBtn').addEventListener('click', () => this.addItem());
    this.shadowRoot.getElementById('removeBtn').addEventListener('click', () => this.removeItem());
  }

  addItem() {
    const item = document.createElement('p');
    item.textContent = `Item ${++this.counter}`;
    item.slot = 'dynamic';
    this.appendChild(item);
  }

  removeItem() {
    if (this.counter > 0) {
      this.removeChild(this.lastElementChild);
      this.counter--;
    }
  }
}

customElements.define('dynamic-slots', DynamicSlots);
```

## Complex Component Example

Let’s put these techniques together in a more complex example: a tabbed content component.

```javascript
class TabbedContent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        .tab-bar { display: flex; }
        .tab { padding: 10px; cursor: pointer; }
        .tab.active { background-color: #eee; }
        .content { display: none; padding: 10px; }
        .content.active { display: block; }
      </style>
      <div class="tab-bar"></div>
      <div class="content-container"></div>
    `;

    this.tabBar = this.shadowRoot.querySelector('.tab-bar');
    this.contentContainer = this.shadowRoot.querySelector('.content-container');
  }

  connectedCallback() {
    this.renderTabs();
    this.selectTab(0);
  }

  renderTabs() {
    const slots = this.querySelectorAll('[slot]');
    slots.forEach((slot, index) => {
      const tab = document.createElement('div');
      tab.className = 'tab';
      tab.textContent = slot.getAttribute('slot');
      tab.addEventListener('click', () => this.selectTab(index));
      this.tabBar.appendChild(tab);

      const content = document.createElement('div');
      content.className = 'content';
      const contentSlot = document.createElement('slot');
      contentSlot.name = slot.getAttribute('slot');
      content.appendChild(contentSlot);
      this.contentContainer.appendChild(content);
    });
  }

  selectTab(index) {
    this.tabBar.querySelectorAll('.tab').forEach((tab, i) => {
      tab.classList.toggle('active', i === index);
    });
    this.contentContainer.querySelectorAll('.content').forEach((content, i) => {
      content.classList.toggle('active', i === index);
    });
  }
}

customElements.define('tabbed-content', TabbedContent);
```

Usage:

```markup
<tabbed-content>
  <div slot="Tab 1">Content for Tab 1</div>
  <div slot="Tab 2">Content for Tab 2</div>
  <div slot="Tab 3">Content for Tab 3</div>
</tabbed-content>
```

This component dynamically creates tabs based on the slotted content, demonstrating how slots can be used to create flexible, content-driven components.

## Conclusion

These advanced slot techniques provide powerful tools for creating more dynamic and flexible Web Components. By mastering these concepts, you can create components that are highly adaptable and reusable across different contexts.

In [the next part of this series](/insights/development/demystifying-web-components-understanding-slots-part-3/), we’ll explore best practices for designing components with slots and dive into styling slotted content.
