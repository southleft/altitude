'use client';

import { createComponent } from '@lit/react';
import { ALIconSuccess as ALWebIconSuccess } from '@southleft/al-web-components/components/icon/icons/success';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json' with { type: 'json' };

const elementMap = register({
  elements: [ALWebIconSuccess.el, ALWebIconSuccess],
  suffix: PackageJson.version
});

export const ALIconSuccess = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconSuccess.el),
  elementClass: ALWebIconSuccess,
  events: {}
});
