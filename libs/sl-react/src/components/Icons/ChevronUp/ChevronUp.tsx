import { createComponent } from '@lit-labs/react';
import { SLIconChevronUp as SLWebIconChevronUp } from 'sl-web-components/dist/components/icon/icons/chevron-up';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconChevronUp.el, SLWebIconChevronUp],
  suffix: PackageJson.version
});

export const SLIconChevronUp = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconChevronUp.el),
  elementClass: SLWebIconChevronUp,
  events: {}
});
