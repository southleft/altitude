'use client';

import { createComponent } from '@lit/react';
import { ALIconCalendar as ALWebIconCalendar } from '@southleft/al-web-components/components/icon/icons/calendar';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json' with { type: 'json' };

const elementMap = register({
  elements: [ALWebIconCalendar.el, ALWebIconCalendar],
  suffix: PackageJson.version
});

export const ALIconCalendar = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconCalendar.el),
  elementClass: ALWebIconCalendar,
  events: {
    onCalendarChange: 'onCalendarChange'
  }
});
