import React from 'react';
import { createComponent } from '@lit/react';
import { ALSkeleton as ALWebSkeleton } from 'al-web-components/dist/components/skeleton/skeleton';
import register from 'al-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebSkeleton.el, ALWebSkeleton],
  suffix: PackageJson.version
});

export const ALSkeleton = createComponent({
  react: React,
  tagName: elementMap.get(ALWebSkeleton.el),
  elementClass: ALWebSkeleton,
  events: {}
});
