'use client';

import { createComponent } from '@lit/react';
import { ALIconChevronDown as ALWebIconChevronDown } from 'al-web-components/components/icon/icons/chevron-down';
import register from 'al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconChevronDown.el, ALWebIconChevronDown],
  suffix: PackageJson.version
});

export const ALIconChevronDown = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconChevronDown.el),
  elementClass: ALWebIconChevronDown,
  events: {}
});
