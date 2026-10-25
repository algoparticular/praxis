import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import cardMeta from './scripts/cardMetaPlugin.js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), cardMeta()],
})
