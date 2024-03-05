import { createComponent } from '@lit/react';
import { ALListItem as ALWebListItem } from 'al-web-components/dist/components/list-item/list-item';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebListItem.el, ALWebListItem],
  suffix: PackageJson.version
});

export const ALListItem = createComponent({
  react: React,
  tagName: elementMap.get(ALWebListItem.el),
  elementClass: ALWebListItem,
  events: {}
});
