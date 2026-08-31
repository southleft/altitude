'use client';

import { createComponent } from '@lit/react';
import { ALToggle as ALWebToggle } from '@southleft/al-web-components/components/toggle';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json' with { type: 'json' };

const elementMap = register({
  elements: [ALWebToggle.el, ALWebToggle],
  suffix: PackageJson.version
});

export const ALToggle = createComponent({
  react: React,
  tagName: elementMap.get(ALWebToggle.el),
  elementClass: ALWebToggle,
  events: {
    onToggleChange: 'onToggleChange'
  }
});
