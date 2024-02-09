import { createComponent } from '@lit/react';
import { SLToggle as SLWebToggle } from 'sl-web-components/dist/components/toggle/toggle';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebToggle.el, SLWebToggle],
  suffix: PackageJson.version
});

export const SLToggle = createComponent({
  react: React,
  tagName: elementMap.get(SLWebToggle.el),
  elementClass: SLWebToggle,
  events: {}
});
