import { createComponent } from '@lit/react';
import { ALIconCheck as ALWebIconCheck } from 'al-web-components/dist/components/icon/icons/check';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconCheck.el, ALWebIconCheck],
  suffix: PackageJson.version
});

export const ALIconCheck = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconCheck.el),
  elementClass: ALWebIconCheck,
  events: {}
});
