'use client';

import { createComponent } from '@lit/react';
import { ALIconBell as ALWebIconBell } from 'al-web-components/components/icon/icons/bell';
import register from 'al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconBell.el, ALWebIconBell],
  suffix: PackageJson.version
});

export const ALIconBell = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconBell.el),
  elementClass: ALWebIconBell,
  events: {}
});
