import { createComponent } from '@lit/react';
import { SLIconUser as SLWebIconUser } from 'sl-web-components/dist/components/icon/icons/user';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconUser.el, SLWebIconUser],
  suffix: PackageJson.version
});

export const SLIconUser = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconUser.el),
  elementClass: SLWebIconUser,
  events: {}
});
