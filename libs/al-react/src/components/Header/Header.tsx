import React from 'react';
import { createComponent } from '@lit/react';
import { ALHeader as ALWebHeader } from '@southleft/al-web-components/dist/components/header/header';
import register from '@southleft/al-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebHeader.el, ALWebHeader],
  suffix: PackageJson.version
});

export const ALHeader = createComponent({
  react: React,
  tagName: elementMap.get(ALWebHeader.el),
  elementClass: ALWebHeader,
  events: {}
});
