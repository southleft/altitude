'use client';

import { createComponent } from '@lit/react';
import { ALLayout as ALWebLayout } from '@southleft/al-web-components/components/layout';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebLayout.el, ALWebLayout],
  suffix: PackageJson.version
});

export const ALLayout = createComponent({
  react: React,
  tagName: elementMap.get(ALWebLayout.el),
  elementClass: ALWebLayout,
  events: {}
});
