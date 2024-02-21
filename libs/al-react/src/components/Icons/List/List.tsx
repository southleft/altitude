import { createComponent } from '@lit/react';
import { ALIconList as ALWebIconList } from 'al-web-components/dist/components/icon/icons/list';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconList.el, ALWebIconList],
  suffix: PackageJson.version
});

export const ALIconList = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconList.el),
  elementClass: ALWebIconList,
  events: {}
});
