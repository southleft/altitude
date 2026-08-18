import { createComponent } from '@lit/react';
import { ALHeading as ALWebHeading } from 'al-web-components/components/heading';
import register from 'al-web-components/directives/register';
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
