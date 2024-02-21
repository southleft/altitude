import { createComponent } from '@lit/react';
import { ALToast as ALWebToast } from 'al-web-components/dist/components/toast/toast';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebToast.el, ALWebToast],
  suffix: PackageJson.version
});

export const ALToast = createComponent({
  react: React,
  tagName: elementMap.get(ALWebToast.el),
  elementClass: ALWebToast,
  events: {}
});
