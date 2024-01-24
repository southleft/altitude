import { createComponent } from '@lit/react';
import { SLBreadcrumbs as SLWebBreadcrumbs } from 'sl-web-components/dist/components/breadcrumbs/breadcrumbs';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebBreadcrumbs.el, SLWebBreadcrumbs],
  suffix: PackageJson.version
});

export const SLBreadcrumbs = createComponent({
  react: React,
  tagName: elementMap.get(SLWebBreadcrumbs.el),
  elementClass: SLWebBreadcrumbs,
  events: {}
});
