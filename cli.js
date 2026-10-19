#!/usr/bin/env node

import { startStdioServer } from './dist/bundle.js';

startStdioServer().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});
