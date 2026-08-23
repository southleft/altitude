'use client';

import { createComponent } from '@lit/react';
import { ALIconStar as ALWebIconStar } from '@southleft/al-web-components/components/icon/icons/star';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconStar.el, ALWebIconStar],
  suffix: PackageJson.version
});

export const ALIconStar = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconStar.el),
  elementClass: ALWebIconStar,
  events: {}
});
