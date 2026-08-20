import { createComponent } from '@lit/react';
import { ALBentoItem as ALWebBentoItem } from 'al-web-components/components/bento-item';
import register from 'al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebBentoItem.el, ALWebBentoItem],
  suffix: PackageJson.version
});

export const ALBentoItem = createComponent({
  react: React,
  tagName: elementMap.get(ALWebBentoItem.el),
  elementClass: ALWebBentoItem
});
