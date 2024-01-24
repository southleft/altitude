import { createComponent } from '@lit/react';
import { SLAccordionPanel as SLWebAccordionPanel } from 'sl-web-components/dist/components/accordion-panel/accordion-panel';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebAccordionPanel.el, SLWebAccordionPanel],
  suffix: PackageJson.version
});

export const SLAccordionPanel = createComponent({
  react: React,
  tagName: elementMap.get(SLWebAccordionPanel.el),
  elementClass: SLWebAccordionPanel,
  events: {}
});
