'use client';

import { createComponent } from '@lit/react';
import { ALIconFilter as ALWebIconFilter } from '@southleft/al-web-components/components/icon/icons/filter';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json' with { type: 'json' };

const elementMap = register({
  elements: [ALWebIconFilter.el, ALWebIconFilter],
  suffix: PackageJson.version
});

export const ALIconFilter = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconFilter.el),
  elementClass: ALWebIconFilter,
  events: {}
});
