import { createComponent } from '@lit/react';
import { SLIconCustomerSupport as SLWebIconCustomerSupport } from 'sl-web-components/dist/components/icon/icons/customer-support';
import register from 'sl-web-components/dist/directives/register';
import React from 'react';
import PackageJson from '../../../../package.json';

const elementMap = register({
  elements: [SLWebIconCustomerSupport.el, SLWebIconCustomerSupport],
  suffix: PackageJson.version
});

export const SLIconCustomerSupport = createComponent({
  react: React,
  tagName: elementMap.get(SLWebIconCustomerSupport.el),
  elementClass: SLWebIconCustomerSupport,
  events: {}
});
