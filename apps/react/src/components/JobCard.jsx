import { ALButton, ALCard, ALChip, ALHeading, ALIconPin, ALIconStar, ALLayout, ALLink } from '@southleft/al-react';

/*
 * One job listing, as a component.
 *
 * THIS IS THE COMPOSITION LAYER, and it belongs to the app rather than to the
 * design system. "Job card" is not a design-system concept — it is this app's
 * arrangement of `ALCard` + `ALHeading` + `ALChip`. Altitude ships the
 * vocabulary; a file like this one makes the phrase, and every screen that
 * needs a job listing imports it and passes props.
 *
 * JobBoard.jsx previously inlined this markup inside its `.map()`, which meant
 * the arrangement could only ever be reused by copying it.
 */
export default function JobCard({ title, location, chips, posted }) {
  return (
    <ALCard layout="inline">
      <div slot="image" className="al-l-job-board__card-image">
        <ALIconStar size="xl"></ALIconStar>
      </div>

      <ALHeading variant="sm" tagName="h3">
        <ALLink href="#">{title}</ALLink>
      </ALHeading>

      <ALLayout direction="row" gap="sm">
        <ALIconPin></ALIconPin>
        <p>{location}</p>
      </ALLayout>

      <ALLayout direction="row" gap="sm" wrap>
        {chips.map((chip) => (
          <ALChip key={chip} variant="secondary">{chip}</ALChip>
        ))}
      </ALLayout>

      <ALButton slot="actions-start">Apply</ALButton>
      <div slot="actions-end" className="al-u-theme-typography-body-xs">{posted}</div>
    </ALCard>
  );
}
