import { createComponent } from '@lit/react';
import { ALTabPanel as ALWebTabPanel } from '@southleft/al-web-components/dist/components/tab-panel/tab-panel';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebTabPanel.el, ALWebTabPanel],
  suffix: PackageJson.version
});

export const ALTabPanel = createComponent({
  react: React,
  tagName: elementMap.get(ALWebTabPanel.el),
  elementClass: ALWebTabPanel,
  events: {}
});
