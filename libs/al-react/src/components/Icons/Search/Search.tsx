import { createComponent } from '@lit/react';
import { ALIconSearch as ALWebIconSearch } from '@southleft/al-web-components/dist/components/icon/icons/search';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconSearch.el, ALWebIconSearch],
  suffix: PackageJson.version
});

export const ALIconSearch = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconSearch.el),
  elementClass: ALWebIconSearch,
  events: {}
});
