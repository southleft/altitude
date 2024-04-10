import { createComponent } from '@lit/react';
import { ALMenuItem as ALWebMenuItem } from '@southleft/al-web-components/dist/components/menu-item/menu-item';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebMenuItem.el, ALWebMenuItem],
  suffix: PackageJson.version
});

export const ALMenuItem = createComponent({
  react: React,
  tagName: elementMap.get(ALWebMenuItem.el),
  elementClass: ALWebMenuItem,
  events: {}
});
