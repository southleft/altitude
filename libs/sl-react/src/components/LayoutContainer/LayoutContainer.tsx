import { createComponent } from '@lit/react';
import { SLLayoutContainer as SLWebLayoutContainer } from 'sl-web-components/dist/components/layout-container/layout-container';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebLayoutContainer.el, SLWebLayoutContainer],
  suffix: PackageJson.version
});

export const SLLayoutContainer = createComponent({
  react: React,
  tagName: elementMap.get(SLWebLayoutContainer.el),
  elementClass: SLWebLayoutContainer,
  events: {}
});
