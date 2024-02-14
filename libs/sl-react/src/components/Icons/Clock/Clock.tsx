import { createComponent } from '@lit/react';
import { SLIconClock as SLWebIconClock } from 'sl-web-components/dist/components/icon/icons/clock';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconClock.el, SLWebIconClock],
  suffix: PackageJson.version
});

export const SLIconClock = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconClock.el),
  elementClass: SLWebIconClock,
  events: {}
});
