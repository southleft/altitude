import { createComponent } from '@lit/react';
import { ALInputStepper as ALWebInputStepper } from 'al-web-components/components/input-stepper';
import register from 'al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebInputStepper.el, ALWebInputStepper],
  suffix: PackageJson.version
});

export const ALInputStepper = createComponent({
  react: React,
  tagName: elementMap.get(ALWebInputStepper.el),
  elementClass: ALWebInputStepper,
  events: {
    onInputStepperChange: 'onInputStepperChange'
  }
});
