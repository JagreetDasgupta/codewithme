#!/usr/bin/env node
/**
 * Health Check CLI Script
 * Verifies backend service health by calling the health endpoint.
 * 
 * Usage: npx ts-node src/scripts/healthCheck.ts
 * Or via npm: npm run check:health
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:4000';

async function checkHealth(): Promise<void> {
    console.log(`Checking health at ${API_URL}/api/v1/health...`);

    try {
        const response = await axios.get(`${API_URL}/api/v1/health`, {
            timeout: 5000
        });

        const health = response.data;

        console.log('\n=== Health Check Results ===');
        console.log(`Status: ${health.status}`);
        console.log(`Timestamp: ${health.timestamp}`);
        console.log(`Environment: ${health.environment}`);
        console.log(`Version: ${health.version}`);
        console.log(`Uptime: ${Math.floor(health.uptime)}s`);
        console.log('\nServices:');
        console.log(`  Database: ${health.services?.database || 'unknown'}`);
        console.log(`  Redis: ${health.services?.redis || 'unknown'}`);
        console.log('============================\n');

        if (health.status === 'healthy') {
            console.log('✅ Backend is healthy!');
            process.exit(0);
        } else {
            console.log('⚠️ Backend is degraded.');
            process.exit(1);
        }
    } catch (error: any) {
        console.error('\n❌ Health check failed!');
        if (error.code === 'ECONNREFUSED') {
            console.error(`Could not connect to ${API_URL}. Is the server running?`);
        } else if (error.response) {
            console.error(`Server responded with status: ${error.response.status}`);
        } else {
            console.error(`Error: ${error.message}`);
        }
        process.exit(1);
    }
}

checkHealth();
