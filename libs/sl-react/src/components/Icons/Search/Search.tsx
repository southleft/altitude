import { createComponent } from '@lit-labs/react';
import { SLIconSearch as SLWebIconSearch } from 'sl-web-components/dist/sl/components/icon/icons/search';
import register from 'sl-web-components/dist/sl/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconSearch.el, SLWebIconSearch],
  suffix: PackageJson.version
});

export const SLIconSearch = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconSearch.el),
  elementClass: SLWebIconSearch,
  events: {}
});
