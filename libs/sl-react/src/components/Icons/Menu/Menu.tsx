import { createComponent } from '@lit/react';
import { SLIconMenu as SLWebIconMenu } from 'sl-web-components/dist/components/icon/icons/menu';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconMenu.el, SLWebIconMenu],
  suffix: PackageJson.version
});

export const SLIconMenu = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconMenu.el),
  elementClass: SLWebIconMenu,
  events: {}
});
