'use client';

import { createComponent } from '@lit/react';
import { ALFooter as ALWebFooter } from 'al-web-components/components/footer';
import register from 'al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebFooter.el, ALWebFooter],
  suffix: PackageJson.version
});

export const ALFooter = createComponent({
  react: React,
  tagName: elementMap.get(ALWebFooter.el),
  elementClass: ALWebFooter
});
