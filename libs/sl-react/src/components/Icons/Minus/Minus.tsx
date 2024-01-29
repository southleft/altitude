import { createComponent } from '@lit-labs/react';
import { SLIconMinus as SLWebIconMinus } from 'sl-web-components/dist/components/icon/icons/minus';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconMinus.el, SLWebIconMinus],
  suffix: PackageJson.version
});

export const SLIconMinus = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconMinus.el),
  elementClass: SLWebIconMinus,
  events: {}
});
