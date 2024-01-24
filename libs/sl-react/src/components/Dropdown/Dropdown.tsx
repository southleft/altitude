import { createComponent } from '@lit/react';
import { SLDropdown as SLWebDropdown } from 'sl-web-components/dist/components/dropdown/dropdown';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebDropdown.el, SLWebDropdown],
  suffix: PackageJson.version
});

export const SLDropdown = createComponent({
  react: React,
  tagName: elementMap.get(SLWebDropdown.el),
  elementClass: SLWebDropdown,
  events: {}
});
