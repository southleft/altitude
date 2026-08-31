'use client';

import { createComponent } from '@lit/react';
import { ALCheckbox as ALWebCheckbox } from '@southleft/al-web-components/components/checkbox';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json' with { type: 'json' };

const elementMap = register({
  elements: [ALWebCheckbox.el, ALWebCheckbox],
  suffix: PackageJson.version
});

export const ALCheckbox = createComponent({
  react: React,
  tagName: elementMap.get(ALWebCheckbox.el),
  elementClass: ALWebCheckbox,
  events: {
    onCheckboxChange: 'onCheckboxChange'
  }
});
