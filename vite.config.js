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
              proxyReq.removeHeader('x-forwarded-host');
              proxyReq.removeHeader('x-forwarded-port');
              proxyReq.removeHeader('x-forwarded-proto');
              proxyReq.setHeader('Authorization', `Bearer ${env.VITE_HF_API_KEY}`);
            });
          }
        },
        '/api/groq': {
          target: 'https://api.groq.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/groq/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('x-forwarded-host');
              proxyReq.removeHeader('x-forwarded-port');
              proxyReq.removeHeader('x-forwarded-proto');
              // We inject the Groq key here if it exists in env
              if (env.VITE_GROQ_API_KEY && env.VITE_GROQ_API_KEY !== 'gsk_...') {
                proxyReq.setHeader('Authorization', `Bearer ${env.VITE_GROQ_API_KEY}`);
              }
            });
          }
        }
      }
    }
  };
});
