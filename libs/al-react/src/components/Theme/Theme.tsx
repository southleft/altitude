import React from 'react';
import { createComponent } from '@lit/react';
import { ALTheme as ALWebTheme } from 'al-web-components/dist/components/theme/theme';
import register from 'al-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebTheme.el, ALWebTheme],
  suffix: PackageJson.version
});

export const ALTheme = createComponent({
  react: React,
  tagName: elementMap.get(ALWebTheme.el),
  elementClass: ALWebTheme,
  events: {}
});
