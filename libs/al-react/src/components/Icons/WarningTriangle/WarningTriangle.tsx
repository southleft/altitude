import { createComponent } from '@lit/react';
import { ALIconWarningTriangle as ALWebIconWarningTriangle } from 'al-web-components/dist/components/icon/icons/warning-triangle';
import register from 'al-web-components/dist/directives/register';
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
