import { createComponent } from '@lit/react';
import { SLMenuItem as SLWebMenuItem } from 'sl-web-components/dist/components/menu-item/menu-item';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebMenuItem.el, SLWebMenuItem],
  suffix: PackageJson.version
});

export const SLMenuItem = createComponent({
  react: React,
  tagName: elementMap.get(SLWebMenuItem.el),
  elementClass: SLWebMenuItem,
  events: {}
});
