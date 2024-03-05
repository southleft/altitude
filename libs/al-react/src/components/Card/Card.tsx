import { createComponent } from '@lit/react';
import { ALCard as ALWebCard } from 'al-web-components/dist/components/card/card';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebCard.el, ALWebCard],
  suffix: PackageJson.version
});

export const ALCard = createComponent({
  react: React,
  tagName: elementMap.get(ALWebCard.el),
  elementClass: ALWebCard,
  events: {}
});
