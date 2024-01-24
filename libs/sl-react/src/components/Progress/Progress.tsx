import { createComponent } from '@lit/react';
import { SLProgress as SLWebProgress } from 'sl-web-components/dist/components/progress/progress';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebProgress.el, SLWebProgress],
  suffix: PackageJson.version
});

export const SLProgress = createComponent({
  react: React,
  tagName: elementMap.get(SLWebProgress.el),
  elementClass: SLWebProgress,
  events: {}
});
