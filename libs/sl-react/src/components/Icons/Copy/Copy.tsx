import { createComponent } from '@lit/react';
import { SLIconCopy as SLWebIconCopy } from 'sl-web-components/dist/components/icon/icons/copy';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconCopy.el, SLWebIconCopy],
  suffix: PackageJson.version
});

export const SLIconCopy = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconCopy.el),
  elementClass: SLWebIconCopy,
  events: {}
});
