import React from 'react';
import { createComponent } from '@lit/react';
import { ALThemeSwitcher as ALWebThemeSwitcher } from '@southleft/al-web-components/dist/components/theme-switcher/theme-switcher';
import register from '@southleft/al-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebThemeSwitcher.el, ALWebThemeSwitcher],
  suffix: PackageJson.version
});

export const ALThemeSwitcher = createComponent({
  react: React,
  tagName: elementMap.get(ALWebThemeSwitcher.el),
  elementClass: ALWebThemeSwitcher,
  events: {}
});
