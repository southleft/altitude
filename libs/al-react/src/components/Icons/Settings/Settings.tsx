'use client';

import { createComponent } from '@lit/react';
import { ALIconSettings as ALWebIconSettings } from '@southleft/al-web-components/components/icon/icons/settings';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconSettings.el, ALWebIconSettings],
  suffix: PackageJson.version
});

export const ALIconSettings = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconSettings.el),
  elementClass: ALWebIconSettings,
  events: {}
});
