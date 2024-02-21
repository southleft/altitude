import { createComponent } from '@lit/react';
import { ALTooltip as ALWebTooltip } from 'al-web-components/dist/components/tooltip/tooltip';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebTooltip.el, ALWebTooltip],
  suffix: PackageJson.version
});

export const ALTooltip = createComponent({
  react: React,
  tagName: elementMap.get(ALWebTooltip.el),
  elementClass: ALWebTooltip,
  events: {}
});
