import { mergeConfig } from 'vite';
import eslint from 'vite-plugin-eslint';
import baseConfig from './vite.config.base';

export default mergeConfig(
  {
    mode: 'development',
    server: {
      open: true,
      fs: {
        strict: false,
      },
      proxy: {
        '/api/': {
          target: 'http://127.0.0.1:8088',
          changeOrigin: true,
          secure: false,
          // rewrite: (path) => path.replace(/^\/api/, '/'),
        },
        '/v125/api/': {
          target: 'http://kubeaver_backend_v1-125:8000/',
          changeOrigin: true,
          secure: false,
          rewrite: (path: string) => path.replace(/^\/v125\/api/, '/api'),
        },
        '/v128/api/': {
          target: 'http://kubeaver_backend_v1-128:8000/',
          changeOrigin: true,
          secure: false,
          rewrite: (path: string) => path.replace(/^\/v128\/api/, '/api'),
        },
        // '/ws/': {
        //   target: 'http://127.0.0.1:8000',
        //   changeOrigin: true,
        //   secure: false,
        //   ws: true,
        //   rewrite: (path) => path.replace(/^\/ws/, '/'),
        // },
        '/v125/ws/': {
          target: 'http://kubeaver_backend_v1-125:8000/',
          changeOrigin: true,
          secure: false,
          ws: true,
          rewrite: (path) => path.replace(/^\/v125\/ws/, '/'),
        },
        '/v128/ws/': {
          target: 'http://kubeaver_backend_v1-128:8000/',
          changeOrigin: true,
          secure: false,
          ws: true,
          rewrite: (path) => path.replace(/^\/v128\/ws/, '/'),
        },
      },
    },
    plugins: [
      // eslint({
      //   cache: false,
      //   include: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.vue'],
      //   exclude: ['node_modules'],
      // }),
    ],
  },
  baseConfig
);
