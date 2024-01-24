import { createComponent } from '@lit/react';
import { SLDivider as SLWebDivider } from 'sl-web-components/dist/components/divider/divider';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebDivider.el, SLWebDivider],
  suffix: PackageJson.version
});

export const SLDivider = createComponent({
  react: React,
  tagName: elementMap.get(SLWebDivider.el),
  elementClass: SLWebDivider,
  events: {}
});
