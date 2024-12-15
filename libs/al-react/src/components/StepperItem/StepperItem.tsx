import { createComponent } from '@lit/react';
import { ALStepperItem as ALWebStepperItem } from '@southleft/al-web-components/dist/components/stepper-item/stepper-item';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebStepperItem.el, ALWebStepperItem],
  suffix: PackageJson.version
});

export const ALStepperItem = createComponent({
  react: React,
  tagName: elementMap.get(ALWebStepperItem.el),
  elementClass: ALWebStepperItem,
  events: {}
});
