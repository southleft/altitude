import { createComponent } from '@lit/react';
import { SLTabs as SLWebTabs } from 'sl-web-components/dist/components/tabs/tabs';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebTabs.el, SLWebTabs],
  suffix: PackageJson.version
});

export const SLTabs = createComponent({
  react: React,
  tagName: elementMap.get(SLWebTabs.el),
  elementClass: SLWebTabs,
  events: {
    onTabChange: 'tabChange'
  }
});
