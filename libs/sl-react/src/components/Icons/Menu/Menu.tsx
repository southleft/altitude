import { createComponent } from '@lit-labs/react';
import { SLIconMenu as SLWebIconMenu } from 'sl-web-components/dist/sl/components/icon/icons/menu';
import register from 'sl-web-components/dist/sl/directives/register';
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
