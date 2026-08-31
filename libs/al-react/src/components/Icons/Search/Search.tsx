'use client';

import { createComponent } from '@lit/react';
import { ALIconSearch as ALWebIconSearch } from '@southleft/al-web-components/components/icon/icons/search';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json' with { type: 'json' };

const elementMap = register({
  elements: [ALWebIconSearch.el, ALWebIconSearch],
  suffix: PackageJson.version
});

export const ALIconSearch = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconSearch.el),
  elementClass: ALWebIconSearch,
  events: {}
});
