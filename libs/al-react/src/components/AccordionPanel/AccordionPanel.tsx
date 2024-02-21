import { createComponent } from '@lit/react';
import { ALAccordionPanel as ALWebAccordionPanel } from 'al-web-components/dist/components/accordion-panel/accordion-panel';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebAccordionPanel.el, ALWebAccordionPanel],
  suffix: PackageJson.version
});

export const ALAccordionPanel = createComponent({
  react: React,
  tagName: elementMap.get(ALWebAccordionPanel.el),
  elementClass: ALWebAccordionPanel,
  events: {}
});
