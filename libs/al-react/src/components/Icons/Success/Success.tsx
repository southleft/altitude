import { createComponent } from '@lit/react';
import { ALIconSuccess as ALWebIconSuccess } from 'al-web-components/dist/components/icon/icons/success';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconSuccess.el, ALWebIconSuccess],
  suffix: PackageJson.version
});

export const ALIconSuccess = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconSuccess.el),
  elementClass: ALWebIconSuccess,
  events: {}
});
