'use client';

import { createComponent } from '@lit/react';
import { ALAvatar as ALWebAvatar } from 'al-web-components/components/avatar';
import register from 'al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebAvatar.el, ALWebAvatar],
  suffix: PackageJson.version
});

export const ALAvatar = createComponent({
  react: React,
  tagName: elementMap.get(ALWebAvatar.el),
  elementClass: ALWebAvatar
});
