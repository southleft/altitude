import { createComponent } from '@lit/react';
import { SLSpinner as SLWebSpinner } from 'sl-web-components/dist/components/spinner/spinner';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebSpinner.el, SLWebSpinner],
  suffix: PackageJson.version
});

export const SLSpinner = createComponent({
  react: React,
  tagName: elementMap.get(SLWebSpinner.el),
  elementClass: SLWebSpinner,
  events: {}
});
