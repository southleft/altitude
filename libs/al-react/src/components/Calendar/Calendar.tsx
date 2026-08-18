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
    onChange: 'change'
  }
});
