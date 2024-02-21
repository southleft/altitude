import { createComponent } from '@lit/react';
import { ALIconPin as ALWebIconPin } from 'al-web-components/dist/components/icon/icons/pin';
import register from 'al-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [ALWebIconPin.el, ALWebIconPin],
  suffix: PackageJson.version
});

export const ALIconPin = createComponent({
  react: React,
  tagName: elementMap.get(ALWebIconPin.el),
  elementClass: ALWebIconPin,
  events: {}
});
