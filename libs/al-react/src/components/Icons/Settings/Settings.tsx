import { createComponent } from '@lit/react';
import { ALIconSettings as ALWebIconSettings } from '@southleft/al-web-components/dist/components/icon/icons/settings';
import register from '@southleft/al-web-components/dist/directives/register';
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
