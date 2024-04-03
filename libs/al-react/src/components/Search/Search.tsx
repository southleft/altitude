import { createComponent } from '@lit/react';
import { ALSearch as ALWebSearch } from '@southleft/al-web-components/dist/components/search/search';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebSearch.el, ALWebSearch],
  suffix: PackageJson.version
});

export const ALSearch = createComponent({
  react: React,
  tagName: elementMap.get(ALWebSearch.el),
  elementClass: ALWebSearch,
  events: {}
});
