import { createComponent } from '@lit/react';
import { SLSearch as SLWebSearch } from 'sl-web-components/dist/components/search/search';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebSearch.el, SLWebSearch],
  suffix: PackageJson.version
});

export const SLSearch = createComponent({
  react: React,
  tagName: elementMap.get(SLWebSearch.el),
  elementClass: SLWebSearch,
  events: {}
});
