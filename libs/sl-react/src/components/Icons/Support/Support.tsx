import { createComponent } from '@lit/react';
import { SLIconSupport as SLWebIconSupport } from 'sl-web-components/dist/components/icon/icons/support';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconSupport.el, SLWebIconSupport],
  suffix: PackageJson.version
});

export const SLIconSupport = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconSupport.el),
  elementClass: SLWebIconSupport,
  events: {}
});
