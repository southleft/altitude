import React from 'react';
import { createComponent } from '@lit/react';
import { SLDrawer as SLWebDrawer } from 'sl-web-components/dist/components/drawer/drawer';
import register from 'sl-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebDrawer.el, SLWebDrawer],
  suffix: PackageJson.version
});

export const SLDrawer = createComponent({
  react: React,
  tagName: elementMap.get(SLWebDrawer.el),
  elementClass: SLWebDrawer,
  events: {}
});
