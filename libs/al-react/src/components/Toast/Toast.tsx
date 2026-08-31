'use client';

import { createComponent } from '@lit/react';
import { ALToast as ALWebToast } from '@southleft/al-web-components/components/toast';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json' with { type: 'json' };

const elementMap = register({
  elements: [ALWebToast.el, ALWebToast],
  suffix: PackageJson.version
});

export const ALToast = createComponent({
  react: React,
  tagName: elementMap.get(ALWebToast.el),
  elementClass: ALWebToast,
  events: {
    onToastClose: 'onToastClose',
    onToastOpen: 'onToastOpen'
  }
});
