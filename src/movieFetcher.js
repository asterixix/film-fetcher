const OMDBApi = require('./api/omdbApi');
const TMDBApi = require('./api/tmdbApi');
const IMDBApi = require('./api/imdbApi');
const { matchesFilters, mergeMovieData, cleanMovieData } = require('./utils/helpers');
const chalk = require('chalk');
const ora = require('ora');

class MovieFetcher {
  constructor(config) {
    this.config = config;
    this.enabledApis = config.enabledApis || ['omdb', 'tmdb'];
    
    // Only initialize APIs that are enabled and have valid configuration
    this.omdbApi = null;
    this.tmdbApi = null;
    this.imdbApi = null;
    
    if (this.enabledApis.includes('omdb') && config.omdbApiKey) {
      this.omdbApi = new OMDBApi(config.omdbApiKey);
    }
    
    if (this.enabledApis.includes('tmdb') && config.tmdbApiKey) {
      this.tmdbApi = new TMDBApi(config.tmdbApiKey);
    }
    
    if (this.enabledApis.includes('imdb')) {
      this.imdbApi = config.imdbApiKey ? new IMDBApi(config.imdbApiKey) : new IMDBApi();
    }
    
    console.log(chalk.blue(`Enabled APIs: ${this.enabledApis.join(', ')}`));
  }

  async searchMoviesByTitle(title) {
    const results = [];
    const spinner = ora(`Searching for "${title}"`).start();

    try {
      // Search in OMDB (only if enabled)
      if (this.omdbApi && this.enabledApis.includes('omdb')) {
        try {
          spinner.text = `Searching "${title}" in OMDB...`;
          const omdbResult = await this.omdbApi.getMovieByTitle(title);
          if (omdbResult && omdbResult.Response !== 'False') {
            const normalized = this.omdbApi.normalizeMovieData(omdbResult);
            if (normalized) results.push(normalized);
          }
        } catch (error) {
          console.warn(chalk.yellow(`OMDB search failed for "${title}": ${error.message}`));
        }
      }

      // Search in TMDB (only if enabled)
      if (this.tmdbApi && this.enabledApis.includes('tmdb')) {
        try {
          spinner.text = `Searching "${title}" in TMDB...`;
          const tmdbSearchResult = await this.tmdbApi.searchMovies(title);
          if (tmdbSearchResult.results && tmdbSearchResult.results.length > 0) {
            // Get detailed info for the first result
            const movieDetails = await this.tmdbApi.getMovieDetails(tmdbSearchResult.results[0].id);
            const normalized = this.tmdbApi.normalizeMovieData(movieDetails);
            if (normalized) results.push(normalized);
          }
        } catch (error) {
          console.warn(chalk.yellow(`TMDB search failed for "${title}": ${error.message}`));
        }
      }

      // Search in IMDB (only if enabled)
      if (this.imdbApi && this.enabledApis.includes('imdb')) {
        try {
          spinner.text = `Searching "${title}" in IMDB...`;
          const imdbSearchResult = await this.imdbApi.searchMovies(title);
          if (imdbSearchResult.results && imdbSearchResult.results.length > 0) {
            // Use the first result directly or get more details if needed
            const firstResult = imdbSearchResult.results[0];
            let movieDetails = firstResult;
            
            // If we have an ID but limited data, fetch full details
            if (firstResult.id && (!firstResult.plot || !firstResult.directors)) {
              const fullDetails = await this.imdbApi.getMovieDetails(firstResult.id);
              if (fullDetails) {
                movieDetails = fullDetails;
              }
            }
            
            const normalized = this.imdbApi.normalizeMovieData(movieDetails);
            if (normalized) results.push(normalized);
          }
        } catch (error) {
          console.warn(chalk.yellow(`IMDB search failed for "${title}": ${error.message}`));
        }
      }

      spinner.succeed(`Found ${results.length} results for "${title}" using APIs: ${this.enabledApis.join(', ')}`);
      return results;

    } catch (error) {
      spinner.fail(`Search failed for "${title}": ${error.message}`);
      return [];
    }
  }

