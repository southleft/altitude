import { createComponent } from '@lit/react';
import { ALAlert as ALWebAlert } from 'al-web-components/dist/components/alert/alert';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebAlert.el, ALWebAlert],
  suffix: PackageJson.version
});

export const ALAlert = createComponent({
  react: React,
  tagName: elementMap.get(ALWebAlert.el),
  elementClass: ALWebAlert,
  events: {}
});
