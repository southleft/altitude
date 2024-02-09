import { createComponent } from '@lit/react';
import { SLIconCheck as SLWebIconCheck } from 'sl-web-components/dist/components/icon/icons/check';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconCheck.el, SLWebIconCheck],
  suffix: PackageJson.version
});

export const SLIconCheck = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconCheck.el),
  elementClass: SLWebIconCheck,
  events: {}
});
