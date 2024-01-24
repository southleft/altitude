import { createComponent } from '@lit/react';
import { SLTooltip as SLWebTooltip } from 'sl-web-components/dist/components/tooltip/tooltip';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebTooltip.el, SLWebTooltip],
  suffix: PackageJson.version
});

export const SLTooltip = createComponent({
  react: React,
  tagName: elementMap.get(SLWebTooltip.el),
  elementClass: SLWebTooltip,
  events: {}
});
