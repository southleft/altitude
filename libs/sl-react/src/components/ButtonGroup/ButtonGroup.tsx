import { createComponent } from '@lit/react';
import { SLButtonGroup as SLWebButtonGroup } from 'sl-web-components/dist/components/button-group/button-group';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebButtonGroup.el, SLWebButtonGroup],
  suffix: PackageJson.version
});

export const SLButtonGroup = createComponent({
  react: React,
  tagName: elementMap.get(SLWebButtonGroup.el),
  elementClass: SLWebButtonGroup,
  events: {}
});
