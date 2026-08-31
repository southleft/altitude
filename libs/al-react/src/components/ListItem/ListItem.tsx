'use client';

import { createComponent } from '@lit/react';
import { ALListItem as ALWebListItem } from '@southleft/al-web-components/components/list-item';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json' with { type: 'json' };

const elementMap = register({
  elements: [ALWebListItem.el, ALWebListItem],
  suffix: PackageJson.version
});

export const ALListItem = createComponent({
  react: React,
  tagName: elementMap.get(ALWebListItem.el),
  elementClass: ALWebListItem,
  events: {}
});
