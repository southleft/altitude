'use client';

import React from 'react';
import { createComponent } from '@lit/react';
import { ALSkeleton as ALWebSkeleton } from '@southleft/al-web-components/components/skeleton';
import register from '@southleft/al-web-components/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebSkeleton.el, ALWebSkeleton],
  suffix: PackageJson.version
});

export const ALSkeleton = createComponent({
  react: React,
  tagName: elementMap.get(ALWebSkeleton.el),
  elementClass: ALWebSkeleton,
  events: {}
});
