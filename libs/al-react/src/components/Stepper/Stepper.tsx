'use client';

import { createComponent } from '@lit/react';
import { ALStepper as ALWebStepper } from 'al-web-components/components/stepper';
import register from 'al-web-components/directives/register';
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
