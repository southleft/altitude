import { createComponent } from '@lit/react';
import { SLRadio as SLWebRadio } from 'sl-web-components/dist/components/radio/radio';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebRadio.el, SLWebRadio],
  suffix: PackageJson.version
});

export const SLRadio = createComponent({
  react: React,
  tagName: elementMap.get(SLWebRadio.el),
  elementClass: SLWebRadio,
  events: {}
});
