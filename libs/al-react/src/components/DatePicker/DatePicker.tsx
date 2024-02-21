import { createComponent } from '@lit/react';
import { ALDatePicker as ALWebDatePicker } from 'al-web-components/dist/components/date-picker/date-picker';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebDatePicker.el, ALWebDatePicker],
  suffix: PackageJson.version
});

export const ALDatePicker = createComponent({
  react: React,
  tagName: elementMap.get(ALWebDatePicker.el),
  elementClass: ALWebDatePicker
});
