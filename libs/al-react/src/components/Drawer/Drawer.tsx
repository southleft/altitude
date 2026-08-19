import React from 'react';
import { createComponent } from '@lit/react';
import { ALDrawer as ALWebDrawer } from 'al-web-components/components/drawer';
import register from 'al-web-components/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebDrawer.el, ALWebDrawer],
  suffix: PackageJson.version
});

export const ALDrawer = createComponent({
  react: React,
  tagName: elementMap.get(ALWebDrawer.el),
  elementClass: ALWebDrawer,
  events: {
    onDrawerClose: 'onDrawerClose',
    onDrawerCloseButton: 'onDrawerCloseButton',
    onDrawerOpen: 'onDrawerOpen'
  }
});
