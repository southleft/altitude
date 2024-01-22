import { createComponent } from '@lit-labs/react';
import { SLIconUser as SLWebIconUser } from 'sl-web-components/dist/sl/components/icon/icons/user';
import register from 'sl-web-components/dist/sl/directives/register';
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
