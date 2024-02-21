import { createComponent } from '@lit/react';
import { ALLayoutContainer as ALWebLayoutContainer } from 'al-web-components/dist/components/layout-container/layout-container';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebLayoutContainer.el, ALWebLayoutContainer],
  suffix: PackageJson.version
});

export const ALLayoutContainer = createComponent({
  react: React,
  tagName: elementMap.get(ALWebLayoutContainer.el),
  elementClass: ALWebLayoutContainer,
  events: {}
});
