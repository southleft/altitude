import { createComponent } from '@lit/react';
import { SLInputStepper as SLWebInputStepper } from 'sl-web-components/dist/components/input-stepper/input-stepper';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebInputStepper.el, SLWebInputStepper],
  suffix: PackageJson.version
});

export const SLInputStepper = createComponent({
  react: React,
  tagName: elementMap.get(SLWebInputStepper.el),
  elementClass: SLWebInputStepper,
  events: {
    onChange: 'change'
  }
});
