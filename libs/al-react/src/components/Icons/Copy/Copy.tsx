'use client';

import { createComponent } from '@lit/react';
import { ALIconCopy as ALWebIconCopy } from '@southleft/al-web-components/components/icon/icons/copy';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconCopy.el, ALWebIconCopy],
  suffix: PackageJson.version
});

export const ALIconCopy = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconCopy.el),
  elementClass: ALWebIconCopy,
  events: {}
});
