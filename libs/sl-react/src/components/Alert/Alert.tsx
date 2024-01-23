import React from 'react';
import { createComponent } from '@lit/react';
import { SLAlert as SLWebAlert } from 'sl-web-components/dist/components/alert/alert';
import register from 'sl-web-components/dist/directives/register';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [SLWebAlert.el, SLWebAlert],
  suffix: PackageJson.version
});

export const SLAlert = createComponent({
  react: React,
  tagName: elementMap.get(SLWebAlert.el),
  elementClass: SLWebAlert,
  events: {}
});
