'use client';

import { createComponent } from '@lit/react';
import { ALTabs as ALWebTabs } from '@southleft/al-web-components/components/tabs';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json' with { type: 'json' };

const elementMap = register({
  elements: [ALWebTabs.el, ALWebTabs],
  suffix: PackageJson.version
});

export const ALTabs = createComponent({
  react: React,
  tagName: elementMap.get(ALWebTabs.el),
  elementClass: ALWebTabs,
  events: {
    onTabsChange: 'onTabsChange'
  }
});
