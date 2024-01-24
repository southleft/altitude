import React from 'react';
import { createComponent } from '@lit/react';
import { SLPaginationItem as SLWebPaginationItem } from 'sl-web-components/dist/components/pagination-item/pagination-item';
import register from 'sl-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebPaginationItem.el, SLWebPaginationItem],
  suffix: PackageJson.version
});

export const SLPaginationItem = createComponent({
  react: React,
  tagName: elementMap.get(SLWebPaginationItem.el),
  elementClass: SLWebPaginationItem,
  events: {}
});
