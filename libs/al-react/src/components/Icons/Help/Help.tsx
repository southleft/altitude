import { createComponent } from '@lit/react';
import { ALIconHelp as ALWebIconHelp } from 'al-web-components/dist/components/icon/icons/help';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconHelp.el, ALWebIconHelp],
  suffix: PackageJson.version
});

export const ALIconHelp = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconHelp.el),
  elementClass: ALWebIconHelp,
  events: {}
});
