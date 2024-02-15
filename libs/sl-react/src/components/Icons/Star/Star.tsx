import { createComponent } from '@lit/react';
import { SLIconStar as SLWebIconStar } from 'sl-web-components/dist/components/icon/icons/star';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconStar.el, SLWebIconStar],
  suffix: PackageJson.version
});

export const SLIconStar = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconStar.el),
  elementClass: SLWebIconStar,
  events: {}
});
