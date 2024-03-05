import { createComponent } from '@lit/react';
import { ALIconSignOut as ALWebIconSignOut } from 'al-web-components/dist/components/icon/icons/sign-out';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconSignOut.el, ALWebIconSignOut],
  suffix: PackageJson.version
});

export const ALIconSignOut = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconSignOut.el),
  elementClass: ALWebIconSignOut,
  events: {}
});
