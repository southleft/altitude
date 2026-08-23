'use client';

import { createComponent } from '@lit/react';
import { ALIcon as ALWebIcon } from 'al-web-components/components/icon';
import register from 'al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebIcon.el, ALWebIcon],
  suffix: PackageJson.version
});

export const ALIcon = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIcon.el),
  elementClass: ALWebIcon
});
