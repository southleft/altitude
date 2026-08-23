'use client';

import { createComponent } from '@lit/react';
import { ALEmptyState as ALWebEmptyState } from 'al-web-components/components/empty-state';
import register from 'al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebEmptyState.el, ALWebEmptyState],
  suffix: PackageJson.version
});

export const ALEmptyState = createComponent({
  react: React,
  tagName: elementMap.get(ALWebEmptyState.el),
  elementClass: ALWebEmptyState
});
