#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.blue('🎬 Filmweb Fetcher Setup'));
console.log(chalk.blue('========================\n'));

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log(chalk.green('✓ Created .env file from env.example'));
  } else {
    // Create a basic .env file
    const envContent = `# API Keys - Get these from the respective services
OMDB_API_KEY=your_omdb_api_key_here
TMDB_API_KEY=your_tmdb_api_key_here
IMDB_API_KEY=your_imdb_api_key_here

# Optional: Rate limiting settings (requests per second)
RATE_LIMIT_PER_SECOND=10

# Output directory
OUTPUT_DIR=./output`;

    fs.writeFileSync(envPath, envContent);
    console.log(chalk.green('✓ Created .env file'));
  }
} else {
  console.log(chalk.yellow('⚠️  .env file already exists'));
}

// Check if output directory exists
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(chalk.green('✓ Created output directory'));
} else {
  console.log(chalk.yellow('⚠️  Output directory already exists'));
}

console.log(chalk.blue('\n📝 Next Steps:'));
console.log('1. Edit the .env file and add your API keys:');
console.log(chalk.cyan('   - OMDB API Key: https://www.omdbapi.com/apikey.aspx'));
console.log(chalk.cyan('   - TMDB API Key: https://developer.themoviedb.org/reference/intro/getting-started'));
console.log(chalk.cyan('   - IMDB API Key: https://imdbapi.dev/ (optional)'));
console.log('');
console.log('2. Test the configuration:');
console.log(chalk.green('   node index.js config'));
console.log('');
console.log('3. Try searching for a movie:');
console.log(chalk.green('   node index.js search --titles "The Matrix" --format json'));
console.log('');
console.log('4. Discover movies with filters:');
console.log(chalk.green('   node index.js discover --genre "Action" --start-date "2020-01-01" --format excel'));
console.log('');
console.log(chalk.blue('📚 For more information, see README.md'));
console.log(chalk.blue('🎯 Happy movie data fetching!'));
