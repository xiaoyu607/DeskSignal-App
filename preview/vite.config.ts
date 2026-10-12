import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
export default defineConfig({root:resolve('preview'),publicDir:resolve('assets'),plugins:[react()],server:{host:'127.0.0.1',port:5174}});
