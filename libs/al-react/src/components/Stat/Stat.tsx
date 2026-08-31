'use client';

import { createComponent } from '@lit/react';
import { ALStat as ALWebStat } from '@southleft/al-web-components/components/stat';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json' with { type: 'json' };

const elementMap = register({
  elements: [ALWebStat.el, ALWebStat],
  suffix: PackageJson.version
});

export const ALStat = createComponent({
  react: React,
  tagName: elementMap.get(ALWebStat.el),
  elementClass: ALWebStat
});
