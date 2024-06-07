import * as fs from 'fs';

interface Config {
  allowedOrigins?: string[];
}

export function loadCorsConfig(): Config {
  try {
    const configFileContent = fs.readFileSync('config/allowed-origins.json', 'utf8');
    return JSON.parse(configFileContent) as Config;
  } catch (error) {
    console.error(`Error reading config file: ${error}`);
    process.exit(1); // Exit the process if there was an error
  }
}
