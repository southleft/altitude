import { createComponent } from '@lit/react';
import { ALLink as ALWebLink } from '@southleft/al-web-components/dist/components/link/link';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebLink.el, ALWebLink],
  suffix: PackageJson.version
});

export const ALLink = createComponent({
  react: React,
  tagName: elementMap.get(ALWebLink.el),
  elementClass: ALWebLink,
  events: {}
});
