#!/usr/bin/env node

/**
 * Build script for Stickies app
 *
 * This script:
 * 1. Builds the Svelte app with Vite
 * 2. Packages the Electron app for distribution
 * 3. Creates installers for different platforms
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get command line arguments
const args = process.argv.slice(2);
const isDev = args.includes('--dev');
const platforms = getPlatformsFromArgs(args);

// Configuration
const config = {
  outDir: path.join(__dirname, '../dist'),
  electronDir: path.join(__dirname, '../electron'),
  packageJsonPath: path.join(__dirname, '../package.json')
};

// Main build function
async function build() {
  console.log('Starting build process...');

  try {
    // Clean the output directory
    console.log('Cleaning output directory...');
    if (fs.existsSync(config.outDir)) {
      fs.rmSync(config.outDir, { recursive: true, force: true });
    }

    // Build the Svelte app
    console.log('Building Svelte app...');
    execSync('npm run build:svelte', { stdio: 'inherit' });

    // Package the Electron app
    if (!isDev) {
      console.log('Packaging Electron app...');
      const platformArgs = platforms.length > 0
        ? `--${platforms.join(' --')}`
        : '';
      execSync(`npm run build:electron ${platformArgs}`, { stdio: 'inherit' });
    }

    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Helper to extract platforms from command line args
function getPlatformsFromArgs(args) {
  const supportedPlatforms = ['win', 'mac', 'linux'];
  return args
    .filter(arg => !arg.startsWith('--') && supportedPlatforms.includes(arg))
    .map(platform => platform.toLowerCase());
}

// Run the build
build();