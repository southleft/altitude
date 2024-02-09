import React from 'react';
import { createComponent } from '@lit/react';
import { SLDateTimePicker as SLWebDateTimePicker } from 'sl-web-components/dist/components/date-time-picker/date-time-picker';
import register from 'sl-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebDateTimePicker.el, SLWebDateTimePicker],
  suffix: PackageJson.version
});

export const SLDateTimePicker = createComponent({
  react: React,
  tagName: elementMap.get(SLWebDateTimePicker.el),
  elementClass: SLWebDateTimePicker,
  events: {}
});
