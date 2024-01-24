import { createComponent } from '@lit/react';
import { SLDropdownPanel as SLWebDropdownPanel } from 'sl-web-components/dist/components/dropdown-panel/dropdown-panel';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebDropdownPanel.el, SLWebDropdownPanel],
  suffix: PackageJson.version
});

export const SLDropdownPanel = createComponent({
  react: React,
  tagName: elementMap.get(SLWebDropdownPanel.el),
  elementClass: SLWebDropdownPanel,
  events: {}
});
