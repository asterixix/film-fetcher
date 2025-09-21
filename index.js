#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
require('dotenv').config();

const MovieFetcher = require('./src/movieFetcher');
const JSONExporter = require('./src/exporters/jsonExporter');
const CSVExporter = require('./src/exporters/csvExporter');
const ExcelExporter = require('./src/exporters/excelExporter');
const SQLExporter = require('./src/exporters/sqlExporter');
const { generateFilename } = require('./src/utils/helpers');

const program = new Command();

function validateApiConfig(config) {
  const enabledApis = config.enabledApis || [];
  const issues = [];

  if (enabledApis.includes('omdb') && !config.omdbApiKey) {
    issues.push('OMDB API key is required when OMDB is enabled. Get one at: https://www.omdbapi.com/apikey.aspx');
  }

  if (enabledApis.includes('tmdb') && !config.tmdbApiKey) {
    issues.push('TMDB API key is required when TMDB is enabled. Get one at: https://developer.themoviedb.org/reference/intro/getting-started');
  }

  if (enabledApis.length === 0) {
    issues.push('At least one API must be enabled. Available options: omdb, tmdb, imdb');
  }

  // IMDB API doesn't require a key for basic functionality, so no validation needed

  return {
    valid: issues.length === 0,
    message: issues.join('\n')
  };
}

program
  .name('filmweb-fetcher')
  .description('Fetch movie data from multiple APIs and export to various formats')
  .version('1.0.0');

