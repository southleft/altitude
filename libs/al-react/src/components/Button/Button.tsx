import { createComponent } from '@lit/react';
import { ALButton as ALWebButton } from '@southleft/al-web-components/dist/components/button/button';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebButton.el, ALWebButton],
  suffix: PackageJson.version
});

export const ALButton = createComponent({
  react: React,
  tagName: elementMap.get(ALWebButton.el),
  elementClass: ALWebButton,
  events: {}
});
