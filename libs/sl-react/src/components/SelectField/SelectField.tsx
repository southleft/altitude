import { createComponent } from '@lit/react';
import { SLSelectField as SLWebSelectField } from 'sl-web-components/dist/components/select-field/select-field';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebSelectField.el, SLWebSelectField],
  suffix: PackageJson.version
});

export const SLSelectField = createComponent({
  react: React,
  tagName: elementMap.get(SLWebSelectField.el),
  elementClass: SLWebSelectField,
  events: {}
});
