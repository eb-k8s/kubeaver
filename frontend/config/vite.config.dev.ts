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
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
          // rewrite: (path) => path.replace(/^\/api/, '/'),
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
