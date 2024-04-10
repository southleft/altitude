import { createComponent } from '@lit/react';
import { ALTextPassage as ALWebTextPassage } from '@southleft/al-web-components/dist/components/text-passage/text-passage';
import register from '@southleft/al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebTextPassage.el, ALWebTextPassage],
  suffix: PackageJson.version
});

export const ALTextPassage = createComponent({
  react: React,
  tagName: elementMap.get(ALWebTextPassage.el),
  elementClass: ALWebTextPassage,
  events: {}
});
