import { createComponent } from '@lit/react';
import { ALTab as ALWebTab } from '@southleft/al-web-components/dist/components/tab/tab';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebTab.el, ALWebTab],
  suffix: PackageJson.version
});

export const ALTab = createComponent({
  react: React,
  tagName: elementMap.get(ALWebTab.el),
  elementClass: ALWebTab,
  events: {
    onTabSelect: 'tabSelect'
  }
});
