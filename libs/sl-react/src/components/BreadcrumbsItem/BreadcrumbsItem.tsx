import { createComponent } from '@lit/react';
import { SLBreadcrumbsItem as SLWebBreadcrumbsItem } from 'sl-web-components/dist/components/breadcrumbs-item/breadcrumbs-item';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebBreadcrumbsItem.el, SLWebBreadcrumbsItem],
  suffix: PackageJson.version
});

export const SLBreadcrumbsItem = createComponent({
  react: React,
  tagName: elementMap.get(SLWebBreadcrumbsItem.el),
  elementClass: SLWebBreadcrumbsItem,
  events: {}
});
