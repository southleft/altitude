import { createComponent } from '@lit/react';
import { ALIconMinus as ALWebIconMinus } from 'al-web-components/dist/components/icon/icons/minus';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconMinus.el, ALWebIconMinus],
  suffix: PackageJson.version
});

export const ALIconMinus = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconMinus.el),
  elementClass: ALWebIconMinus,
  events: {}
});
