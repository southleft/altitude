import { ALCalendar, ALEmptyState, ALLayout } from '@southleft/al-react';

const Home = () => {
  // gap="md", not "lg": the original class was `al-u-gap--lg`, a dead spelling
  // (spacing.scss emits single-dash `.al-u-gap-lg` only), so the grid always
  // rendered `.al-u-grid`'s own base gap — `--al-theme-space` (md).
  return (
    <ALLayout variant="grid" gap="md" fullHeight style={{ '--al-layout-min-height': '100%' }}>
      <div className="al-u-grid__item col:7@md">
        <ALEmptyState heading="Coming soon"></ALEmptyState>
      </div>
      <ALCalendar className="al-u-grid__item col:5@md row:2@md"></ALCalendar>
      <div className="al-u-grid__item col:7@md">
        <ALEmptyState heading="Coming soon"></ALEmptyState>
      </div>
      <div className="al-u-grid__item col:12@md">
        <ALEmptyState heading="Coming soon"></ALEmptyState>
      </div>
    </ALLayout>
  );
};

export default Home;
