import { createComponent } from '@lit/react';
import { SLIconFilter as SLWebIconFilter } from 'sl-web-components/dist/components/icon/icons/filter';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconFilter.el, SLWebIconFilter],
  suffix: PackageJson.version
});

export const SLIconFilter = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconFilter.el),
  elementClass: SLWebIconFilter,
  events: {}
});
