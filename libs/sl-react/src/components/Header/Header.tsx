import React from 'react';
import { createComponent } from '@lit/react';
import { SLHeader as SLWebHeader } from 'sl-web-components/dist/components/header/header';
import register from 'sl-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebHeader.el, SLWebHeader],
  suffix: PackageJson.version
});

export const SLHeader = createComponent({
  react: React,
  tagName: elementMap.get(SLWebHeader.el),
  elementClass: SLWebHeader,
  events: {}
});
