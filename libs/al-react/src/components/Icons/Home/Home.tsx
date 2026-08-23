'use client';

import { createComponent } from '@lit/react';
import { ALIconHome as ALWebIconHome } from 'al-web-components/components/icon/icons/home';
import register from 'al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconHome.el, ALWebIconHome],
  suffix: PackageJson.version
});

export const ALIconHome = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconHome.el),
  elementClass: ALWebIconHome,
  events: {}
});
