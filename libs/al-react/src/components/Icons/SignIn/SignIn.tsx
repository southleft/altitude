import { createComponent } from '@lit/react';
import { ALIconSignIn as ALWebIconSignIn } from '@southleft/al-web-components/dist/components/icon/icons/sign-in';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconSignIn.el, ALWebIconSignIn],
  suffix: PackageJson.version
});

export const ALIconSignIn = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconSignIn.el),
  elementClass: ALWebIconSignIn,
  events: {}
});
