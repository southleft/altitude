import { createComponent } from '@lit/react';
import { SLContextualMenu as SLWebContextualMenu } from 'sl-web-components/dist/components/contextual-menu/contextual-menu';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebContextualMenu.el, SLWebContextualMenu],
  suffix: PackageJson.version
});

export const SLContextualMenu = createComponent({
  react: React,
  tagName: elementMap.get(SLWebContextualMenu.el),
  elementClass: SLWebContextualMenu,
  events: {}
});
