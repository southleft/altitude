import { createComponent } from '@lit/react';
import { ALIconMenu as ALWebIconMenu } from '@southleft/al-web-components/dist/components/icon/icons/menu';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconMenu.el, ALWebIconMenu],
  suffix: PackageJson.version
});

export const ALIconMenu = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconMenu.el),
  elementClass: ALWebIconMenu,
  events: {}
});
