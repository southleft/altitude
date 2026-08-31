'use client';

import React from 'react';
import { createComponent } from '@lit/react';
import { ALDateTimePicker as ALWebDateTimePicker } from '@southleft/al-web-components/components/date-time-picker';
import register from '@southleft/al-web-components/directives/register';
import PackageJson from '../../../package.json' with { type: 'json' };

const elementMap = register({
  elements: [ALWebDateTimePicker.el, ALWebDateTimePicker],
  suffix: PackageJson.version
});

export const ALDateTimePicker = createComponent({
  react: React,
  tagName: elementMap.get(ALWebDateTimePicker.el),
  elementClass: ALWebDateTimePicker,
  events: {
    onDateTimePickerClose: 'onDateTimePickerClose',
    onDateTimePickerDateChange: 'onDateTimePickerDateChange',
    onDateTimePickerOpen: 'onDateTimePickerOpen',
    onDateTimePickerTimeChange: 'onDateTimePickerTimeChange'
  }
});
