'use client';

import { createComponent } from '@lit/react';
import { ALCommandPalette as ALWebCommandPalette } from '@southleft/al-web-components/components/command-palette';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebCommandPalette.el, ALWebCommandPalette],
  suffix: PackageJson.version
});

export const ALCommandPalette = createComponent({
  react: React,
  tagName: elementMap.get(ALWebCommandPalette.el),
  elementClass: ALWebCommandPalette,
  events: {
    onCommandPaletteOpen: 'onCommandPaletteOpen',
    onCommandPaletteClose: 'onCommandPaletteClose',
    onCommandPaletteAction: 'onCommandPaletteAction'
  }
});
