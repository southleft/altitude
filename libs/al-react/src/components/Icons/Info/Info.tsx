'use client';

import { createComponent } from '@lit/react';
import { ALIconInfo as ALWebIconInfo } from 'al-web-components/components/icon/icons/info';
import register from 'al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconInfo.el, ALWebIconInfo],
  suffix: PackageJson.version
});

export const ALIconInfo = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconInfo.el),
  elementClass: ALWebIconInfo,
  events: {}
});
