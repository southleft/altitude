import React from 'react';
import { createComponent } from '@lit/react';
import { SLSkeleton as SLWebSkeleton } from 'sl-web-components/dist/components/skeleton/skeleton';
import register from 'sl-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebSkeleton.el, SLWebSkeleton],
  suffix: PackageJson.version
});

export const SLSkeleton = createComponent({
  react: React,
  tagName: elementMap.get(SLWebSkeleton.el),
  elementClass: SLWebSkeleton,
  events: {}
});
