'use client';

import { createComponent } from '@lit/react';
import { ALTabPanel as ALWebTabPanel } from '@southleft/al-web-components/components/tab-panel';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json' with { type: 'json' };

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
