import { createComponent } from '@lit/react';
import { SLIconSettings as SLWebIconSettings } from 'sl-web-components/dist/components/icon/icons/settings';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconSettings.el, SLWebIconSettings],
  suffix: PackageJson.version
});

export const SLIconSettings = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconSettings.el),
  elementClass: SLWebIconSettings,
  events: {}
});
