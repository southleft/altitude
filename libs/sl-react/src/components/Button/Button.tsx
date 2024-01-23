import React from 'react';
import { createComponent } from '@lit-labs/react';
import { SLButton as SLWebButton } from 'sl-web-components/dist/components/button/button';
import register from 'sl-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebButton.el, SLWebButton],
  suffix: PackageJson.version
});

export const SLButton = createComponent({
  react: React,
  tagName: elementMap.get(SLWebButton.el),
  elementClass: SLWebButton,
  events: {}
});
