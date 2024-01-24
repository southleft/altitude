import { createComponent } from '@lit/react';
import { SLStepperItem as SLWebStepperItem } from 'sl-web-components/dist/components/stepper-item/stepper-item';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebStepperItem.el, SLWebStepperItem],
  suffix: PackageJson.version
});

export const SLStepperItem = createComponent({
  react: React,
  tagName: elementMap.get(SLWebStepperItem.el),
  elementClass: SLWebStepperItem,
  events: {}
});
