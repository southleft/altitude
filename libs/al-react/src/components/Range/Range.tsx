import React from 'react';
import { createComponent } from '@lit/react';
import { ALRange as ALWebRange } from 'al-web-components/dist/components/range/range';
import register from 'al-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebRange.el, ALWebRange],
  suffix: PackageJson.version
});

export const ALRange = createComponent({
  react: React,
  tagName: elementMap.get(ALWebRange.el),
  elementClass: ALWebRange,
  events: {}
});
