'use client';

import { createComponent } from '@lit/react';
import { ALDatePicker as ALWebDatePicker } from '@southleft/al-web-components/components/date-picker';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebDatePicker.el, ALWebDatePicker],
  suffix: PackageJson.version
});

export const ALDatePicker = createComponent({
  react: React,
  tagName: elementMap.get(ALWebDatePicker.el),
  elementClass: ALWebDatePicker,
  events: {
    onDatePickerChange: 'onDatePickerChange',
    onDatePickerClose: 'onDatePickerClose',
    onDatePickerOpen: 'onDatePickerOpen'
  }
});
