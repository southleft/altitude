import { createComponent } from '@lit/react';
import { SLIconSignIn as SLWebIconSignIn } from 'sl-web-components/dist/components/icon/icons/sign-in';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconSignIn.el, SLWebIconSignIn],
  suffix: PackageJson.version
});

export const SLIconSignIn = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconSignIn.el),
  elementClass: SLWebIconSignIn,
  events: {}
});
