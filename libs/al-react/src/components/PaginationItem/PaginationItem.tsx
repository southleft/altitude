'use client';

import React from 'react';
import { createComponent } from '@lit/react';
import { ALPaginationItem as ALWebPaginationItem } from '@southleft/al-web-components/components/pagination-item';
import register from '@southleft/al-web-components/directives/register';
import PackageJson from '../../../package.json' with { type: 'json' };

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
