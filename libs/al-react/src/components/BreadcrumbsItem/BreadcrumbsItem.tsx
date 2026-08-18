import { createComponent } from '@lit/react';
import { ALBreadcrumbsItem as ALWebBreadcrumbsItem } from 'al-web-components/components/breadcrumbs-item';
import register from 'al-web-components/directives/register';
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
