import { createComponent } from '@lit/react';
import { SLRadioItem as SLWebRadioItem } from 'sl-web-components/dist/components/radio-item/radio-item';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebRadioItem.el, SLWebRadioItem],
  suffix: PackageJson.version
});

export const SLRadioItem = createComponent({
  react: React,
  tagName: elementMap.get(SLWebRadioItem.el),
  elementClass: SLWebRadioItem,
  events: {}
});
