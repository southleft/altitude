'use client';

import { createComponent } from '@lit/react';
import { ALInput as ALWebInput } from '@southleft/al-web-components/components/input';
import register from '@southleft/al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json' with { type: 'json' };

const elementMap = register({
  elements: [ALWebInput.el, ALWebInput],
  suffix: PackageJson.version
});

export const ALInput = createComponent({
  react: React,
  tagName: elementMap.get(ALWebInput.el),
  elementClass: ALWebInput,
  events: {
    onInputChange: 'onInputChange'
  }
});
