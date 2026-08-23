<script lang="ts">
  import 'al-web-components/components/calendar';
  import 'al-web-components/components/empty-state';
</script>

<!-- gap="md", not "lg": the original class was `al-u-gap--lg`, a dead spelling
     (spacing.scss emits single-dash `.al-u-gap-lg` only), so the grid always
     rendered `.al-u-grid`'s own base gap — `--al-theme-space` (md). -->
<al-layout variant="grid" gap="md" fullHeight>
  <al-empty-state class="al-u-grid__item col:7@md" heading="Coming Soon"></al-empty-state>
  <al-calendar class="al-u-grid__item col:5@md row:2@md"></al-calendar>
  <al-empty-state class="al-u-grid__item col:7@md" heading="Coming Soon"></al-empty-state>
  <al-empty-state class="al-u-grid__item col:12@md" heading="Coming Soon"></al-empty-state>
</al-layout>
