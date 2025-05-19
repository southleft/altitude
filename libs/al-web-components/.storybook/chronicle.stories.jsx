import React from 'react';
import ChroniclePanel from '../../../chronicle/ui/ChroniclePanel';

export default {
  title: 'Pages/Chronicle',
  parameters: {
    status: { type: 'beta' },
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export const Default = () => <ChroniclePanel />;
