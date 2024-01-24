import { createComponent } from '@lit/react';
import { SLCalendar as SLWebCalendar } from 'sl-web-components/dist/components/calendar/calendar';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebCalendar.el, SLWebCalendar],
  suffix: PackageJson.version
});

export const SLCalendar = createComponent({
  react: React,
  tagName: elementMap.get(SLWebCalendar.el),
  elementClass: SLWebCalendar,
  events: {
    onChange: 'change'
  }
});
