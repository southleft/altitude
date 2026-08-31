// Fixture: @southleft/al-react JSX usage. Each flagged line is a distinct violation the validator MUST catch.
import { ALButton, ALCard, ALBadge, ALFancyThing } from '@southleft/al-react';

export function Bad({ rest }) {
  return (
    <div>
      <ALButton variant="primary">Save</ALButton>       {/* invalid-enum: no "primary" variant */}
      <ALButton colour="red">Nope</ALButton>            {/* unknown-prop: colour */}
      <ALFancyThing>x</ALFancyThing>                    {/* unknown-component: not a real wrapper */}
      <ALButton hideText="maybe">m</ALButton>           {/* type-mismatch: hideText is boolean */}

      {/* valid usages below — must NOT be flagged */}
      <ALButton variant="secondary" isDisabled onClick={() => {}} className="x">Ok</ALButton>
      <ALCard variant="bare" {...rest}>body</ALCard>
      <ALBadge variant="danger">3</ALBadge>
    </div>
  );
}
