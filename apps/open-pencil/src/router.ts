import { createRouter, createWebHistory } from 'vue-router'

import WorkspaceView from './views/WorkspaceView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: WorkspaceView },
    { path: '/storage', redirect: '/' },
    { path: '/demo', component: WorkspaceView, meta: { demo: true } },
    { path: '/share/:roomId', component: WorkspaceView }
  ]
})

export default router
