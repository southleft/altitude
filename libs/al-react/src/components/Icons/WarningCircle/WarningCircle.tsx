import { createComponent } from '@lit/react';
import { ALIconWarningCircle as ALWebIconWarningCircle } from 'al-web-components/dist/components/icon/icons/warning-circle';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconWarningCircle.el, ALWebIconWarningCircle],
  suffix: PackageJson.version
});

export const ALIconWarningCircle = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconWarningCircle.el),
  elementClass: ALWebIconWarningCircle,
  events: {}
});
