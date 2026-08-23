'use client';

import React from 'react';
import { createComponent } from '@lit/react';
import { ALDialog as ALWebDialog } from '@southleft/al-web-components/components/dialog';
import register from '@southleft/al-web-components/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebDialog.el, ALWebDialog],
  suffix: PackageJson.version
});

export const ALDialog = createComponent({
  react: React,
  tagName: elementMap.get(ALWebDialog.el),
  elementClass: ALWebDialog,
  events: {
    onDialogClose: 'onDialogClose',
    onDialogCloseButton: 'onDialogCloseButton',
    onDialogOpen: 'onDialogOpen'
  }
});
