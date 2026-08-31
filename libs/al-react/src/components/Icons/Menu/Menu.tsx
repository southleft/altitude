'use client';

import { createComponent } from '@lit/react';
import { ALIconMenu as ALWebIconMenu } from '@southleft/al-web-components/components/icon/icons/menu';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json' with { type: 'json' };

const elementMap = register({
  elements: [ALWebIconMenu.el, ALWebIconMenu],
  suffix: PackageJson.version
});

export const ALIconMenu = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconMenu.el),
  elementClass: ALWebIconMenu,
  events: {}
});
