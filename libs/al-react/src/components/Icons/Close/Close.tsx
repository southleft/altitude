'use client';

import { createComponent } from '@lit/react';
import { ALIconClose as ALWebIconClose } from '@southleft/al-web-components/components/icon/icons/close';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconClose.el, ALWebIconClose],
  suffix: PackageJson.version
});

export const ALIconClose = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconClose.el),
  elementClass: ALWebIconClose,
  events: {}
});
