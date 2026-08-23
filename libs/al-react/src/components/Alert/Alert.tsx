'use client';

import { createComponent } from '@lit/react';
import { ALAlert as ALWebAlert } from '@southleft/al-web-components/components/alert';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebAlert.el, ALWebAlert],
  suffix: PackageJson.version
});

export const ALAlert = createComponent({
  react: React,
  tagName: elementMap.get(ALWebAlert.el),
  elementClass: ALWebAlert,
  events: {
    onClose: 'close',
    onOpen: 'open'
  }
});
