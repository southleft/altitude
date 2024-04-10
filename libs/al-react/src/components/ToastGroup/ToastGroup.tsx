import { createComponent } from '@lit/react';
import { ALToastGroup as ALWebToastGroup } from '@southleft/al-web-components/dist/components/toast-group/toast-group';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebToastGroup.el, ALWebToastGroup],
  suffix: PackageJson.version
});

export const ALToastGroup = createComponent({
  react: React,
  tagName: elementMap.get(ALWebToastGroup.el),
  elementClass: ALWebToastGroup,
  events: {}
});
