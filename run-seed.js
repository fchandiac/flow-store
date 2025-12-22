#!/usr/bin/env node

// Simple wrapper to run the seed script
const { execSync } = require('child_process');
const environment = process.argv[2] || 'test';

console.log(`Running seed for environment: ${environment}`);
// Use seed-flowstore.ts for the main FlowStore seed
execSync(`npx ts-node data/seed/seed-flowstore.ts`, { stdio: 'inherit' });