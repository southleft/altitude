'use client';

import { createComponent } from '@lit/react';
import { ALTextarea as ALWebTextarea } from '@southleft/al-web-components/components/textarea';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebTextarea.el, ALWebTextarea],
  suffix: PackageJson.version
});

export const ALTextarea = createComponent({
  react: React,
  tagName: elementMap.get(ALWebTextarea.el),
  elementClass: ALWebTextarea,
  events: {
    onTextareaChange: 'onTextareaChange'
  }
});
