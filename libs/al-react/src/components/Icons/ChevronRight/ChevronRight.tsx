import { createComponent } from '@lit/react';
import { ALIconChevronRight as ALWebIconChevronRight } from '@southleft/al-web-components/dist/components/icon/icons/chevron-right';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconChevronRight.el, ALWebIconChevronRight],
  suffix: PackageJson.version
});

export const ALIconChevronRight = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconChevronRight.el),
  elementClass: ALWebIconChevronRight,
  events: {}
});
