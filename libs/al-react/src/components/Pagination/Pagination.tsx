import React from 'react';
import { createComponent } from '@lit/react';
import { ALPagination as ALWebPagination } from '@southleft/al-web-components/dist/components/pagination/pagination';
import register from '@southleft/al-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebPagination.el, ALWebPagination],
  suffix: PackageJson.version
});

export const ALPagination = createComponent({
  react: React,
  tagName: elementMap.get(ALWebPagination.el),
  elementClass: ALWebPagination,
  events: {}
});
