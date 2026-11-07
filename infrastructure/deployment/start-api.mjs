import { deploymentConfiguration } from './config.mjs';
try { deploymentConfiguration(process.env); }
catch (error) { console.error(error.message); process.exit(1); }
await import('../../apps/api/dist/main.js');
