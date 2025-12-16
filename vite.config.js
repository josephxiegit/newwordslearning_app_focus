// newWordsLearning_app/vite.config.js

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // 保持相对路径，解决 Cordova ERR_CONNECTION_REFUSED
  base: './', 
  plugins: [vue()],
  build: {
    // *** 关键修改：将输出目录指向 Cordova 的 www 目录 ***
    outDir: 'cordova-app/www' 
  }
})
