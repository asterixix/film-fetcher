const axios = require('axios');
const { sleep } = require('../utils/helpers');

class IMDBApi {
  constructor(apiKey = null, rateLimitPerSecond = 5) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.imdbapi.dev';
    this.rateLimitDelay = 1000 / rateLimitPerSecond;
    this.lastRequestTime = 0;
  }

  async rateLimitedRequest(endpoint, params = {}) {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await sleep(this.rateLimitDelay - timeSinceLastRequest);
    }
    
    this.lastRequestTime = Date.now();
    
    try {
      const config = {
        timeout: 15000,
        params: params,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'filmweb-fetcher/1.0.0'
        }
      };

      if (this.apiKey) {
        config.headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await axios.get(`${this.baseUrl}${endpoint}`, config);
      return response.data;
    } catch (error) {
      // Only log detailed errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error('IMDB API Error:', error.message);
      }
      throw error;
    }
  }

  async searchTitles(query, options = {}) {
    try {
      // The IMDB API might not support text search without authentication
      // Try using the list endpoint with minimal filters
      const params = {
        types: ['MOVIE'],
        sortBy: 'SORT_BY_POPULARITY',
        sortOrder: 'DESC',
        ...options
      };
      
      return await this.rateLimitedRequest('/titles', params);
    } catch (error) {
      // Return empty results on failure
      return { titles: [] };
    }
  }

  async searchMovies(query) {
    try {
      // Since text search might not be available, we'll return empty results
      // and rely on ID-based lookups for enrichment
      console.warn(`IMDB text search not available for "${query}". Use IMDB ID for direct lookup.`);
      return { results: [] };
    } catch (error) {
      return { results: [] };
    }
  }

  async getMovieDetails(imdbId) {
    try {
      // Ensure proper format (tt1234567)
      const titleId = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`;
      return await this.rateLimitedRequest(`/titles/${titleId}`);
    } catch (error) {
      return null;
    }
  }

  async batchGetTitles(imdbIds) {
    try {
      // Ensure proper format and limit to 5 IDs as per API spec
      const titleIds = imdbIds
        .slice(0, 5)
        .map(id => id.startsWith('tt') ? id : `tt${id}`);
      
      const params = {
        titleIds: titleIds
      };
      
      return await this.rateLimitedRequest('/titles:batchGet', params);
    } catch (error) {
      return { titles: [] };
    }
  }

  async listTitles(filters = {}) {
    try {
      const params = {
        types: ['MOVIE'],
        sortBy: 'SORT_BY_POPULARITY',
        sortOrder: 'DESC',
        ...filters
      };
      
      return await this.rateLimitedRequest('/titles', params);
    } catch (error) {
      return { titles: [] };
    }
  }

  async getTitleCredits(titleId) {
    try {
      const cleanId = titleId.startsWith('tt') ? titleId : `tt${titleId}`;
      return await this.rateLimitedRequest(`/titles/${cleanId}/credits`);
    } catch (error) {
      return { cast: [], crew: [] };
    }
  }

  async getTitleReleaseDates(titleId) {
    try {
      const cleanId = titleId.startsWith('tt') ? titleId : `tt${titleId}`;
      return await this.rateLimitedRequest(`/titles/${cleanId}/releaseDates`);
    } catch (error) {
      return { releaseDates: [] };
    }
  }

  async getTitleRatings(titleId) {
    try {
      const cleanId = titleId.startsWith('tt') ? titleId : `tt${titleId}`;
      return await this.rateLimitedRequest(`/titles/${cleanId}/ratings`);
    } catch (error) {
      return null;
    }
  }

  async getTitleVideos(titleId) {
    try {
      const cleanId = titleId.startsWith('tt') ? titleId : `tt${titleId}`;
      return await this.rateLimitedRequest(`/titles/${cleanId}/videos`);
    } catch (error) {
      return { videos: [] };
    }
  }

  async getTitleImages(titleId) {
    try {
      const cleanId = titleId.startsWith('tt') ? titleId : `tt${titleId}`;
      return await this.rateLimitedRequest(`/titles/${cleanId}/images`);
    } catch (error) {
      return { images: [] };
    }
  }

  async getPersonDetails(personId) {
    try {
      const cleanId = personId.startsWith('nm') ? personId : `nm${personId}`;
      return await this.rateLimitedRequest(`/names/${cleanId}`);
    } catch (error) {
      return null;
    }
  }

  async getPersonCredits(personId) {
    try {
      const cleanId = personId.startsWith('nm') ? personId : `nm${personId}`;
      return await this.rateLimitedRequest(`/names/${cleanId}/credits`);
    } catch (error) {
      return { titles: [] };
    }
  }

  async advancedTitleSearch(filters = {}) {
    try {
      const params = {
        types: ['MOVIE'],
        sortBy: 'SORT_BY_POPULARITY',
        sortOrder: 'DESC',
        ...filters
      };

      // Add advanced filtering options based on IMDB API spec
      if (filters.minRating) params.minAggregateRating = filters.minRating;
      if (filters.maxRating) params.maxAggregateRating = filters.maxRating;
      if (filters.minVotes) params.minVoteCount = filters.minVotes;
      if (filters.maxVotes) params.maxVoteCount = filters.maxVotes;
      if (filters.startYear) params.startYear = filters.startYear;
      if (filters.endYear) params.endYear = filters.endYear;
      if (filters.genres) params.genres = Array.isArray(filters.genres) ? filters.genres : [filters.genres];
      if (filters.countries) params.countryCodes = Array.isArray(filters.countries) ? filters.countries : [filters.countries];
      if (filters.languages) params.languageCodes = Array.isArray(filters.languages) ? filters.languages : [filters.languages];

      return await this.rateLimitedRequest('/titles', params);
    } catch (error) {
      return { titles: [] };
    }
  }

  normalizeMovieData(imdbData) {
    if (!imdbData) {
      return null;
    }

    // Parse release year from startYear field
    const releaseYear = imdbData.startYear || null;
    const releaseMonth = null; // Not provided in basic response
    const releaseDay = null; // Not provided in basic response

    // Parse cast from stars array
    const cast = imdbData.stars ? 
      imdbData.stars.map(star => ({
        name: star.displayName || star.name || star.primaryName,
        role: null // Character names not available in basic title response
      })) : [];

    // Parse runtime from runtimeSeconds
    const runtime = imdbData.runtimeSeconds ? 
      Math.round(imdbData.runtimeSeconds / 60) : null;

    // Parse genres array
    const genres = imdbData.genres ? 
      imdbData.genres.join('/') : null;

    // Parse countries from originCountries
    const countries = imdbData.originCountries ? 
      imdbData.originCountries.map(c => c.name).join(', ') : null;

    // Parse directors
    const directors = imdbData.directors ? 
      imdbData.directors.map(d => d.displayName || d.name || d.primaryName).join(', ') : null;

    // Parse writers
    const writers = imdbData.writers ? 
      imdbData.writers.map(w => w.displayName || w.name || w.primaryName).join(', ') : null;

    return {
      title: imdbData.primaryTitle,
      original_title: imdbData.originalTitle || imdbData.primaryTitle,
      release_year: releaseYear,
      release_month: releaseMonth,
      release_day: releaseDay,
      country: countries,
      description: imdbData.plot,
      cast: cast,
      genre: genres,
      runtime_min: runtime,
      is_color: true, // Modern movies assumption
      gross_worldwide_boxoffice: null, // Not available in basic response
      budget: null, // Not available in basic response
      distribution: null, // Not available in basic response
      studio: null, // Not available in basic response
      based_on: null, // Not available in basic response
      other_titles: [],
      imdb_id: imdbData.id,
      imdb_rating: imdbData.rating?.aggregateRating || null,
      imdb_vote_count: imdbData.rating?.voteCount || null,
      metacritic_score: imdbData.metacritic?.score || null,
      director: directors,
      writer: writers,
      awards: null, // Not available in basic response
      poster_url: imdbData.primaryImage?.url || null,
      source: 'IMDB'
    };
  }
}

module.exports = IMDBApi;
