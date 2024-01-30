import { createComponent } from '@lit-labs/react';
import { SLIconList as SLWebIconList } from 'sl-web-components/dist/components/icon/icons/list';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconList.el, SLWebIconList],
  suffix: PackageJson.version
});

export const SLIconList = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconList.el),
  elementClass: SLWebIconList,
  events: {}
});
