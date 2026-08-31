'use client';

import { createComponent } from '@lit/react';
import { ALCard as ALWebCard } from '@southleft/al-web-components/components/card';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json' with { type: 'json' };

const elementMap = register({
  elements: [ALWebCard.el, ALWebCard],
  suffix: PackageJson.version
});

export const ALCard = createComponent({
  react: React,
  tagName: elementMap.get(ALWebCard.el),
  elementClass: ALWebCard,
  events: {}
});