  async discoverMovies(filters = {}, onProgress = null) {
    const results = [];
    const spinner = ora('Discovering movies...').start();
    let totalResults = 0;

    try {
      // Use TMDB discover endpoint if available
      if (this.tmdbApi) {
        spinner.text = 'Discovering movies from TMDB...';
        
        // Convert filters to TMDB format
        const tmdbFilters = {};
        
        if (filters.startDate) {
          tmdbFilters['primary_release_date.gte'] = filters.startDate;
        }
        if (filters.endDate) {
          tmdbFilters['primary_release_date.lte'] = filters.endDate;
        }
        
        // Handle country filter - use production countries instead of origin country
        if (filters.country) {
          const countryCode = filters.country.toUpperCase();
          // Try multiple country-related parameters
          tmdbFilters.with_origin_country = countryCode;
          tmdbFilters.region = countryCode;
          console.log(chalk.blue(`Searching for movies from country: ${countryCode}`));
        }
        
        if (filters.genre) {
          // First get genres to map name to ID
          try {
            const genresResponse = await this.tmdbApi.getGenres();
            const genreMap = {};
            genresResponse.genres.forEach(g => {
              genreMap[g.name.toLowerCase()] = g.id;
            });
            
            const genreId = genreMap[filters.genre.toLowerCase()];
            if (genreId) {
              tmdbFilters.with_genres = genreId;
              console.log(chalk.blue(`Filtering by genre: ${filters.genre} (ID: ${genreId})`));
            } else {
              console.warn(chalk.yellow(`Genre "${filters.genre}" not found. Available genres: ${Object.keys(genreMap).join(', ')}`));
            }
          } catch (error) {
            console.warn(chalk.yellow(`Failed to fetch genres: ${error.message}`));
          }
        }

        // Remove hard limit for large datasets
        const maxPages = Math.min(filters.maxPages || 500, 500); // Allow up to 500 pages (10,000 movies)
        let consecutiveEmptyPages = 0;
        
        console.log(chalk.blue(`Searching with filters:`, JSON.stringify(tmdbFilters, null, 2)));
        
        for (let page = 1; page <= maxPages; page++) {
          try {
            tmdbFilters.page = page;
            const discoverResult = await this.tmdbApi.discoverMovies(tmdbFilters);
            
            if (discoverResult.total_results) {
              totalResults = discoverResult.total_results;
              spinner.text = `Found ${totalResults} total movies, processing page ${page}/${Math.min(discoverResult.total_pages || maxPages, maxPages)}`;
            }
            
            if (discoverResult.results && discoverResult.results.length > 0) {
              consecutiveEmptyPages = 0;
              
              // Process movies in batches to avoid memory issues
              const batchSize = 5; // Process 5 movies at a time
              for (let i = 0; i < discoverResult.results.length; i += batchSize) {
                const batch = discoverResult.results.slice(i, i + batchSize);
                
                // Process batch in parallel for better performance
                const batchPromises = batch.map(async (movie) => {
                  try {
                    spinner.text = `Processing: ${movie.title} (${movie.release_date || 'Unknown year'})`;
                    
                    // Get detailed movie information
                    const movieDetails = await this.tmdbApi.getMovieDetails(movie.id);
                    const normalized = this.tmdbApi.normalizeMovieData(movieDetails);
                    
                    if (normalized) {
                      // For country filtering, trust TMDB's API-level filtering since it's more accurate
                      // Only apply additional date filtering if needed
                      const dateOnlyFilters = { ...filters };
                      if (filters.country) {
                        delete dateOnlyFilters.country; // Trust TMDB's country filtering
                      }
                      
                      if (matchesFilters(normalized, dateOnlyFilters)) {
                        return normalized;
                      }
                    }
                    return null;
                  } catch (error) {
                    console.warn(chalk.yellow(`Failed to process movie ${movie.title}: ${error.message}`));
                    return null;
                  }
                });
                
                const batchResults = await Promise.all(batchPromises);
                const validResults = batchResults.filter(result => result !== null);
                results.push(...validResults);
                
                // Progress callback for external monitoring
                if (onProgress) {
                  onProgress({
                    page,
                    totalPages: Math.min(discoverResult.total_pages || maxPages, maxPages),
                    currentResults: results.length,
                    totalResults: totalResults
                  });
                }
                
                // Reduced rate limiting for better performance
                await new Promise(resolve => setTimeout(resolve, 50));
              }
            } else {
              consecutiveEmptyPages++;
              console.log(chalk.yellow(`Page ${page} returned no results`));
            }

            // Break if we've reached the end or hit too many empty pages
            if (!discoverResult.results || 
                discoverResult.results.length < 20 || 
                consecutiveEmptyPages >= 3 ||
                page >= (discoverResult.total_pages || 0)) {
              console.log(chalk.blue(`Stopping at page ${page}. Reason: ${
                !discoverResult.results ? 'No results' :
                discoverResult.results.length < 20 ? 'Partial page' :
                consecutiveEmptyPages >= 3 ? 'Too many empty pages' :
                'Reached total pages'
              }`));
              break;
            }
            
          } catch (error) {
            console.warn(chalk.yellow(`Failed to fetch page ${page}: ${error.message}`));
            consecutiveEmptyPages++;
            if (consecutiveEmptyPages >= 3) {
              console.log(chalk.red(`Stopping due to consecutive failures`));
              break;
            }
          }
        }
      }

      spinner.succeed(`Discovered ${results.length} movies${totalResults > 0 ? ` from ${totalResults} total matches` : ''}`);
      return results;

    } catch (error) {
      spinner.fail(`Discovery failed: ${error.message}`);
      console.error(chalk.red('Full error:'), error);
      return [];
    }
  }

