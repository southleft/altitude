import { createComponent } from '@lit/react';
import { SLIconChevronLeft as SLWebIconChevronLeft } from 'sl-web-components/dist/components/icon/icons/chevron-left';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconChevronLeft.el, SLWebIconChevronLeft],
  suffix: PackageJson.version
});

export const SLIconChevronLeft = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconChevronLeft.el),
  elementClass: SLWebIconChevronLeft,
  events: {}
});
