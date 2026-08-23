'use client';

import { createComponent } from '@lit/react';
import { ALTextBlock as ALWebTextBlock } from 'al-web-components/components/text-block';
import register from 'al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebTextBlock.el, ALWebTextBlock],
  suffix: PackageJson.version
});

export const ALTextBlock = createComponent({
  react: React,
  tagName: elementMap.get(ALWebTextBlock.el),
  elementClass: ALWebTextBlock,
  events: {}
});
