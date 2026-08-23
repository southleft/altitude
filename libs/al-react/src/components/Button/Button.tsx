'use client';

import { createComponent } from '@lit/react';
import { ALButton as ALWebButton } from '@southleft/al-web-components/components/button';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebButton.el, ALWebButton],
  suffix: PackageJson.version
});

export const ALButton = createComponent({
  react: React,
  tagName: elementMap.get(ALWebButton.el),
  elementClass: ALWebButton,
  events: {}
});
