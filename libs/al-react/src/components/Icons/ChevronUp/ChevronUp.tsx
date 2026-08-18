import { createComponent } from '@lit/react';
import { ALIconChevronUp as ALWebIconChevronUp } from 'al-web-components/components/icon/icons/chevron-up';
import register from 'al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconChevronUp.el, ALWebIconChevronUp],
  suffix: PackageJson.version
});

export const ALIconChevronUp = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconChevronUp.el),
  elementClass: ALWebIconChevronUp,
  events: {}
});
