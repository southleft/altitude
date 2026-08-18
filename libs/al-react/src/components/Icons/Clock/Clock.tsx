import { createComponent } from '@lit/react';
import { ALIconClock as ALWebIconClock } from 'al-web-components/components/icon/icons/clock';
import register from 'al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconClock.el, ALWebIconClock],
  suffix: PackageJson.version
});

export const ALIconClock = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconClock.el),
  elementClass: ALWebIconClock,
  events: {}
});
