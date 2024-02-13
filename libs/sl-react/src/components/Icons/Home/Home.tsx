import { createComponent } from '@lit/react';
import { SLIconHome as SLWebIconHome } from 'sl-web-components/dist/components/icon/icons/home';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconHome.el, SLWebIconHome],
  suffix: PackageJson.version
});

export const SLIconHome = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconHome.el),
  elementClass: SLWebIconHome,
  events: {}
});
