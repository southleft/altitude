import { createComponent } from '@lit/react';
import { ALDropdownPanel as ALWebDropdownPanel } from '@southleft/al-web-components/dist/components/dropdown-panel/dropdown-panel';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebDropdownPanel.el, ALWebDropdownPanel],
  suffix: PackageJson.version
});

export const ALDropdownPanel = createComponent({
  react: React,
  tagName: elementMap.get(ALWebDropdownPanel.el),
  elementClass: ALWebDropdownPanel,
  events: {}
});
