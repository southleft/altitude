import { createComponent } from '@lit-labs/react';
import { SLIconChevronRight as SLWebIconChevronRight } from 'sl-web-components/dist/sl/components/icon/icons/chevron-right';
import register from 'sl-web-components/dist/sl/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconChevronRight.el, SLWebIconChevronRight],
  suffix: PackageJson.version
});

export const SLIconChevronRight = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconChevronRight.el),
  elementClass: SLWebIconChevronRight,
  events: {}
});
