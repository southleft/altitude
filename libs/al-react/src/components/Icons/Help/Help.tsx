'use client';

import { createComponent } from '@lit/react';
import { ALIconHelp as ALWebIconHelp } from '@southleft/al-web-components/components/icon/icons/help';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json' with { type: 'json' };

const elementMap = register({
  elements: [ALWebIconHelp.el, ALWebIconHelp],
  suffix: PackageJson.version
});

export const ALIconHelp = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconHelp.el),
  elementClass: ALWebIconHelp,
  events: {}
});