  async fetchMoviesByTitles(titles, filters = {}) {
    const allResults = [];
    const spinner = ora().start();

    for (let i = 0; i < titles.length; i++) {
      const title = titles[i];
      spinner.text = `Processing ${i + 1}/${titles.length}: ${title}`;

      try {
        const movieResults = await this.searchMoviesByTitle(title);
        
        // Merge results from different APIs for the same movie
        if (movieResults.length > 0) {
          const mergedMovie = mergeMovieData(movieResults);
          const cleanedMovie = cleanMovieData(mergedMovie);
          
          if (cleanedMovie && matchesFilters(cleanedMovie, filters)) {
            allResults.push(cleanedMovie);
          }
        }

        // Add delay between requests to respect rate limits
        if (i < titles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.warn(chalk.yellow(`Failed to fetch "${title}": ${error.message}`));
      }
    }

    spinner.succeed(`Processed ${titles.length} titles, found ${allResults.length} matching movies`);
    return allResults;
  }

  async enrichMovieData(movies) {
    const spinner = ora('Enriching movie data...').start();
    const enrichedMovies = [];
    
    console.log(chalk.blue(`Enriching with APIs: ${this.enabledApis.join(', ')}`));

    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i];
      spinner.text = `Enriching ${i + 1}/${movies.length}: ${movie.title}`;

      try {
        const enrichmentResults = [];
        enrichmentResults.push(movie); // Start with existing data

        // Try to get additional data from enabled APIs using IMDB ID
        if (movie.imdb_id) {
          // Get OMDB data if enabled and not already present
          if (this.omdbApi && this.enabledApis.includes('omdb') && 
              (!movie.sources || !movie.sources.includes('OMDB'))) {
            try {
              const omdbData = await this.omdbApi.getMovieDetails(movie.imdb_id);
              if (omdbData && omdbData.Response !== 'False') {
                const normalized = this.omdbApi.normalizeMovieData(omdbData);
                if (normalized) enrichmentResults.push(normalized);
              }
            } catch (error) {
              // Silently continue if enrichment fails
            }
          }

          // Get IMDB data if enabled and not already present
          if (this.imdbApi && this.enabledApis.includes('imdb') && 
              (!movie.sources || !movie.sources.includes('IMDB'))) {
            try {
              const imdbData = await this.imdbApi.getMovieDetails(movie.imdb_id);
              if (imdbData) {
                const normalized = this.imdbApi.normalizeMovieData(imdbData);
                if (normalized) enrichmentResults.push(normalized);
              }
            } catch (error) {
              // Silently continue if enrichment fails - no error logging for cleaner output
            }
          }
        }

        // Try to get additional TMDB data if enabled and we have title but no TMDB data
        if (this.tmdbApi && this.enabledApis.includes('tmdb') && 
            (!movie.sources || !movie.sources.includes('TMDB'))) {
          try {
            const tmdbSearchResult = await this.tmdbApi.searchMovies(movie.title);
            if (tmdbSearchResult.results && tmdbSearchResult.results.length > 0) {
              const movieDetails = await this.tmdbApi.getMovieDetails(tmdbSearchResult.results[0].id);
              const normalized = this.tmdbApi.normalizeMovieData(movieDetails);
              if (normalized) enrichmentResults.push(normalized);
            }
          } catch (error) {
            // Silently continue if enrichment fails
          }
        }

        // Merge all available data
        const enrichedMovie = mergeMovieData(enrichmentResults);
        const cleanedMovie = cleanMovieData(enrichedMovie);
        
        if (cleanedMovie) {
          enrichedMovies.push(cleanedMovie);
        }

        // Rate limiting - reduced for better performance
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.warn(chalk.yellow(`Failed to enrich "${movie.title}": ${error.message}`));
        enrichedMovies.push(movie); // Keep original data if enrichment fails
      }
    }

    spinner.succeed(`Enriched ${enrichedMovies.length} movies using ${this.enabledApis.join(', ')}`);
    return enrichedMovies;
  }
}

module.exports = MovieFetcher;
