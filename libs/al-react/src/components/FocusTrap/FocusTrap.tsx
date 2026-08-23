'use client';

import React from 'react';
import { createComponent } from '@lit/react';
import { ALFocusTrap as ALWebFocusTrap } from 'al-web-components/components/focus-trap';
import register from 'al-web-components/directives/register';
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
