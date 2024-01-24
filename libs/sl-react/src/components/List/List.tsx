import { createComponent } from '@lit/react';
import { SLList as SLWebList } from 'sl-web-components/dist/components/list/list';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebList.el, SLWebList],
  suffix: PackageJson.version
});

export const SLList = createComponent({
  react: React,
  tagName: elementMap.get(SLWebList.el),
  elementClass: SLWebList,
  events: {}
});
