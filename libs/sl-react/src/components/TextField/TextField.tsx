import { createComponent } from '@lit/react';
import { SLTextField as SLWebTextField } from 'sl-web-components/dist/components/text-field/text-field';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebTextField.el, SLWebTextField],
  suffix: PackageJson.version
});

export const SLTextField = createComponent({
  react: React,
  tagName: elementMap.get(SLWebTextField.el),
  elementClass: SLWebTextField,
  events: {}
});
