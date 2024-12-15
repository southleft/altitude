import { createComponent } from '@lit/react';
import { ALIconAdd as ALWebIconAdd } from '@southleft/al-web-components/dist/components/icon/icons/add';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconAdd.el, ALWebIconAdd],
  suffix: PackageJson.version
});

export const ALIconAdd = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconAdd.el),
  elementClass: ALWebIconAdd,
  events: {}
});
