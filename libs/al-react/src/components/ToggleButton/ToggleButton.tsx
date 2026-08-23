'use client';

import { createComponent } from '@lit/react';
import { ALToggleButton as ALWebToggleButton } from 'al-web-components/components/toggle-button';
import register from 'al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebToggleButton.el, ALWebToggleButton],
  suffix: PackageJson.version
});

export const ALToggleButton = createComponent({
  react: React,
  tagName: elementMap.get(ALWebToggleButton.el),
  elementClass: ALWebToggleButton,
  events: {
    onToggleButtonDeselect: 'onToggleButtonDeselect',
    onToggleButtonSelect: 'onToggleButtonSelect'
  }
});
