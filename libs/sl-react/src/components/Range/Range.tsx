import React from 'react';
import { createComponent } from '@lit/react';
import { SLRange as SLWebRange } from 'sl-web-components/dist/components/range/range';
import register from 'sl-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebRange.el, SLWebRange],
  suffix: PackageJson.version
});

export const SLRange = createComponent({
  react: React,
  tagName: elementMap.get(SLWebRange.el),
  elementClass: SLWebRange,
  events: {}
});
