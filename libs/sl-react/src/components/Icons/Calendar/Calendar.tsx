import { createComponent } from '@lit-labs/react';
import { SLIconCalendar as SLWebIconCalendar } from 'sl-web-components/dist/components/icon/icons/calendar';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconCalendar.el, SLWebIconCalendar],
  suffix: PackageJson.version
});

export const SLIconCalendar = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconCalendar.el),
  elementClass: SLWebIconCalendar,
  events: {}
});
