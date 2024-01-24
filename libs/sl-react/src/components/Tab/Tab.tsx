import { createComponent } from '@lit/react';
import { SLTab as SLWebTab } from 'sl-web-components/dist/components/tab/tab';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebTab.el, SLWebTab],
  suffix: PackageJson.version
});

export const SLTab = createComponent({
  react: React,
  tagName: elementMap.get(SLWebTab.el),
  elementClass: SLWebTab,
  events: {
    onTabSelect: 'tabSelect'
  }
});
