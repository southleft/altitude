import React from 'react';
import { createComponent } from '@lit/react';
import { SLFocusTrap as SLWebFocusTrap } from 'sl-web-components/dist/components/focus-trap/focus-trap';
import register from 'sl-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebFocusTrap.el, SLWebFocusTrap],
  suffix: PackageJson.version
});

export const SLFocusTrap = createComponent({
  react: React,
  tagName: elementMap.get(SLWebFocusTrap.el),
  elementClass: SLWebFocusTrap,
  events: {}
});
