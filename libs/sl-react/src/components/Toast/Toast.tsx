import { createComponent } from '@lit/react';
import { SLToast as SLWebToast } from 'sl-web-components/dist/components/toast/toast';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebToast.el, SLWebToast],
  suffix: PackageJson.version
});

export const SLToast = createComponent({
  react: React,
  tagName: elementMap.get(SLWebToast.el),
  elementClass: SLWebToast,
  events: {}
});
