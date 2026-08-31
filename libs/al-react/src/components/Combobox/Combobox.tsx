'use client';

import { createComponent } from '@lit/react';
import { ALCombobox as ALWebCombobox } from '@southleft/al-web-components/components/combobox';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json' with { type: 'json' };

const elementMap = register({
  elements: [ALWebCombobox.el, ALWebCombobox],
  suffix: PackageJson.version
});

export const ALCombobox = createComponent({
  react: React,
  tagName: elementMap.get(ALWebCombobox.el),
  elementClass: ALWebCombobox,
  events: {
    onComboboxFilter: 'onComboboxFilter',
    onComboboxChange: 'onComboboxChange',
    onComboboxOpen: 'onComboboxOpen',
    onComboboxClose: 'onComboboxClose'
  }
});
