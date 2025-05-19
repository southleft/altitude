import type { StoryObj } from '@storybook/react-webpack5';
import { 
  ALStepper,
  ALStepperItem,
  ALCard,
  ALHeading,
  ALTextPassage,
  ALInput,
  ALButton,
  ALCheckbox,
  ALFieldNote
} from 'al-react/src';

export default {
  title: 'Chronicle Pages/Organisms/Sign-up Wizard',
  component: ALStepper,
  subcomponents: { ALStepperItem, ALCard, ALHeading, ALTextPassage, ALInput, ALButton, ALCheckbox, ALFieldNote },
};

export const Default: StoryObj<typeof ALStepper> = {
  args: {
    variant: 'numbered',
    type: 'navigation',
    options: 'linear',
    children: (
      <>
        <ALStepperItem>
          <ALCard>
            <ALHeading variant="h2">Create your account</ALHeading>
            <ALTextPassage>
              <ALInput label="Email" type="email" control="default" />
              <ALInput label="Password" type="password" control="default" />
              <ALInput label="Confirm Password" type="password" control="default" />
            </ALTextPassage>
            <ALCheckbox control="default">I agree to the terms and conditions</ALCheckbox>
            <ALButton slot="actions" type="submit" control="primary">Next</ALButton>
          </ALCard>
        </ALStepperItem>
        
        <ALStepperItem>  
          <ALCard>
            <ALHeading variant="h2">Profile details</ALHeading>
            <ALTextPassage>
              <ALInput label="First Name" type="text" control="default" />
              <ALInput label="Last Name" type="text" control="default" />
              <ALInput label="Username" type="text" control="default" />
            </ALTextPassage>
            <ALButton slot="actions" type="submit" control="primary">Next</ALButton>
          </ALCard>
        </ALStepperItem>

        <ALStepperItem>
          <ALCard>  
            <ALHeading variant="h2">Complete sign-up</ALHeading>
            <ALTextPassage>
              <ALFieldNote control="success">
                Your account has been created successfully! 
                Click the button below to confirm and log in.
              </ALFieldNote>
            </ALTextPassage>  
            <ALButton slot="actions" type="submit" control="primary">Confirm</ALButton>
          </ALCard>
        </ALStepperItem>
      </>
    )
  }
};