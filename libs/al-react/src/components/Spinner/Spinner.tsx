'use client';

import { createComponent } from '@lit/react';
import { ALSpinner as ALWebSpinner } from '@southleft/al-web-components/components/spinner';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebSpinner.el, ALWebSpinner],
  suffix: PackageJson.version
});

export const ALSpinner = createComponent({
  react: React,
  tagName: elementMap.get(ALWebSpinner.el),
  elementClass: ALWebSpinner,
  events: {}
});
