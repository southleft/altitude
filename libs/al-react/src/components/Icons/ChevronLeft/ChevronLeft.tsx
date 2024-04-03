import { createComponent } from '@lit/react';
import { ALIconChevronLeft as ALWebIconChevronLeft } from '@southleft/al-web-components/dist/components/icon/icons/chevron-left';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconChevronLeft.el, ALWebIconChevronLeft],
  suffix: PackageJson.version
});

export const ALIconChevronLeft = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconChevronLeft.el),
  elementClass: ALWebIconChevronLeft,
  events: {}
});
