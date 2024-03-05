import { createComponent } from '@lit/react';
import { ALToggleButtonGroup as ALWebToggleButtonGroup } from 'al-web-components/dist/components/toggle-button-group/toggle-button-group';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebToggleButtonGroup.el, ALWebToggleButtonGroup],
  suffix: PackageJson.version
});

export const ALToggleButtonGroup = createComponent({
  react: React,
  tagName: elementMap.get(ALWebToggleButtonGroup.el),
  elementClass: ALWebToggleButtonGroup,
  events: {}
});
