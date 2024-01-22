import { createComponent } from '@lit-labs/react';
import { SLIconWarningTriangle as SLWebIconWarningTriangle } from 'sl-web-components/dist/sl/components/icon/icons/warning-triangle';
import register from 'sl-web-components/dist/sl/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconWarningTriangle.el, SLWebIconWarningTriangle],
  suffix: PackageJson.version
});

export const SLIconWarningTriangle = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconWarningTriangle.el),
  elementClass: SLWebIconWarningTriangle,
  events: {}
});
