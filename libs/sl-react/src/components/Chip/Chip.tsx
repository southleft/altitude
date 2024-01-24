import { createComponent } from '@lit/react';
import { SLChip as SLWebChip } from 'sl-web-components/dist/components/chip/chip';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebChip.el, SLWebChip],
  suffix: PackageJson.version
});

export const SLChip = createComponent({
  react: React,
  tagName: elementMap.get(SLWebChip.el),
  elementClass: SLWebChip,
  events: {}
});
