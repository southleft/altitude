import { createComponent } from '@lit/react';
import { ALBentoGrid as ALWebBentoGrid } from 'al-web-components/components/bento-grid';
import register from 'al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebBentoGrid.el, ALWebBentoGrid],
  suffix: PackageJson.version
});

export const ALBentoGrid = createComponent({
  react: React,
  tagName: elementMap.get(ALWebBentoGrid.el),
  elementClass: ALWebBentoGrid
});
