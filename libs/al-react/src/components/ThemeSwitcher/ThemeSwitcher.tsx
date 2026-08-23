'use client';

import React from 'react';
import { createComponent } from '@lit/react';
import { ALThemeSwitcher as ALWebThemeSwitcher } from 'al-web-components/components/theme-switcher';
import register from 'al-web-components/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebThemeSwitcher.el, ALWebThemeSwitcher],
  suffix: PackageJson.version
});

export const ALThemeSwitcher = createComponent({
  react: React,
  tagName: elementMap.get(ALWebThemeSwitcher.el),
  elementClass: ALWebThemeSwitcher,
  events: {
    onThemeSwitcherChange: 'onThemeSwitcherChange'
  }
});
