'use client';

import { createComponent } from '@lit/react';
import { ALIconWarningTriangle as ALWebIconWarningTriangle } from '@southleft/al-web-components/components/icon/icons/warning-triangle';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconWarningTriangle.el, ALWebIconWarningTriangle],
  suffix: PackageJson.version
});

export const ALIconWarningTriangle = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconWarningTriangle.el),
  elementClass: ALWebIconWarningTriangle,
  events: {}
});
