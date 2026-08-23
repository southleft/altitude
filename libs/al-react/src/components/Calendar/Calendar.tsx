'use client';

import { createComponent } from '@lit/react';
import { ALCalendar as ALWebCalendar } from 'al-web-components/components/calendar';
import register from 'al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebCalendar.el, ALWebCalendar],
  suffix: PackageJson.version
});

export const ALCalendar = createComponent({
  react: React,
  tagName: elementMap.get(ALWebCalendar.el),
  elementClass: ALWebCalendar,
  events: {
    // al-calendar dispatches 'onCalendarChange' (calendar.ts:524) and nothing
    // else. This used to be `onChange: 'change'` — an event the web component
    // never fires, so the React prop was dead.
    onCalendarChange: 'onCalendarChange'
  }
});
