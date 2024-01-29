import { createComponent } from '@lit-labs/react';
import { SLIconWarningCircle as SLWebIconWarningCircle } from 'sl-web-components/dist/components/icon/icons/warning-circle';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconWarningCircle.el, SLWebIconWarningCircle],
  suffix: PackageJson.version
});

export const SLIconWarningCircle = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconWarningCircle.el),
  elementClass: SLWebIconWarningCircle,
  events: {}
});
