import { createComponent } from '@lit/react';
import { SLSwitch as SLWebSwitch } from 'sl-web-components/dist/components/switch/switch';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebSwitch.el, SLWebSwitch],
  suffix: PackageJson.version
});

export const SLSwitch = createComponent({
  react: React,
  tagName: elementMap.get(SLWebSwitch.el),
  elementClass: SLWebSwitch,
  events: {}
});
