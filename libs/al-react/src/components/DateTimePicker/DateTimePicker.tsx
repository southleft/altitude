import React from 'react';
import { createComponent } from '@lit/react';
import { ALDateTimePicker as ALWebDateTimePicker } from 'al-web-components/dist/components/date-time-picker/date-time-picker';
import register from 'al-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebDateTimePicker.el, ALWebDateTimePicker],
  suffix: PackageJson.version
});

export const ALDateTimePicker = createComponent({
  react: React,
  tagName: elementMap.get(ALWebDateTimePicker.el),
  elementClass: ALWebDateTimePicker,
  events: {}
});
