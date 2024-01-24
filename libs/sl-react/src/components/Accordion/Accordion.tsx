import { createComponent } from '@lit/react';
import { SLAccordion as SLWebAccordion } from 'sl-web-components/dist/components/accordion/accordion';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebAccordion.el, SLWebAccordion],
  suffix: PackageJson.version
});

export const SLAccordion = createComponent({
  react: React,
  tagName: elementMap.get(SLWebAccordion.el),
  elementClass: SLWebAccordion,
  events: {}
});