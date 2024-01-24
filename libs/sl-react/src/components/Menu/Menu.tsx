import { createComponent } from '@lit/react';
import { SLMenu as SLWebMenu } from 'sl-web-components/dist/components/menu/menu';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebMenu.el, SLWebMenu],
  suffix: PackageJson.version
});

export const SLMenu = createComponent({
  react: React,
  tagName: elementMap.get(SLWebMenu.el),
  elementClass: SLWebMenu,
  events: {}
});
