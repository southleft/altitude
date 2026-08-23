'use client';

import { createComponent } from '@lit/react';
import { ALIconUser as ALWebIconUser } from '@southleft/al-web-components/components/icon/icons/user';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconUser.el, ALWebIconUser],
  suffix: PackageJson.version
});

export const ALIconUser = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconUser.el),
  elementClass: ALWebIconUser,
  events: {}
});
