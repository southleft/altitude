import { createComponent } from '@lit/react';
import { SLToastGroup as SLWebToastGroup } from 'sl-web-components/dist/components/toast-group/toast-group';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebToastGroup.el, SLWebToastGroup],
  suffix: PackageJson.version
});

export const SLToastGroup = createComponent({
  react: React,
  tagName: elementMap.get(SLWebToastGroup.el),
  elementClass: SLWebToastGroup,
  events: {}
});
