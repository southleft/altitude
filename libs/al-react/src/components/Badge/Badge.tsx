'use client';

import { createComponent } from '@lit/react';
import { ALBadge as ALWebBadge } from '@southleft/al-web-components/components/badge';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebBadge.el, ALWebBadge],
  suffix: PackageJson.version
});

export const ALBadge = createComponent({
  react: React,
  tagName: elementMap.get(ALWebBadge.el),
  elementClass: ALWebBadge
});
