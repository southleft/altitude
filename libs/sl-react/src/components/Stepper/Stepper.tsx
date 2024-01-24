import { createComponent } from '@lit/react';
import { SLStepper as SLWebStepper } from 'sl-web-components/dist/components/stepper/stepper';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebStepper.el, SLWebStepper],
  suffix: PackageJson.version
});

export const SLStepper = createComponent({
  react: React,
  tagName: elementMap.get(SLWebStepper.el),
  elementClass: SLWebStepper,
  events: {}
});
