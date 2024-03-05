import { createComponent } from '@lit/react';
import { ALIconFilter as ALWebIconFilter } from 'al-web-components/dist/components/icon/icons/filter';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconFilter.el, ALWebIconFilter],
  suffix: PackageJson.version
});

export const ALIconFilter = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconFilter.el),
  elementClass: ALWebIconFilter,
  events: {}
});
