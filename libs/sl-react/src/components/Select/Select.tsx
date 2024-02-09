import { createComponent } from '@lit/react';
import { SLSelect as SLWebSelect } from 'sl-web-components/dist/components/select-field/select-field';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebSelect.el, SLWebSelect],
  suffix: PackageJson.version
});

export const SLSelect = createComponent({
  react: React,
  tagName: elementMap.get(SLWebSelect.el),
  elementClass: SLWebSelect,
  events: {}
});
