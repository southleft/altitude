import { createComponent } from '@lit/react';
import { ALSelect as ALWebSelect } from 'al-web-components/dist/components/select/select';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebSelect.el, ALWebSelect],
  suffix: PackageJson.version
});

export const ALSelect = createComponent({
  react: React,
  tagName: elementMap.get(ALWebSelect.el),
  elementClass: ALWebSelect,
  events: {}
});
