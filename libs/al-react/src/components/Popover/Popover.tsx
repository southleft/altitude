import { createComponent } from '@lit/react';
import { ALPopover as ALWebPopover } from 'al-web-components/dist/components/popover/popover';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebPopover.el, ALWebPopover],
  suffix: PackageJson.version
});

export const ALPopover = createComponent({
  react: React,
  tagName: elementMap.get(ALWebPopover.el),
  elementClass: ALWebPopover,
  events: {}
});
