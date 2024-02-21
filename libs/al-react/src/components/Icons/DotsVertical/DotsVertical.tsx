import { createComponent } from '@lit/react';
import { ALIconDotsVertical as ALWebIconDotsVertical } from 'al-web-components/dist/components/icon/icons/dots-vertical';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconDotsVertical.el, ALWebIconDotsVertical],
  suffix: PackageJson.version
});

export const ALIconDotsVertical = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconDotsVertical.el),
  elementClass: ALWebIconDotsVertical,
  events: {}
});
