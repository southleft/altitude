# sl-react

The React wrapper layer for the SL design system

## Running Storybook

1. Run `yarn`
2. Run `yarn start`

## How to use web components in sl-react

[TODO] Solidify and elaborate on the process

1. Install the `sl-web-components` package
2. Import your component into the proper `sl-react` component
3. Map the web component props to the React props

If you are creating a `Button` component using the `sl-web-components` `sl-button`, you would write your `Button.tsx` file like this:

```tsx
import '@sl-web-components/button';

export interface Props {
  /**
   * The text within the button
   */
  buttonText?: string
}

/**
 * Primary UI component for user interaction
 */
export const Button: React.FC<Props> = ({
  buttonText,
  ...other
}) => {

  return (
    <sl-button className="c-button">
      {buttonText}
    <sl-button>
  );
};

```

In this example, the `sl-react` prop `buttonText` gets fed into the `sl-web-components` `text` property at the EN button level to render the proper button text and apply the appropriate styling to that button from the `sl-web-components` CSS.

[TODO] How to handle state
