import { createComponent } from '@lit/react';
import { ALBreadcrumbsItem as ALWebBreadcrumbsItem } from 'al-web-components/dist/components/breadcrumbs-item/breadcrumbs-item';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebBreadcrumbsItem.el, ALWebBreadcrumbsItem],
  suffix: PackageJson.version
});

export const ALBreadcrumbsItem = createComponent({
  react: React,
  tagName: elementMap.get(ALWebBreadcrumbsItem.el),
  elementClass: ALWebBreadcrumbsItem,
  events: {}
});
