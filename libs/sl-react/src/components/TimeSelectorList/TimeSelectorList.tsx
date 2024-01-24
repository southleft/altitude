import React from 'react';
import { createComponent } from '@lit/react';
import { SLTimeSelectorList as SLWebTimeSelectorList } from 'sl-web-components/dist/components/time-selector-list/time-selector-list';
import register from 'sl-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebTimeSelectorList.el, SLWebTimeSelectorList],
  suffix: PackageJson.version
});

export const SLTimeSelectorList = createComponent({
  react: React,
  tagName: elementMap.get(SLWebTimeSelectorList.el),
  elementClass: SLWebTimeSelectorList,
  events: {}
});
