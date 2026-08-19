import React from 'react';
import { createComponent } from '@lit/react';
import { ALPagination as ALWebPagination } from 'al-web-components/components/pagination';
import register from 'al-web-components/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebPagination.el, ALWebPagination],
  suffix: PackageJson.version
});

export const ALPagination = createComponent({
  react: React,
  tagName: elementMap.get(ALWebPagination.el),
  elementClass: ALWebPagination,
  events: {
    onPaginationChange: 'onPaginationChange'
  }
});
