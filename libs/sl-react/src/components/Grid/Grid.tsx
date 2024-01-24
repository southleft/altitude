import { createComponent } from '@lit/react';
import { SLGrid as SLWebGrid } from 'sl-web-components/dist/components/grid/grid';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebGrid.el, SLWebGrid],
  suffix: PackageJson.version
});

export const SLGrid = createComponent({
  react: React,
  tagName: elementMap.get(SLWebGrid.el),
  elementClass: SLWebGrid
});
