import { createComponent } from '@lit/react';
import { ALIconCalendar as ALWebIconCalendar } from 'al-web-components/dist/components/icon/icons/calendar';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconCalendar.el, ALWebIconCalendar],
  suffix: PackageJson.version
});

export const ALIconCalendar = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconCalendar.el),
  elementClass: ALWebIconCalendar,
  events: {}
});
