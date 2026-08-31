'use client';

import React from 'react';
import { createComponent } from '@lit/react';
import { ALLogo as ALWebLogo } from '@southleft/al-web-components/components/logo';
import register from '@southleft/al-web-components/directives/register';
import PackageJson from '../../../package.json' with { type: 'json' };

const elementMap = register({
  elements: [ALWebLogo.el, ALWebLogo],
  suffix: PackageJson.version
});

export const ALLogo = createComponent({
  react: React,
  tagName: elementMap.get(ALWebLogo.el),
  elementClass: ALWebLogo,
  events: {}
});
