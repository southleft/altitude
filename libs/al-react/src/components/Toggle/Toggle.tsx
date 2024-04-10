import { createComponent } from '@lit/react';
import { ALToggle as ALWebToggle } from '@southleft/al-web-components/dist/components/toggle/toggle';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebToggle.el, ALWebToggle],
  suffix: PackageJson.version
});

export const ALToggle = createComponent({
  react: React,
  tagName: elementMap.get(ALWebToggle.el),
  elementClass: ALWebToggle,
  events: {}
});
