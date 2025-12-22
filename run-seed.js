#!/usr/bin/env node

// Simple wrapper to run the seed script
const { execSync } = require('child_process');
const environment = process.argv[2] || 'test';

console.log(`Running seed for environment: ${environment}`);
execSync(`npx ts-node data/seed/seed.ts ${environment}`, { stdio: 'inherit' });