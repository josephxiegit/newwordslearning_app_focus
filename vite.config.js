import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
})

// import { defineConfig } from 'vite'
// import vue from '@vitejs/plugin-vue'
// import fs from 'fs'

// export default defineConfig({
//   plugins: [vue()],
//   server: {
//     https: {
//       key: fs.readFileSync('./localhost+2-key.pem'),
//       cert: fs.readFileSync('./localhost+2.pem'),
//     },
//     port: 5173,
//     host: true,
//     proxy: {
//       '/newwordslearning': {
//         target: 'http://127.0.0.1:8000',
//         changeOrigin: true,
//         secure: false,
//       }
//     }
//   }
// })
