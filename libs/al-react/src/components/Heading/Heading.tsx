import { createComponent } from '@lit/react';
import { ALHeading as ALWebHeading } from '@southleft/al-web-components/dist/components/heading/heading';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebHeading.el, ALWebHeading],
  suffix: PackageJson.version
});

export const ALHeading = createComponent({
  react: React,
  tagName: elementMap.get(ALWebHeading.el),
  elementClass: ALWebHeading,
  events: {}
});
