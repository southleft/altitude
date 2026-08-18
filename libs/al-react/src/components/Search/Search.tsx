import { createComponent } from '@lit/react';
import { ALSearch as ALWebSearch } from 'al-web-components/components/search';
import register from 'al-web-components/directives/register';
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
