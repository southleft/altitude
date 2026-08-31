'use client';

import { createComponent } from '@lit/react';
import { ALProgress as ALWebProgress } from '@southleft/al-web-components/components/progress';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json' with { type: 'json' };

const elementMap = register({
  elements: [ALWebProgress.el, ALWebProgress],
  suffix: PackageJson.version
});

export const ALProgress = createComponent({
  react: React,
  tagName: elementMap.get(ALWebProgress.el),
  elementClass: ALWebProgress,
  events: {
    onProgressChange: 'onProgressChange'
  }
});
