import { createComponent } from '@lit/react';
import { ALMenu as ALWebMenu } from '@southleft/al-web-components/dist/components/menu/menu';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebMenu.el, ALWebMenu],
  suffix: PackageJson.version
});

export const ALMenu = createComponent({
  react: React,
  tagName: elementMap.get(ALWebMenu.el),
  elementClass: ALWebMenu,
  events: {}
});
