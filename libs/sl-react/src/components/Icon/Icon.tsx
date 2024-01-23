import React from 'react';
import { createComponent } from '@lit/react';
import { SLIcon as SLWebIcon } from 'sl-web-components/dist/components/icon/icon';
import register from 'sl-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebIcon.el, SLWebIcon],
  suffix: PackageJson.version
});

export const SLIcon = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIcon.el),
  elementClass: SLWebIcon,
  events: {}
});
