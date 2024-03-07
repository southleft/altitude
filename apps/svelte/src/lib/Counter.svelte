<script lang="ts">
  import "al-web-components/dist/components/button/button.js";
  let count: number = 0
  const increment = () => {
    count += 1
  }
</script>

<al-button on:click={increment}>
  count is {count}
</al-button>
