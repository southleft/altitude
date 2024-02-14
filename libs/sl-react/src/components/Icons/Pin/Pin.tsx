import { createComponent } from '@lit/react';
import { SLIconPin as SLWebIconPin } from 'sl-web-components/dist/components/icon/icons/pin';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconPin.el, SLWebIconPin],
  suffix: PackageJson.version
});

export const SLIconPin = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconPin.el),
  elementClass: SLWebIconPin,
  events: {}
});
