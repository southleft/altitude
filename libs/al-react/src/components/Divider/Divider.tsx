import { createComponent } from '@lit/react';
import { ALDivider as ALWebDivider } from 'al-web-components/dist/components/divider/divider';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebDivider.el, ALWebDivider],
  suffix: PackageJson.version
});

export const ALDivider = createComponent({
  react: React,
  tagName: elementMap.get(ALWebDivider.el),
  elementClass: ALWebDivider,
  events: {}
});
