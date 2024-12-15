import React from 'react';
import { createComponent } from '@lit/react';
import { ALLogo as ALWebLogo } from '@southleft/al-web-components/dist/components/logo/logo';
import register from '@southleft/al-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebLogo.el, ALWebLogo],
  suffix: PackageJson.version
});

export const ALLogo = createComponent({
  react: React,
  tagName: elementMap.get(ALWebLogo.el),
  elementClass: ALWebLogo,
  events: {}
});
