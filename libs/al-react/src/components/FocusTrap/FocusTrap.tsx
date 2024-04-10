import React from 'react';
import { createComponent } from '@lit/react';
import { ALFocusTrap as ALWebFocusTrap } from '@southleft/al-web-components/dist/components/focus-trap/focus-trap';
import register from '@southleft/al-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebFocusTrap.el, ALWebFocusTrap],
  suffix: PackageJson.version
});

export const ALFocusTrap = createComponent({
  react: React,
  tagName: elementMap.get(ALWebFocusTrap.el),
  elementClass: ALWebFocusTrap,
  events: {}
});
