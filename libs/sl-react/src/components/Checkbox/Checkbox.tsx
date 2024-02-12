import { createComponent } from '@lit/react';
import { SLCheckbox as SLWebCheckbox } from 'sl-web-components/dist/components/checkbox/checkbox';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebCheckbox.el, SLWebCheckbox],
  suffix: PackageJson.version
});

export const SLCheckbox = createComponent({
  react: React,
  tagName: elementMap.get(SLWebCheckbox.el),
  elementClass: SLWebCheckbox,
  events: {
    onChange: 'change'
  }
});
