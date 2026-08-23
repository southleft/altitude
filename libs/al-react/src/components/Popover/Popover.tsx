'use client';

import { createComponent } from '@lit/react';
import { ALPopover as ALWebPopover } from '@southleft/al-web-components/components/popover';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebPopover.el, ALWebPopover],
  suffix: PackageJson.version
});

export const ALPopover = createComponent({
  react: React,
  tagName: elementMap.get(ALWebPopover.el),
  elementClass: ALWebPopover,
  events: {
    onPopoverClose: 'onPopoverClose',
    onPopoverCloseButton: 'onPopoverCloseButton',
    onPopoverOpen: 'onPopoverOpen'
  }
});
