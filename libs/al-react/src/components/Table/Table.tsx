'use client';

import { createComponent } from '@lit/react';
import { ALTable as ALWebTable } from 'al-web-components/components/table';
import register from 'al-web-components/directives/register';
import React from 'react';
import PackageJson from '../../../package.json';

const elementMap = register({
  elements: [ALWebTable.el, ALWebTable],
  suffix: PackageJson.version
});

export const ALTable = createComponent({
  react: React,
  tagName: elementMap.get(ALWebTable.el),
  elementClass: ALWebTable,
  events: {
    onTableSort: 'onTableSort',
    onTableRowSelect: 'onTableRowSelect',
    onTableSelectAll: 'onTableSelectAll'
  }
});
