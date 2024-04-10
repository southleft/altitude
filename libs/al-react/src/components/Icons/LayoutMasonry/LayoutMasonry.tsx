import { createComponent } from '@lit/react';
import { ALIconLayoutMasonry as ALWebIconLayoutMasonry } from '@southleft/al-web-components/dist/components/icon/icons/layout-masonry';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconLayoutMasonry.el, ALWebIconLayoutMasonry],
  suffix: PackageJson.version
});

export const ALIconLayoutMasonry = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconLayoutMasonry.el),
  elementClass: ALWebIconLayoutMasonry,
  events: {}
});
