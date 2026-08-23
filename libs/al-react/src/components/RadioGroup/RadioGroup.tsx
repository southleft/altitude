'use client';

import { createComponent } from '@lit/react';
import { ALRadioGroup as ALWebRadioGroup } from '@southleft/al-web-components/components/radio-group';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebRadioGroup.el, ALWebRadioGroup],
  suffix: PackageJson.version
});

export const ALRadioGroup = createComponent({
  react: React,
  tagName: elementMap.get(ALWebRadioGroup.el),
  elementClass: ALWebRadioGroup,
  events: {
    onRadioGroupChange: 'onRadioGroupChange'
  }
});
