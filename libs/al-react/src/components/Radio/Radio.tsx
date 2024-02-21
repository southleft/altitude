import { createComponent } from '@lit/react';
import { ALRadio as ALWebRadio } from 'al-web-components/dist/components/radio/radio';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebRadio.el, ALWebRadio],
  suffix: PackageJson.version
});

export const ALRadio = createComponent({
  react: React,
  tagName: elementMap.get(ALWebRadio.el),
  elementClass: ALWebRadio,
  events: {}
});
