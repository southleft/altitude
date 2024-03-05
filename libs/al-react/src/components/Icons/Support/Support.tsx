import { createComponent } from '@lit/react';
import { ALIconSupport as ALWebIconSupport } from 'al-web-components/dist/components/icon/icons/support';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconSupport.el, ALWebIconSupport],
  suffix: PackageJson.version
});

export const ALIconSupport = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconSupport.el),
  elementClass: ALWebIconSupport,
  events: {}
});
