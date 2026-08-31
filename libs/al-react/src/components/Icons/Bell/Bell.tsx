'use client';

import { createComponent } from '@lit/react';
import { ALIconBell as ALWebIconBell } from '@southleft/al-web-components/components/icon/icons/bell';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json' with { type: 'json' };

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
