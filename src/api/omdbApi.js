const axios = require('axios');
const { sleep } = require('../utils/helpers');

class OMDBApi {
  constructor(apiKey, rateLimitPerSecond = 10) {
    this.apiKey = apiKey;
    this.baseUrl = 'http://www.omdbapi.com/';
    this.rateLimitDelay = 1000 / rateLimitPerSecond;
    this.lastRequestTime = 0;
  }

  async rateLimitedRequest(params) {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await sleep(this.rateLimitDelay - timeSinceLastRequest);
    }
    
    this.lastRequestTime = Date.now();
    
    try {
      // Ensure API key is provided
      if (!this.apiKey) {
        throw new Error('OMDB API key is required. Get one at: https://www.omdbapi.com/apikey.aspx');
      }

      const requestParams = {
        apikey: this.apiKey,
        r: 'json', // Explicitly request JSON response
        v: '1', // API version
        ...params
      };

      const response = await axios.get(this.baseUrl, {
        params: requestParams,
        timeout: 15000,
        headers: {
          'User-Agent': 'filmweb-fetcher/1.0.0'
        }
      });
      
      // Check for API response errors
      if (response.data.Response === 'False') {
        const errorMsg = response.data.Error || 'Unknown OMDB API Error';
        if (process.env.NODE_ENV === 'development') {
          console.warn(`OMDB API: ${errorMsg}`);
        }
        throw new Error(errorMsg);
      }
      
      return response.data;
    } catch (error) {
      // Only log detailed errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error('OMDB API Error:', error.message);
      }
      throw error;
    }
  }

  async searchMovies(title, year = null, type = 'movie', page = 1) {
    // Validate page number (1-100 as per documentation)
    const validPage = Math.max(1, Math.min(100, parseInt(page) || 1));
    
    const params = {
      s: title.trim(),
      type: type,
      page: validPage
    };
    
    // Add year filter if provided
    if (year) {
      params.y = parseInt(year);
    }
    
    return await this.rateLimitedRequest(params);
  }

  async getMovieDetails(imdbId) {
    // Validate IMDb ID format
    if (!imdbId || typeof imdbId !== 'string') {
      throw new Error('Valid IMDb ID is required');
    }
    
    // Clean IMDb ID (remove tt prefix if present, then add it back)
    const cleanId = imdbId.replace(/^tt/, '');
    const formattedId = `tt${cleanId}`;
    
    return await this.rateLimitedRequest({
      i: formattedId,
      plot: 'full'
    });
  }

  async getMovieByTitle(title, year = null) {
    // Validate title
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new Error('Valid movie title is required');
    }
    
    const params = {
      t: title.trim(),
      plot: 'full'
    };
    
    // Add year filter if provided
    if (year) {
      params.y = parseInt(year);
    }
    
    return await this.rateLimitedRequest(params);
  }

  async getMovieByTitleAndYear(title, year) {
    return await this.getMovieByTitle(title, year);
  }

  async batchSearch(titles, options = {}) {
    const results = [];
    const { year = null, type = 'movie', delay = 100 } = options;
    
    for (let i = 0; i < titles.length; i++) {
      try {
        const result = await this.getMovieByTitle(titles[i], year);
        if (result && result.Response !== 'False') {
          results.push(result);
        }
        
        // Add delay between requests to respect rate limits
        if (i < titles.length - 1 && delay > 0) {
          await sleep(delay);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Failed to fetch "${titles[i]}": ${error.message}`);
        }
      }
    }
    
    return results;
  }

  normalizeMovieData(omdbData) {
    if (!omdbData || omdbData.Response === 'False') {
      return null;
    }

    // Helper function to safely parse date
    const parseReleaseDate = (dateStr) => {
      if (!dateStr || dateStr === 'N/A') return { year: null, month: null, day: null };
      
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return { year: null, month: null, day: null };
        
        return {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          day: date.getDate()
        };
      } catch {
        return { year: null, month: null, day: null };
      }
    };

    // Helper function to safely parse numeric values
    const parseNumeric = (value, isFloat = false) => {
      if (!value || value === 'N/A') return null;
      
      try {
        const cleaned = value.toString().replace(/[,$]/g, '');
        const parsed = isFloat ? parseFloat(cleaned) : parseInt(cleaned);
        return isNaN(parsed) ? null : parsed;
      } catch {
        return null;
      }
    };

    // Parse release date
    const releaseDate = parseReleaseDate(omdbData.Released);
    
    // Parse runtime (remove non-digit characters)
    const runtime = omdbData.Runtime ? parseNumeric(omdbData.Runtime.replace(/\D/g, '')) : null;
    
    // Parse financial data
    const budget = parseNumeric(omdbData.Budget, true);
    const boxOffice = parseNumeric(omdbData.BoxOffice, true);

    // Parse cast from Actors field
    const cast = omdbData.Actors && omdbData.Actors !== 'N/A' ? 
      omdbData.Actors.split(', ').map(actor => ({
        name: actor.trim(),
        role: null // OMDB doesn't provide character names in basic response
      })).filter(actor => actor.name.length > 0) : [];

    // Parse ratings
    const imdbRating = parseNumeric(omdbData.imdbRating, true);
    const metascore = parseNumeric(omdbData.Metascore);

    // Determine if movie is in color (modern assumption for movies after 1950)
    const isColor = omdbData.Type === 'movie' && releaseDate.year && releaseDate.year > 1950 ? true : null;

    return {
      title: omdbData.Title || null,
      original_title: omdbData.Title || null,
      release_year: releaseDate.year,
      release_month: releaseDate.month,
      release_day: releaseDate.day,
      country: omdbData.Country !== 'N/A' ? omdbData.Country : null,
      description: omdbData.Plot !== 'N/A' ? omdbData.Plot : null,
      cast: cast,
      genre: omdbData.Genre !== 'N/A' ? omdbData.Genre : null,
      runtime_min: runtime,
      is_color: isColor,
      gross_worldwide_boxoffice: boxOffice,
      budget: budget,
      distribution: null, // Not available in OMDB
      studio: omdbData.Production !== 'N/A' ? omdbData.Production : null,
      based_on: null, // Not directly available in OMDB
      other_titles: [],
      imdb_id: omdbData.imdbID || null,
      imdb_rating: imdbRating,
      imdb_vote_count: parseNumeric(omdbData.imdbVotes?.replace(/,/g, '')),
      metascore: metascore,
      director: omdbData.Director !== 'N/A' ? omdbData.Director : null,
      writer: omdbData.Writer !== 'N/A' ? omdbData.Writer : null,
      awards: omdbData.Awards !== 'N/A' ? omdbData.Awards : null,
      poster_url: omdbData.Poster !== 'N/A' ? omdbData.Poster : null,
      language: omdbData.Language !== 'N/A' ? omdbData.Language : null,
      rated: omdbData.Rated !== 'N/A' ? omdbData.Rated : null,
      dvd_release: omdbData.DVD !== 'N/A' ? omdbData.DVD : null,
      website: omdbData.Website !== 'N/A' ? omdbData.Website : null,
      source: 'OMDB'
    };
  }
}

module.exports = OMDBApi;
