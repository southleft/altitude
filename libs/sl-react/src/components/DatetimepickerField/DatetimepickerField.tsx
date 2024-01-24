import React from 'react';
import { createComponent } from '@lit/react';
import { SLDatetimepickerField as SLWebDatetimepickerField } from 'sl-web-components/dist/components/datetimepicker-field/datetimepicker-field';
import register from 'sl-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebDatetimepickerField.el, SLWebDatetimepickerField],
  suffix: PackageJson.version
});

export const SLDatetimepickerField = createComponent({
  react: React,
  tagName: elementMap.get(SLWebDatetimepickerField.el),
  elementClass: SLWebDatetimepickerField,
  events: {}
});
