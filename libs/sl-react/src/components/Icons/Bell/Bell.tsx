import { createComponent } from '@lit/react';
import { SLIconBell as SLWebIconBell } from 'sl-web-components/dist/components/icon/icons/bell';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconBell.el, SLWebIconBell],
  suffix: PackageJson.version
});

export const SLIconBell = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconBell.el),
  elementClass: SLWebIconBell,
  events: {}
});
