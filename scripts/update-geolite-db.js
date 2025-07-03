#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Load environment variables from .env file
require('dotenv').config();

/**
 * Script to download and update GeoLite2 databases
 * 
 * Requirements:
 * 1. Set LICENSE_KEY in .env file or environment variable (or pass as license_key= argument)
 * 2. Ensure target directory exists and is writable
 * 
 * Usage:
 *   npm run update-geo-ip-db
 *   OR
 *   npm run update-geo-ip-db license_key=your_license_key
 * 
 * .env file should contain:
 *   LICENSE_KEY=your_maxmind_license_key
 */

// Get license key from environment or command line argument
let LICENSE_KEY = process.env.LICENSE_KEY;

// Check command line arguments for license_key=VALUE
const args = process.argv.slice(2);
for (const arg of args) {
    if (arg.startsWith('license_key=')) {
        LICENSE_KEY = arg.split('=')[1];
        break;
    }
}

const TARGET_DIR = process.env.GEODATADIR || '/usr/local/share/GeoIP';
const TEMP_DIR = process.env.GEOTMPDIR || '/tmp';

// Database editions to download
const DATABASES = [
    'GeoLite2-City',
    'GeoLite2-ASN',
    'GeoLite2-Country'
];

function downloadDatabase(edition) {
    if (!LICENSE_KEY) {
        console.error('Error: LICENSE_KEY environment variable is required');
        console.error('Sign up at https://www.maxmind.com/en/geolite2/signup to get a license key');
        console.error('Add LICENSE_KEY=your_key_here to your .env file');
        process.exit(1);
    }

    const url = `https://download.maxmind.com/app/geoip_download?edition_id=${edition}&license_key=${LICENSE_KEY}&suffix=tar.gz`;
    const tempFile = path.join('/tmp', `${edition}.tar.gz`);
    const extractDir = path.join('/tmp', edition);

    console.log(`Downloading ${edition}...`);

    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(tempFile);
        
        https.get(url, (response) => {
            // Handle redirects
            if (response.statusCode === 301 || response.statusCode === 302) {
                console.log(`Following redirect for ${edition}...`);
                response.resume(); // Consume response to free up memory
                https.get(response.headers.location, (redirectResponse) => {
                    if (redirectResponse.statusCode !== 200) {
                        redirectResponse.resume(); // Consume response
                        reject(new Error(`Failed to download ${edition}: HTTP ${redirectResponse.statusCode}`));
                        return;
                    }
                    redirectResponse.pipe(file);
                    handleFileFinish();
                }).on('error', (error) => {
                    fs.unlink(tempFile, () => {}); // Delete temp file on error
                    reject(new Error(`Failed to download ${edition}: ${error.message}`));
                });
                return;
            }
            
            if (response.statusCode !== 200) {
                response.resume(); // Consume response to free up memory
                reject(new Error(`Failed to download ${edition}: HTTP ${response.statusCode}`));
                return;
            }

            response.pipe(file);
            handleFileFinish();
        }).on('error', (error) => {
            fs.unlink(tempFile, () => {}); // Delete temp file on error
            reject(new Error(`Failed to download ${edition}: ${error.message}`));
        });

        function handleFileFinish() {
            file.on('finish', () => {
                file.close((err) => {
                    if (err) {
                        reject(new Error(`Failed to close file ${edition}: ${err.message}`));
                        return;
                    }
                    
                    console.log(`Downloaded ${edition}`);

                    try {
                        // Extract the tar.gz file
                        console.log(`Extracting ${edition}...`);
                        execSync(`mkdir -p "${extractDir}"`);
                        execSync(`tar -xzf "${tempFile}" -C "${extractDir}" --strip-components=1`);

                        // Find the .mmdb file and copy it to target directory
                        const mmdbFile = path.join(extractDir, `${edition}.mmdb`);
                        const targetFile = path.join(TARGET_DIR, `${edition}.mmdb`);

                        if (fs.existsSync(mmdbFile)) {
                            // Ensure target directory exists
                            execSync(`mkdir -p "${TARGET_DIR}"`);
                            
                            // Copy the database file
                            execSync(`cp "${mmdbFile}" "${targetFile}"`);
                            console.log(`Installed ${edition}.mmdb to ${targetFile}`);
                        } else {
                            throw new Error(`${edition}.mmdb not found in extracted archive`);
                        }

                        // Cleanup
                        execSync(`rm -f "${tempFile}"`);
                        execSync(`rm -rf "${extractDir}"`);

                        resolve();
                    } catch (error) {
                        reject(new Error(`Failed to extract/install ${edition}: ${error.message}`));
                    }
                });
            });
            
            file.on('error', (err) => {
                fs.unlink(tempFile, () => {});
                reject(new Error(`File write error for ${edition}: ${err.message}`));
            });
        }
    });
}

async function updateAllDatabases() {
    console.log('MaxMind GeoLite2 Database Updater');
    console.log('=================================');
    
    if (!LICENSE_KEY) {
        console.error('Error: LICENSE_KEY environment variable is required');
        console.error('');
        console.error('To get a license key:');
        console.error('1. Sign up at https://www.maxmind.com/en/geolite2/signup');
        console.error('2. Generate a license key in your account');
        console.error('3. Add LICENSE_KEY=your_key_here to your .env file');
        console.error('');
        process.exit(1);
    }

    console.log(`Target directory: ${TARGET_DIR}`);
    console.log('');

    // Check if target directory is writable
    try {
        execSync(`mkdir -p "${TARGET_DIR}"`);
        execSync(`touch "${TARGET_DIR}/.test" && rm "${TARGET_DIR}/.test"`);
    } catch (error) {
        console.error(`Error: Cannot write to target directory ${TARGET_DIR}`);
        console.error('You may need to run this script with sudo or change the target directory.');
        console.error('Set GEODATADIR environment variable to specify a different directory.');
        process.exit(1);
    }

    for (const edition of DATABASES) {
        try {
            await downloadDatabase(edition);
        } catch (error) {
            console.error(`Error updating ${edition}: ${error.message}`);
            process.exit(1);
        }
    }

    console.log('');
    console.log('All databases updated successfully!');
    console.log('');
    console.log('Database files installed:');
    DATABASES.forEach(edition => {
        const dbPath = path.join(TARGET_DIR, `${edition}.mmdb`);
        if (fs.existsSync(dbPath)) {
            const stats = fs.statSync(dbPath);
            console.log(`  ${dbPath} (${Math.round(stats.size / 1024 / 1024)}MB, ${stats.mtime.toISOString()})`);
        }
    });
    
    console.log('');
    console.log('Remember to restart your application to use the updated databases.');
    console.log('');
    
    // Explicitly exit the process
    process.exit(0);
}

// Run the update with proper error handling
updateAllDatabases().catch((error) => {
    console.error('Update failed:', error.message);
    process.exit(1);
});
