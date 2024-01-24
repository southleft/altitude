import React from 'react';
import { createComponent } from '@lit/react';
import { SLPagination as SLWebPagination } from 'sl-web-components/dist/components/pagination/pagination';
import register from 'sl-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebPagination.el, SLWebPagination],
  suffix: PackageJson.version
});

export const SLPagination = createComponent({
  react: React,
  tagName: elementMap.get(SLWebPagination.el),
  elementClass: SLWebPagination,
  events: {}
});
