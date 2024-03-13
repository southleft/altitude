<script lang="ts">
  import Fpo from './Fpo.svelte'
  import 'al-web-components/dist/components/calendar/calendar';
</script>

<div class="al-u-grid al-u-gap--lg" style="height: 100%;">
  <div class="al-u-grid__item col:7@md">
    <Fpo></Fpo>
  </div>
  <al-calendar class="al-u-grid__item col:5@md row:2@md"></al-calendar>
  <div class="al-u-grid__item col:7@md">
    <Fpo></Fpo>
  </div>
  <div class="al-u-grid__item col:12@md">
    <Fpo></Fpo>
  </div>
</div>
