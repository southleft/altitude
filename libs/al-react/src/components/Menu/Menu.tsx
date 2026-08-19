import { createComponent } from '@lit/react';
import { ALMenu as ALWebMenu } from 'al-web-components/components/menu';
import register from 'al-web-components/directives/register';
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
  events: {
    onMenuItemSelect: 'onMenuItemSelect'
  }
});
