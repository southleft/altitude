import { createComponent } from '@lit/react';
import { SLDatePicker as SLWebDatePicker } from 'sl-web-components/dist/components/date-picker/date-picker';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebDatePicker.el, SLWebDatePicker],
  suffix: PackageJson.version
});

export const SLDatePicker = createComponent({
  react: React,
  tagName: elementMap.get(SLWebDatePicker.el),
  elementClass: SLWebDatePicker
});
