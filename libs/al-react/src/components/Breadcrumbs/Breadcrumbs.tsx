'use client';

import { createComponent } from '@lit/react';
import { ALBreadcrumbs as ALWebBreadcrumbs } from 'al-web-components/components/breadcrumbs';
import register from 'al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebBreadcrumbs.el, ALWebBreadcrumbs],
  suffix: PackageJson.version
});

export const ALBreadcrumbs = createComponent({
  react: React,
  tagName: elementMap.get(ALWebBreadcrumbs.el),
  elementClass: ALWebBreadcrumbs,
  events: {}
});
