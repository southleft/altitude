<script lang="ts">
  // @ts-nocheck
  import { Router, Route } from 'svelte-routing'
  import Layout from './lib/Layout.svelte'
  import Dashboard from './lib/Dashboard.svelte'
  import JobBoard from './lib/JobBoard.svelte'
</script>

<Router>
  <Layout>
    <Route path="/"><JobBoard /></Route>
    <Route path="/dashboard"><Dashboard /></Route>
  </Layout>
</Router>