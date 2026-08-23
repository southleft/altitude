'use client';

import React from 'react';
import { createComponent } from '@lit/react';
import { ALRange as ALWebRange } from '@southleft/al-web-components/components/range';
import register from '@southleft/al-web-components/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebRange.el, ALWebRange],
  suffix: PackageJson.version
});

export const ALRange = createComponent({
  react: React,
  tagName: elementMap.get(ALWebRange.el),
  elementClass: ALWebRange,
  events: {
    onRangeDrag: 'onRangeDrag',
    onRangeOutputValueChange: 'onRangeOutputValueChange'
  }
});
