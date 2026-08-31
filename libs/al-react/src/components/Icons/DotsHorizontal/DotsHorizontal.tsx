'use client';

import { createComponent } from '@lit/react';
import { ALIconDotsHorizontal as ALWebIconDotsHorizontal } from '@southleft/al-web-components/components/icon/icons/dots-horizontal';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json' with { type: 'json' };

const elementMap = register({
  elements: [ALWebIconDotsHorizontal.el, ALWebIconDotsHorizontal],
  suffix: PackageJson.version
});

export const ALIconDotsHorizontal = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconDotsHorizontal.el),
  elementClass: ALWebIconDotsHorizontal,
  events: {}
});
