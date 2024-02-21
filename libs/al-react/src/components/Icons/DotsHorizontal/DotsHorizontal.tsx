import { createComponent } from '@lit/react';
import { ALIconDotsHorizontal as ALWebIconDotsHorizontal } from 'al-web-components/dist/components/icon/icons/dots-horizontal';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconDotsHorizontal.el, ALWebIconDotsHorizontal],
  suffix: PackageJson.version
});

export const ALIconDotsHorizontal = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconDotsHorizontal.el),
  elementClass: ALWebIconDotsHorizontal,
  events: {}
});
