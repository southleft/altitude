import React from 'react';
import type { StoryObj } from '@storybook/react-webpack5';
import { ALCard, ALInput, ALFieldNote, ALButton, ALLink, ALHeading } from 'al-react/src';

export default {
  title: 'Chronicle Pages/Log In',
  component: ALCard,
  subcomponents: { ALInput, ALButton, ALLink, ALHeading },
};

export const Default: StoryObj<typeof ALCard> = {
  args: {
    children: (
      <>
        <ALHeading variant="xxlarge" style={{textAlign: 'center', marginBottom: '2rem'}}>Log In</ALHeading>

        <ALInput type="email" control="minimal" style={{marginBottom: '1rem'}} placeholder="Email address" />

        <ALInput type="password" control="minimal" style={{marginBottom: '0.5rem'}} placeholder="Password" />

        <ALFieldNote style={{marginBottom: '1.5rem'}}>
          <ALLink href="/forgot-password" variant="primary">Forgot password?</ALLink>
        </ALFieldNote>

        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <ALButton type="primary">Log In</ALButton>
          <ALLink href="/sign-up" variant="primary">Create an account</ALLink>
        </div>
      </>
    )
  },
  decorators: [
    (Story) => (
      <div style={{display: 'flex', justifyContent: 'center', padding: '2rem'}}>
        <Story />
      </div>
    )
  ]
};
