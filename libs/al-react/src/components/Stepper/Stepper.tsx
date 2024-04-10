import { createComponent } from '@lit/react';
import { ALStepper as ALWebStepper } from '@southleft/al-web-components/dist/components/stepper/stepper';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebStepper.el, ALWebStepper],
  suffix: PackageJson.version
});

export const ALStepper = createComponent({
  react: React,
  tagName: elementMap.get(ALWebStepper.el),
  elementClass: ALWebStepper,
  events: {}
});
