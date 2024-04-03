import React from 'react';
import { createComponent } from '@lit/react';
import { ALPaginationItem as ALWebPaginationItem } from '@southleft/al-web-components/dist/components/pagination-item/pagination-item';
import register from '@southleft/al-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebPaginationItem.el, ALWebPaginationItem],
  suffix: PackageJson.version
});

export const ALPaginationItem = createComponent({
  react: React,
  tagName: elementMap.get(ALWebPaginationItem.el),
  elementClass: ALWebPaginationItem,
  events: {}
});
