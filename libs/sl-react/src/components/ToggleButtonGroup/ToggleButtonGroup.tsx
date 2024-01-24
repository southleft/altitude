import { createComponent } from '@lit/react';
import { SLToggleButtonGroup as SLWebToggleButtonGroup } from 'sl-web-components/dist/components/toggle-button-group/toggle-button-group';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebToggleButtonGroup.el, SLWebToggleButtonGroup],
  suffix: PackageJson.version
});

export const SLToggleButtonGroup = createComponent({
  react: React,
  tagName: elementMap.get(SLWebToggleButtonGroup.el),
  elementClass: SLWebToggleButtonGroup,
  events: {}
});
