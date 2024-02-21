import { createComponent } from '@lit/react';
import { ALAccordion as ALWebAccordion } from 'al-web-components/dist/components/accordion/accordion';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebAccordion.el, ALWebAccordion],
  suffix: PackageJson.version
});

export const ALAccordion = createComponent({
  react: React,
  tagName: elementMap.get(ALWebAccordion.el),
  elementClass: ALWebAccordion,
  events: {}
});