import { createComponent } from '@lit/react';
import { ALTextarea as ALWebTextarea } from 'al-web-components/dist/components/textarea/textarea';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebTextarea.el, ALWebTextarea],
  suffix: PackageJson.version
});

export const ALTextarea = createComponent({
  react: React,
  tagName: elementMap.get(ALWebTextarea.el),
  elementClass: ALWebTextarea,
  events: {}
});
