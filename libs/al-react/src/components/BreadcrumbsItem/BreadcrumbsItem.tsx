'use client';

import { createComponent } from '@lit/react';
import { ALBreadcrumbsItem as ALWebBreadcrumbsItem } from '@southleft/al-web-components/components/breadcrumbs-item';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json' with { type: 'json' };

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
