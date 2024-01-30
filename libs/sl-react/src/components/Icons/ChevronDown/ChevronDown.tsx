import { createComponent } from '@lit/react';
import { SLIconChevronDown as SLWebIconChevronDown } from 'sl-web-components/dist/components/icon/icons/chevron-down';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconChevronDown.el, SLWebIconChevronDown],
  suffix: PackageJson.version
});

export const SLIconChevronDown = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconChevronDown.el),
  elementClass: SLWebIconChevronDown,
  events: {}
});
