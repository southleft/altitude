import { createComponent } from '@lit/react';
import { SLGridItem as SLWebGridItem } from 'sl-web-components/dist/components/grid-item/grid-item';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebGridItem.el, SLWebGridItem],
  suffix: PackageJson.version
});

export const SLGridItem = createComponent({
  react: React,
  tagName: elementMap.get(SLWebGridItem.el),
  elementClass: SLWebGridItem
});
