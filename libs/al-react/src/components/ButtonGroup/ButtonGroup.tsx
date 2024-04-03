import { createComponent } from '@lit/react';
import { ALButtonGroup as ALWebButtonGroup } from '@southleft/al-web-components/dist/components/button-group/button-group';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebButtonGroup.el, ALWebButtonGroup],
  suffix: PackageJson.version
});

export const ALButtonGroup = createComponent({
  react: React,
  tagName: elementMap.get(ALWebButtonGroup.el),
  elementClass: ALWebButtonGroup,
  events: {}
});
