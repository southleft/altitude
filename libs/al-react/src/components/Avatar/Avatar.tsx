import { createComponent } from '@lit/react';
import { ALAvatar as ALWebAvatar } from '@southleft/al-web-components/dist/components/avatar/avatar';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebAvatar.el, ALWebAvatar],
  suffix: PackageJson.version
});

export const ALAvatar = createComponent({
  react: React,
  tagName: elementMap.get(ALWebAvatar.el),
  elementClass: ALWebAvatar
});
