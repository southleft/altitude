import { createComponent } from '@lit/react';
import { SLDatepickerField as SLWebDatepickerField } from 'sl-web-components/dist/components/datepicker-field/datepicker-field';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebDatepickerField.el, SLWebDatepickerField],
  suffix: PackageJson.version
});

export const SLDatepickerField = createComponent({
  react: React,
  tagName: elementMap.get(SLWebDatepickerField.el),
  elementClass: SLWebDatepickerField
});
