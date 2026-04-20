import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      proxy: {
        '/api/hf': {
          target: 'https://router.huggingface.co',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/hf/, '/hf-inference'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              // Strip X-Forwarded-Host to prevent HF routing from returning 404
              proxyReq.removeHeader('x-forwarded-host');
              proxyReq.removeHeader('x-forwarded-port');
              proxyReq.removeHeader('x-forwarded-proto');
              
              // Inject the API key server-side so it never leaks to the browser
              proxyReq.setHeader('Authorization', `Bearer ${env.VITE_HF_API_KEY}`);
            });
          }
        }
      }
    }
  };
});
