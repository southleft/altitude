import { createComponent } from '@lit/react';
import { SLIconSignOut as SLWebIconSignOut } from 'sl-web-components/dist/components/icon/icons/sign-out';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconSignOut.el, SLWebIconSignOut],
  suffix: PackageJson.version
});

export const SLIconSignOut = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconSignOut.el),
  elementClass: SLWebIconSignOut,
  events: {}
});
