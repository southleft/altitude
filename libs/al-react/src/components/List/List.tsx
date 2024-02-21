import { createComponent } from '@lit/react';
import { ALList as ALWebList } from 'al-web-components/dist/components/list/list';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebList.el, ALWebList],
  suffix: PackageJson.version
});

export const ALList = createComponent({
  react: React,
  tagName: elementMap.get(ALWebList.el),
  elementClass: ALWebList,
  events: {}
});
