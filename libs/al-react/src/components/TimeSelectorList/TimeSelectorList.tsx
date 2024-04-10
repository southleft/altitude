import React from 'react';
import { createComponent } from '@lit/react';
import { ALTimeSelectorList as ALWebTimeSelectorList } from '@southleft/al-web-components/dist/components/time-selector-list/time-selector-list';
import register from '@southleft/al-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebTimeSelectorList.el, ALWebTimeSelectorList],
  suffix: PackageJson.version
});

export const ALTimeSelectorList = createComponent({
  react: React,
  tagName: elementMap.get(ALWebTimeSelectorList.el),
  elementClass: ALWebTimeSelectorList,
  events: {}
});
