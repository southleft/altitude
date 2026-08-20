import { createComponent } from '@lit/react';
import { ALSplitContent as ALWebSplitContent } from 'al-web-components/components/split-content';
import register from 'al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebSplitContent.el, ALWebSplitContent],
  suffix: PackageJson.version
});

export const ALSplitContent = createComponent({
  react: React,
  tagName: elementMap.get(ALWebSplitContent.el),
  elementClass: ALWebSplitContent
});
