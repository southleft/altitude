import { createComponent } from '@lit/react';
import { SLTextPassage as SLWebTextPassage } from 'sl-web-components/dist/components/text-passage/text-passage';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebTextPassage.el, SLWebTextPassage],
  suffix: PackageJson.version
});

export const SLTextPassage = createComponent({
  react: React,
  tagName: elementMap.get(SLWebTextPassage.el),
  elementClass: SLWebTextPassage,
  events: {}
});
