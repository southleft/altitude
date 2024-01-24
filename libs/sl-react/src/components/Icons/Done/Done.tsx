import { createComponent } from '@lit/react';
import { SLIconDone as SLWebIconDone } from 'sl-web-components/dist/components/icon/icons/done';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconDone.el, SLWebIconDone],
  suffix: PackageJson.version
});

export const SLIconDone = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconDone.el),
  elementClass: SLWebIconDone,
  events: {}
});
