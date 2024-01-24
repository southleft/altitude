import { createComponent } from '@lit/react';
import { SLListItem as SLWebListItem } from 'sl-web-components/dist/components/list-item/list-item';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebListItem.el, SLWebListItem],
  suffix: PackageJson.version
});

export const SLListItem = createComponent({
  react: React,
  tagName: elementMap.get(SLWebListItem.el),
  elementClass: SLWebListItem,
  events: {}
});
