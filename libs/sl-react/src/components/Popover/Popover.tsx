import { createComponent } from '@lit/react';
import { SLPopover as SLWebPopover } from 'sl-web-components/dist/components/popover/popover';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebPopover.el, SLWebPopover],
  suffix: PackageJson.version
});

export const SLPopover = createComponent({
  react: React,
  tagName: elementMap.get(SLWebPopover.el),
  elementClass: SLWebPopover,
  events: {}
});
