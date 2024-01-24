import { createComponent } from '@lit/react';
import { SLTabPanel as SLWebTabPanel } from 'sl-web-components/dist/components/tab-panel/tab-panel';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebTabPanel.el, SLWebTabPanel],
  suffix: PackageJson.version
});

export const SLTabPanel = createComponent({
  react: React,
  tagName: elementMap.get(SLWebTabPanel.el),
  elementClass: SLWebTabPanel,
  events: {}
});
