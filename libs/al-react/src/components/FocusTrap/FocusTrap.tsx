'use client';

import React from 'react';
import { createComponent } from '@lit/react';
import { ALFocusTrap as ALWebFocusTrap } from '@southleft/al-web-components/components/focus-trap';
import register from '@southleft/al-web-components/directives/register';
import PackageJson from '../../../package.json' with { type: 'json' };

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