program
  .command('search')
  .description('Search for movies by title')
  .option('-t, --titles <titles...>', 'Movie titles to search for')
  .option('-f, --file <file>', 'File containing movie titles (one per line)')
  .option('--start-date <date>', 'Start date filter (YYYY-MM-DD)')
  .option('--end-date <date>', 'End date filter (YYYY-MM-DD)')
  .option('--country <country>', 'Country filter')
  .option('--genre <genre>', 'Genre filter')
  .option('--apis <apis...>', 'APIs to use (omdb, tmdb, imdb)', ['omdb', 'tmdb'])
  .option('--format <formats...>', 'Export formats (json, csv, excel, sql)', ['json'])
  .option('--output-dir <dir>', 'Output directory', process.env.OUTPUT_DIR || './output')
  .option('--enrich', 'Enrich data by fetching from multiple APIs', false)
  .action(async (options) => {
    try {
      await searchCommand(options);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('discover')
  .description('Discover movies using filters')
  .option('--start-date <date>', 'Start date filter (YYYY-MM-DD)')
  .option('--end-date <date>', 'End date filter (YYYY-MM-DD)')
  .option('--country <country>', 'Country filter (ISO code, e.g., US, PL)')
  .option('--genre <genre>', 'Genre filter')
  .option('--max-pages <number>', 'Maximum pages to fetch (up to 500 for large datasets)', '50')
  .option('--batch-size <number>', 'Batch size for processing (lower = less memory)', '100')
  .option('--apis <apis...>', 'APIs to use for enrichment (omdb, tmdb, imdb)', ['tmdb'])
  .option('--format <formats...>', 'Export formats (json, csv, excel, sql)', ['json'])
  .option('--output-dir <dir>', 'Output directory', process.env.OUTPUT_DIR || './output')
  .option('--enrich', 'Enrich data by fetching from multiple APIs', false)
  .option('--streaming', 'Use streaming export for large datasets', false)
  .action(async (options) => {
    try {
      await discoverCommand(options);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('trending')
  .description('Get trending movies')
  .option('--time-window <window>', 'Time window (day, week)', 'week')
  .option('--max-pages <number>', 'Maximum pages to fetch', '5')
  .option('--apis <apis...>', 'APIs to use for enrichment', ['tmdb'])
  .option('--format <formats...>', 'Export formats (json, csv, excel, sql)', ['json'])
  .option('--output-dir <dir>', 'Output directory', process.env.OUTPUT_DIR || './output')
  .option('--enrich', 'Enrich data by fetching from multiple APIs', false)
  .action(async (options) => {
    try {
      await trendingCommand(options);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('top-rated')
  .description('Get top rated movies')
  .option('--max-pages <number>', 'Maximum pages to fetch', '5')
  .option('--apis <apis...>', 'APIs to use for enrichment', ['tmdb'])
  .option('--format <formats...>', 'Export formats (json, csv, excel, sql)', ['json'])
  .option('--output-dir <dir>', 'Output directory', process.env.OUTPUT_DIR || './output')
  .option('--enrich', 'Enrich data by fetching from multiple APIs', false)
  .action(async (options) => {
    try {
      await topRatedCommand(options);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('advanced-search')
  .description('Advanced search with complex filters')
  .option('--min-rating <rating>', 'Minimum IMDB rating (0-10)', parseFloat)
  .option('--max-rating <rating>', 'Maximum IMDB rating (0-10)', parseFloat)
  .option('--min-votes <votes>', 'Minimum vote count', parseInt)
  .option('--min-year <year>', 'Minimum release year', parseInt)
  .option('--max-year <year>', 'Maximum release year', parseInt)
  .option('--genres <genres...>', 'Genres to include')
  .option('--countries <countries...>', 'Countries to include (ISO codes)')
  .option('--languages <languages...>', 'Languages to include (ISO codes)')
  .option('--sort-by <sort>', 'Sort by (popularity, rating, year, votes)', 'popularity')
  .option('--max-pages <number>', 'Maximum pages to fetch', '10')
  .option('--apis <apis...>', 'APIs to use', ['imdb', 'tmdb'])
  .option('--format <formats...>', 'Export formats (json, csv, excel, sql)', ['json'])
  .option('--output-dir <dir>', 'Output directory', process.env.OUTPUT_DIR || './output')
  .option('--enrich', 'Enrich data by fetching from multiple APIs', false)
  .action(async (options) => {
    try {
      await advancedSearchCommand(options);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Show configuration status')
  .action(() => {
    console.log(chalk.blue('Configuration Status:'));
    console.log(`OMDB API Key: ${process.env.OMDB_API_KEY ? chalk.green('✓ Set') : chalk.red('✗ Not set')}`);
    console.log(`TMDB API Key: ${process.env.TMDB_API_KEY ? chalk.green('✓ Set') : chalk.red('✗ Not set')}`);
    console.log(`IMDB API Key: ${process.env.IMDB_API_KEY ? chalk.green('✓ Set') : chalk.yellow('Optional')}`);
    console.log(`Output Directory: ${process.env.OUTPUT_DIR || './output'}`);
    console.log(`Rate Limit: ${process.env.RATE_LIMIT_PER_SECOND || '10'} requests/second`);
    
    if (!process.env.OMDB_API_KEY && !process.env.TMDB_API_KEY) {
      console.log(chalk.yellow('\n⚠️  Warning: No API keys configured. Limited functionality available.'));
      console.log('Please copy env.example to .env and add your API keys.');
    }
  });

async function searchCommand(options) {
  let titles = [];
  
  // Get titles from command line or file
  if (options.titles) {
    titles = options.titles;
  } else if (options.file) {
    const fs = require('fs');
    const content = fs.readFileSync(options.file, 'utf8');
    titles = content.split('\n').map(line => line.trim()).filter(line => line);
  } else {
    console.error(chalk.red('Error: Please provide titles with --titles or --file option'));
    process.exit(1);
  }

  console.log(chalk.blue(`Searching for ${titles.length} movies using APIs: ${options.apis.join(', ')}`));

  const config = {
    omdbApiKey: process.env.OMDB_API_KEY,
    tmdbApiKey: process.env.TMDB_API_KEY,
    imdbApiKey: process.env.IMDB_API_KEY,
    rateLimitPerSecond: parseInt(process.env.RATE_LIMIT_PER_SECOND) || 10,
    enabledApis: options.apis
  };

  // Validate API requirements
  const validationResult = validateApiConfig(config);
  if (!validationResult.valid) {
    console.error(chalk.red('Configuration Error:'), validationResult.message);
    process.exit(1);
  }

  const fetcher = new MovieFetcher(config);
  
  const filters = {
    startDate: options.startDate,
    endDate: options.endDate,
    country: options.country,
    genre: options.genre
  };

  let movies = await fetcher.fetchMoviesByTitles(titles, filters);

  if (options.enrich && movies.length > 0) {
    movies = await fetcher.enrichMovieData(movies);
  }

  if (movies.length === 0) {
    console.log(chalk.yellow('No movies found matching the criteria.'));
    return;
  }

  await exportMovies(movies, options.format, options.outputDir, 'search');
}

async function discoverWithStreaming(fetcher, filters, options) {
  console.log(chalk.blue('Using streaming mode for large dataset...'));
  
  // Create streaming exporters
  const streamingExporters = {};
  const { generateFilename } = require('./src/utils/helpers');
  
  for (const format of options.format) {
    if (format === 'json') {
      const filename = generateFilename('discover_movies_streaming', 'json');
      streamingExporters.json = {
        filename,
        path: require('path').join(options.outputDir, filename),
        first: true
      };
    } else if (format === 'csv') {
      const filename = generateFilename('discover_movies_streaming', 'csv');
      streamingExporters.csv = {
        filename,
        path: require('path').join(options.outputDir, filename),
        writer: null
      };
    }
  }
  
  let totalProcessed = 0;
  let totalExported = 0;
  
  // Progress callback for streaming
  const onProgress = async (progress) => {
    console.log(chalk.blue(`Progress: Page ${progress.page}/${progress.totalPages}, Found: ${progress.currentResults}, Total available: ${progress.totalResults}`));
  };
  
  // Process in chunks to manage memory
  const chunkSize = filters.batchSize || 100;
  let allMovies = [];
  
  const movies = await fetcher.discoverMovies(filters, onProgress);
  
  if (movies.length === 0) {
    console.log(chalk.yellow('No movies found matching the criteria.'));
    console.log(chalk.blue('Try adjusting your filters or check the debug output above.'));
    return;
  }
  
  console.log(chalk.green(`Successfully discovered ${movies.length} movies!`));
  await exportMovies(movies, options.format, options.outputDir, 'discover');
}

async function discoverCommand(options) {
  console.log(chalk.blue('Discovering movies...'));
  console.log(chalk.blue(`Filters: ${JSON.stringify({
    startDate: options.startDate,
    endDate: options.endDate,
    country: options.country,
    genre: options.genre,
    maxPages: options.maxPages,
    batchSize: options.batchSize
  }, null, 2)}`));

  const config = {
    omdbApiKey: process.env.OMDB_API_KEY,
    tmdbApiKey: process.env.TMDB_API_KEY,
    imdbApiKey: process.env.IMDB_API_KEY,
    rateLimitPerSecond: parseInt(process.env.RATE_LIMIT_PER_SECOND) || 10,
    enabledApis: options.apis
  };

  // Validate API requirements
  const validationResult = validateApiConfig(config);
  if (!validationResult.valid) {
    console.error(chalk.red('Configuration Error:'), validationResult.message);
    process.exit(1);
  }

  // Discovery requires TMDB
  if (!config.tmdbApiKey) {
    console.error(chalk.red('Error: TMDB API key is required for discovery. Please set TMDB_API_KEY in your .env file.'));
    process.exit(1);
  }

  const fetcher = new MovieFetcher(config);
  
  const filters = {
    startDate: options.startDate,
    endDate: options.endDate,
    country: options.country,
    genre: options.genre,
    maxPages: parseInt(options.maxPages) || 50,
    batchSize: parseInt(options.batchSize) || 100
  };

  // For large datasets, use streaming approach
  if (options.streaming || parseInt(options.maxPages) > 100) {
    await discoverWithStreaming(fetcher, filters, options);
    return;
  }

  let movies = await fetcher.discoverMovies(filters);

  if (options.enrich && movies.length > 0) {
    console.log(chalk.blue(`Enriching ${movies.length} movies...`));
    movies = await fetcher.enrichMovieData(movies);
  }

  if (movies.length === 0) {
    console.log(chalk.yellow('No movies found matching the criteria.'));
    console.log(chalk.blue('Try adjusting your filters or check the debug output above.'));
    return;
  }

  await exportMovies(movies, options.format, options.outputDir, 'discover');
}

async function trendingCommand(options) {
  console.log(chalk.blue(`Getting trending movies (${options.timeWindow})...`));

  const config = {
    omdbApiKey: process.env.OMDB_API_KEY,
    tmdbApiKey: process.env.TMDB_API_KEY,
    imdbApiKey: process.env.IMDB_API_KEY,
    rateLimitPerSecond: parseInt(process.env.RATE_LIMIT_PER_SECOND) || 10,
    enabledApis: options.apis
  };

  if (!config.tmdbApiKey) {
    console.error(chalk.red('Error: TMDB API key is required for trending movies.'));
    process.exit(1);
  }

  const fetcher = new MovieFetcher(config);
  const maxPages = parseInt(options.maxPages) || 5;
  let allMovies = [];

  for (let page = 1; page <= maxPages; page++) {
    try {
      const result = await fetcher.tmdbApi.getTrendingMovies(options.timeWindow, page);
      if (result.results) {
        for (const movie of result.results) {
          const movieDetails = await fetcher.tmdbApi.getMovieDetails(movie.id);
          const normalized = fetcher.tmdbApi.normalizeMovieData(movieDetails);
          if (normalized) allMovies.push(normalized);
        }
      }
    } catch (error) {
      console.warn(chalk.yellow(`Failed to fetch trending page ${page}: ${error.message}`));
    }
  }

  if (options.enrich && allMovies.length > 0) {
    allMovies = await fetcher.enrichMovieData(allMovies);
  }

  await exportMovies(allMovies, options.format, options.outputDir, 'trending');
}

async function topRatedCommand(options) {
  console.log(chalk.blue('Getting top rated movies...'));

  const config = {
    omdbApiKey: process.env.OMDB_API_KEY,
    tmdbApiKey: process.env.TMDB_API_KEY,
    imdbApiKey: process.env.IMDB_API_KEY,
    rateLimitPerSecond: parseInt(process.env.RATE_LIMIT_PER_SECOND) || 10,
    enabledApis: options.apis
  };

  if (!config.tmdbApiKey) {
    console.error(chalk.red('Error: TMDB API key is required for top rated movies.'));
    process.exit(1);
  }

  const fetcher = new MovieFetcher(config);
  const maxPages = parseInt(options.maxPages) || 5;
  let allMovies = [];

  for (let page = 1; page <= maxPages; page++) {
    try {
      const result = await fetcher.tmdbApi.getTopRatedMovies(page);
      if (result.results) {
        for (const movie of result.results) {
          const movieDetails = await fetcher.tmdbApi.getMovieDetails(movie.id);
          const normalized = fetcher.tmdbApi.normalizeMovieData(movieDetails);
          if (normalized) allMovies.push(normalized);
        }
      }
    } catch (error) {
      console.warn(chalk.yellow(`Failed to fetch top rated page ${page}: ${error.message}`));
    }
  }

  if (options.enrich && allMovies.length > 0) {
    allMovies = await fetcher.enrichMovieData(allMovies);
  }

  await exportMovies(allMovies, options.format, options.outputDir, 'top_rated');
}

async function advancedSearchCommand(options) {
  console.log(chalk.blue('Performing advanced search...'));

  const config = {
    omdbApiKey: process.env.OMDB_API_KEY,
    tmdbApiKey: process.env.TMDB_API_KEY,
    imdbApiKey: process.env.IMDB_API_KEY,
    rateLimitPerSecond: parseInt(process.env.RATE_LIMIT_PER_SECOND) || 10,
    enabledApis: options.apis
  };

  const fetcher = new MovieFetcher(config);
  let allMovies = [];

  // Use IMDB API for advanced search if available
  if (fetcher.imdbApi && options.apis.includes('imdb')) {
    const filters = {
      minRating: options.minRating,
      maxRating: options.maxRating,
      minVotes: options.minVotes,
      startYear: options.minYear,
      endYear: options.maxYear,
      genres: options.genres,
      countries: options.countries,
      languages: options.languages
    };

    try {
      const result = await fetcher.imdbApi.advancedTitleSearch(filters);
      if (result.titles) {
        for (const title of result.titles.slice(0, parseInt(options.maxPages) * 20)) {
          const normalized = fetcher.imdbApi.normalizeMovieData(title);
          if (normalized) allMovies.push(normalized);
        }
      }
    } catch (error) {
      console.warn(chalk.yellow(`IMDB advanced search failed: ${error.message}`));
    }
  }

  // Use TMDB discover as fallback/additional source
  if (fetcher.tmdbApi && options.apis.includes('tmdb')) {
    const tmdbFilters = {
      'vote_average.gte': options.minRating,
      'vote_average.lte': options.maxRating,
      'vote_count.gte': options.minVotes,
      'primary_release_date.gte': options.minYear ? `${options.minYear}-01-01` : null,
      'primary_release_date.lte': options.maxYear ? `${options.maxYear}-12-31` : null,
      with_origin_country: options.countries ? options.countries.join(',') : null
    };

    const maxPages = parseInt(options.maxPages) || 10;
    for (let page = 1; page <= maxPages; page++) {
      try {
        const result = await fetcher.tmdbApi.discoverMovies({ ...tmdbFilters, page });
        if (result.results) {
          for (const movie of result.results) {
            const movieDetails = await fetcher.tmdbApi.getMovieDetails(movie.id);
            const normalized = fetcher.tmdbApi.normalizeMovieData(movieDetails);
            if (normalized) allMovies.push(normalized);
          }
        }
      } catch (error) {
        console.warn(chalk.yellow(`TMDB discover page ${page} failed: ${error.message}`));
      }
    }
  }

  if (options.enrich && allMovies.length > 0) {
    allMovies = await fetcher.enrichMovieData(allMovies);
  }

  console.log(chalk.green(`Found ${allMovies.length} movies matching advanced criteria`));
  await exportMovies(allMovies, options.format, options.outputDir, 'advanced_search');
}

async function exportMovies(movies, formats, outputDir, prefix) {
  const spinner = ora('Exporting data...').start();
  
  try {
    const exportedFiles = [];

    for (const format of formats) {
      let exporter, filename, filePath;

      switch (format.toLowerCase()) {
        case 'json':
          exporter = new JSONExporter(outputDir);
          filename = generateFilename(`${prefix}_movies`, 'json');
          filePath = await exporter.exportWithMetadata(movies, {
            totalMovies: movies.length,
            exportType: prefix,
            filters: 'Applied as specified'
          }, filename);
          exportedFiles.push(filePath);
          break;

        case 'csv':
          exporter = new CSVExporter(outputDir);
          filename = generateFilename(`${prefix}_movies`, 'csv');
          filePath = await exporter.exportMovies(movies, filename);
          exportedFiles.push(filePath);
          
          // Also export cast data separately
          const castFilename = generateFilename(`${prefix}_cast`, 'csv');
          const castFilePath = await exporter.exportCast(movies, castFilename);
          exportedFiles.push(castFilePath);
          break;

        case 'excel':
          exporter = new ExcelExporter(outputDir);
          filename = generateFilename(`${prefix}_movies`, 'xlsx');
          filePath = await exporter.exportMovies(movies, filename);
          exportedFiles.push(filePath);
          break;

        case 'sql':
          exporter = new SQLExporter(outputDir);
          filename = generateFilename(`${prefix}_movies`, 'sql');
          filePath = await exporter.exportMovies(movies, filename);
          exportedFiles.push(filePath);
          break;

        default:
          console.warn(chalk.yellow(`Unknown format: ${format}`));
      }
    }

    spinner.succeed('Export completed successfully!');
    
    console.log(chalk.green('\nExported files:'));
    exportedFiles.forEach(file => {
      console.log(chalk.cyan(`  ${file}`));
    });

    console.log(chalk.blue(`\nTotal movies exported: ${movies.length}`));

  } catch (error) {
    spinner.fail('Export failed');
    throw error;
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

program.parse(process.argv);

// Show help if no command is provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
