import { createComponent } from '@lit/react';
import { ALInput as ALWebInput } from 'al-web-components/dist/components/input/input';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebInput.el, ALWebInput],
  suffix: PackageJson.version
});

export const ALInput = createComponent({
  react: React,
  tagName: elementMap.get(ALWebInput.el),
  elementClass: ALWebInput,
  events: {}
});
