import { createComponent } from '@lit/react';
import { SLCard as SLWebCard } from 'sl-web-components/dist/components/card/card';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebCard.el, SLWebCard],
  suffix: PackageJson.version
});

export const SLCard = createComponent({
  react: React,
  tagName: elementMap.get(SLWebCard.el),
  elementClass: SLWebCard,
  events: {}
});
