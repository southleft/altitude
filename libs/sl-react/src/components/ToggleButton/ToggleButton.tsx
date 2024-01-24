import { createComponent } from '@lit/react';
import { SLToggleButton as SLWebToggleButton } from 'sl-web-components/dist/components/toggle-button/toggle-button';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebToggleButton.el, SLWebToggleButton],
  suffix: PackageJson.version
});

export const SLToggleButton = createComponent({
  react: React,
  tagName: elementMap.get(SLWebToggleButton.el),
  elementClass: SLWebToggleButton,
  events: {}
});
