const axios = require('axios');
const { sleep } = require('../utils/helpers');

class TMDBApi {
  constructor(apiKey, rateLimitPerSecond = 40) { // TMDB allows 40 requests per 10 seconds
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.themoviedb.org/3';
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
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params: {
          api_key: this.apiKey,
          language: 'en-US',
          ...params
        },
        timeout: 10000
      });
      
      return response.data;
    } catch (error) {
      console.error('TMDB API Error:', error.message);
      throw error;
    }
  }

  async searchMovies(query, year = null, page = 1) {
    const params = {
      query: query,
      page: page,
      include_adult: false
    };
    
    if (year) {
      params.year = year;
    }
    
    return await this.rateLimitedRequest('/search/movie', params);
  }

  async getMovieDetails(movieId) {
    return await this.rateLimitedRequest(`/movie/${movieId}`, {
      append_to_response: 'credits,keywords,release_dates,alternative_titles,videos,images,reviews,similar,recommendations,watch/providers,external_ids'
    });
  }

  async getMovieCredits(movieId) {
    return await this.rateLimitedRequest(`/movie/${movieId}/credits`);
  }

  async getMovieKeywords(movieId) {
    return await this.rateLimitedRequest(`/movie/${movieId}/keywords`);
  }

  async getMovieVideos(movieId) {
    return await this.rateLimitedRequest(`/movie/${movieId}/videos`);
  }

  async getMovieImages(movieId) {
    return await this.rateLimitedRequest(`/movie/${movieId}/images`);
  }

  async getMovieReviews(movieId, page = 1) {
    return await this.rateLimitedRequest(`/movie/${movieId}/reviews`, { page });
  }

  async getSimilarMovies(movieId, page = 1) {
    return await this.rateLimitedRequest(`/movie/${movieId}/similar`, { page });
  }

  async getMovieRecommendations(movieId, page = 1) {
    return await this.rateLimitedRequest(`/movie/${movieId}/recommendations`, { page });
  }

  async getWatchProviders(movieId) {
    return await this.rateLimitedRequest(`/movie/${movieId}/watch/providers`);
  }

  async getExternalIds(movieId) {
    return await this.rateLimitedRequest(`/movie/${movieId}/external_ids`);
  }

  async getTrendingMovies(timeWindow = 'week', page = 1) {
    return await this.rateLimitedRequest(`/trending/movie/${timeWindow}`, { page });
  }

  async getPopularMovies(page = 1) {
    return await this.rateLimitedRequest('/movie/popular', { page });
  }

  async getTopRatedMovies(page = 1) {
    return await this.rateLimitedRequest('/movie/top_rated', { page });
  }

  async getUpcomingMovies(page = 1) {
    return await this.rateLimitedRequest('/movie/upcoming', { page });
  }

  async getNowPlayingMovies(page = 1) {
    return await this.rateLimitedRequest('/movie/now_playing', { page });
  }

  async getMoviesByCompany(companyId, page = 1) {
    return await this.rateLimitedRequest('/discover/movie', {
      with_companies: companyId,
      page
    });
  }

  async getMoviesByPerson(personId, page = 1) {
    return await this.rateLimitedRequest('/discover/movie', {
      with_people: personId,
      page
    });
  }

  async searchCompanies(query) {
    return await this.rateLimitedRequest('/search/company', { query });
  }

  async searchPeople(query) {
    return await this.rateLimitedRequest('/search/person', { query });
  }

  async getPersonDetails(personId) {
    return await this.rateLimitedRequest(`/person/${personId}`, {
      append_to_response: 'movie_credits,external_ids,images'
    });
  }

  async discoverMovies(filters = {}) {
    const params = {
      sort_by: 'popularity.desc',
      include_adult: false,
      include_video: false,
      page: filters.page || 1
    };

    // Add date filters
    if (filters.release_date_gte) {
      params['release_date.gte'] = filters.release_date_gte;
    }
    if (filters.release_date_lte) {
      params['release_date.lte'] = filters.release_date_lte;
    }

    // Add genre filter
    if (filters.with_genres) {
      params.with_genres = filters.with_genres;
    }

    // Add country filter
    if (filters.with_origin_country) {
      params.with_origin_country = filters.with_origin_country;
    }

    return await this.rateLimitedRequest('/discover/movie', params);
  }

  async getGenres() {
    return await this.rateLimitedRequest('/genre/movie/list');
  }

  async getCountries() {
    return await this.rateLimitedRequest('/configuration/countries');
  }

  normalizeMovieData(tmdbData) {
    if (!tmdbData) {
      return null;
    }

    const releaseDate = new Date(tmdbData.release_date);
    
    // Parse cast from credits (get more cast members)
    const cast = tmdbData.credits && tmdbData.credits.cast ? 
      tmdbData.credits.cast.slice(0, 20).map((actor, index) => ({
        name: actor.name,
        role: actor.character,
        order: actor.order || index,
        profile_path: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : null
      })) : [];

    // Parse crew (directors, writers, producers)
    const crew = tmdbData.credits && tmdbData.credits.crew ? tmdbData.credits.crew : [];
    const directors = crew.filter(person => person.job === 'Director').map(d => d.name).join(', ');
    const writers = crew.filter(person => ['Writer', 'Screenplay', 'Story'].includes(person.job)).map(w => w.name).join(', ');
    const producers = crew.filter(person => person.job === 'Producer').map(p => p.name).join(', ');

    // Parse genres
    const genres = tmdbData.genres ? 
      tmdbData.genres.map(g => g.name).join('/') : null;

    // Parse production countries
    const countries = tmdbData.production_countries ? 
      tmdbData.production_countries.map(c => c.name).join(', ') : null;

    // Parse production companies (studios)
    const studios = tmdbData.production_companies ? 
      tmdbData.production_companies.map(c => c.name).join(' / ') : null;

    // Parse alternative titles
    const otherTitles = tmdbData.alternative_titles && tmdbData.alternative_titles.titles ? 
      tmdbData.alternative_titles.titles.map(alt => ({
        title: alt.title,
        country: alt.iso_3166_1
      })) : [];

    // Parse keywords
    const keywords = tmdbData.keywords && tmdbData.keywords.keywords ? 
      tmdbData.keywords.keywords.map(k => k.name).join(', ') : null;

    // Parse videos (trailers, etc.)
    const videos = tmdbData.videos && tmdbData.videos.results ? 
      tmdbData.videos.results.filter(v => v.site === 'YouTube').map(video => ({
        key: video.key,
        name: video.name,
        type: video.type,
        url: `https://www.youtube.com/watch?v=${video.key}`
      })) : [];

    // Parse images
    const images = tmdbData.images ? {
      backdrops: tmdbData.images.backdrops ? tmdbData.images.backdrops.length : 0,
      posters: tmdbData.images.posters ? tmdbData.images.posters.length : 0,
      logos: tmdbData.images.logos ? tmdbData.images.logos.length : 0
    } : null;

    // Parse external IDs
    const externalIds = tmdbData.external_ids || {};

    // Parse spoken languages
    const spokenLanguages = tmdbData.spoken_languages ? 
      tmdbData.spoken_languages.map(lang => lang.english_name || lang.name).join(', ') : null;

    // Parse watch providers
    const watchProviders = tmdbData['watch/providers'] && tmdbData['watch/providers'].results ? 
      Object.keys(tmdbData['watch/providers'].results).length : 0;

    return {
      title: tmdbData.title,
      original_title: tmdbData.original_title,
      release_year: releaseDate.getFullYear() || null,
      release_month: releaseDate.getMonth() + 1 || null,
      release_day: releaseDate.getDate() || null,
      country: countries,
      description: tmdbData.overview,
      tagline: tmdbData.tagline,
      cast: cast,
      genre: genres,
      runtime_min: tmdbData.runtime,
      is_color: true, // Assumption for modern movies
      gross_worldwide_boxoffice: tmdbData.revenue > 0 ? tmdbData.revenue : null,
      budget: tmdbData.budget > 0 ? tmdbData.budget : null,
      distribution: null, // Not directly available
      studio: studios,
      based_on: null, // Not directly available
      other_titles: otherTitles,
      tmdb_id: tmdbData.id,
      imdb_id: tmdbData.imdb_id || externalIds.imdb_id,
      tmdb_rating: tmdbData.vote_average,
      tmdb_vote_count: tmdbData.vote_count,
      popularity: tmdbData.popularity,
      poster_url: tmdbData.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : null,
      backdrop_url: tmdbData.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}` : null,
      
      // Additional TMDB-specific fields
      adult: tmdbData.adult,
      homepage: tmdbData.homepage,
      status: tmdbData.status,
      keywords: keywords,
      videos: videos,
      images_count: images,
      spoken_languages: spokenLanguages,
      watch_providers_count: watchProviders,
      
      // Crew details
      director: directors,
      writer: writers,
      producer: producers,
      
      // External IDs
      facebook_id: externalIds.facebook_id,
      instagram_id: externalIds.instagram_id,
      twitter_id: externalIds.twitter_id,
      wikidata_id: externalIds.wikidata_id,
      
      source: 'TMDB'
    };
  }
}

module.exports = TMDBApi;
