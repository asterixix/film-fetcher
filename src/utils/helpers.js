const moment = require('moment');

/**
 * Sleep for a given number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format date to YYYY-MM-DD format
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  return moment(date).format('YYYY-MM-DD');
}

/**
 * Check if a date is within a given range
 * @param {Date|string} date - Date to check
 * @param {Date|string} startDate - Start of range
 * @param {Date|string} endDate - End of range
 * @returns {boolean} True if date is within range
 */
function isDateInRange(date, startDate, endDate) {
  const checkDate = moment(date);
  const start = moment(startDate);
  const end = moment(endDate);
  
  return checkDate.isBetween(start, end, null, '[]'); // inclusive
}

/**
 * Normalize genre string for comparison
 * @param {string} genre - Genre string to normalize
 * @returns {string} Normalized genre string
 */
function normalizeGenre(genre) {
  if (!genre) return '';
  return genre.toLowerCase().trim();
}

/**
 * Country code to name mapping for better filtering
 */
const countryMapping = {
  'pl': ['poland', 'polska', 'polish'],
  'us': ['united states', 'usa', 'america', 'united states of america'],
  'gb': ['united kingdom', 'uk', 'great britain', 'britain'],
  'de': ['germany', 'deutschland', 'german'],
  'fr': ['france', 'french'],
  'it': ['italy', 'italia', 'italian'],
  'es': ['spain', 'españa', 'spanish'],
  'jp': ['japan', 'japanese'],
  'kr': ['south korea', 'korea', 'korean'],
  'cn': ['china', 'chinese'],
  'in': ['india', 'indian'],
  'ca': ['canada', 'canadian'],
  'au': ['australia', 'australian'],
  'br': ['brazil', 'brazilian'],
  'mx': ['mexico', 'mexican'],
  'ar': ['argentina', 'argentinian'],
  'ru': ['russia', 'russian'],
  'se': ['sweden', 'swedish'],
  'no': ['norway', 'norwegian'],
  'dk': ['denmark', 'danish'],
  'fi': ['finland', 'finnish'],
  'nl': ['netherlands', 'dutch'],
  'be': ['belgium', 'belgian'],
  'ch': ['switzerland', 'swiss'],
  'at': ['austria', 'austrian']
};

/**
 * Check if a movie matches the given filters
 * @param {Object} movie - Movie object to check
 * @param {Object} filters - Filter criteria
 * @returns {boolean} True if movie matches filters
 */
function matchesFilters(movie, filters) {
  // Date range filter
  if (filters.startDate || filters.endDate) {
    const movieDate = new Date(movie.release_year, (movie.release_month || 1) - 1, movie.release_day || 1);
    
    if (filters.startDate && movieDate < new Date(filters.startDate)) {
      return false;
    }
    
    if (filters.endDate && movieDate > new Date(filters.endDate)) {
      return false;
    }
  }

  // Country filter - improved to handle both codes and names
  if (filters.country) {
    const movieCountries = movie.country ? movie.country.toLowerCase() : '';
    const filterCountry = filters.country.toLowerCase();
    
    // Direct match
    if (movieCountries.includes(filterCountry)) {
      return true;
    }
    
    // Check if filter is a country code and movie has the full name
    const countryVariants = countryMapping[filterCountry];
    if (countryVariants) {
      const hasMatch = countryVariants.some(variant => movieCountries.includes(variant));
      if (!hasMatch) {
        return false;
      }
    } else if (!movieCountries.includes(filterCountry)) {
      // If no mapping found, fall back to direct string matching
      return false;
    }
  }

  // Genre filter
  if (filters.genre) {
    const movieGenres = movie.genre ? movie.genre.toLowerCase() : '';
    const filterGenre = filters.genre.toLowerCase();
    
    if (!movieGenres.includes(filterGenre)) {
      return false;
    }
  }

  return true;
}

/**
 * Merge movie data from multiple sources
 * @param {Array} movieDataArray - Array of movie objects from different sources
 * @returns {Object} Merged movie object
 */
function mergeMovieData(movieDataArray) {
  if (!movieDataArray || movieDataArray.length === 0) {
    return null;
  }

  // Start with the first movie data as base
  const merged = { ...movieDataArray[0] };
  
  // Merge data from other sources, prioritizing non-null values
  for (let i = 1; i < movieDataArray.length; i++) {
    const current = movieDataArray[i];
    
    Object.keys(current).forEach(key => {
      if (current[key] !== null && current[key] !== undefined && current[key] !== '') {
        if (key === 'cast' && Array.isArray(current[key]) && Array.isArray(merged[key])) {
          // Merge cast arrays, avoiding duplicates
          const existingNames = merged[key].map(actor => actor.name);
          const newActors = current[key].filter(actor => !existingNames.includes(actor.name));
          merged[key] = [...merged[key], ...newActors];
        } else if (key === 'other_titles' && Array.isArray(current[key]) && Array.isArray(merged[key])) {
          // Merge other titles arrays
          merged[key] = [...merged[key], ...current[key]];
        } else if (!merged[key] || merged[key] === null || merged[key] === '') {
          // Use value from current source if merged doesn't have it
          merged[key] = current[key];
        }
      }
    });
  }

  // Add sources information
  merged.sources = movieDataArray.map(data => data.source).filter(Boolean);

  return merged;
}

/**
 * Clean and validate movie data
 * @param {Object} movie - Movie object to clean
 * @returns {Object} Cleaned movie object
 */
function cleanMovieData(movie) {
  if (!movie) return null;

  const cleaned = { ...movie };

  // Ensure numeric fields are properly typed
  if (cleaned.release_year) {
    cleaned.release_year = parseInt(cleaned.release_year);
  }
  if (cleaned.release_month) {
    cleaned.release_month = parseInt(cleaned.release_month);
  }
  if (cleaned.release_day) {
    cleaned.release_day = parseInt(cleaned.release_day);
  }
  if (cleaned.runtime_min) {
    cleaned.runtime_min = parseInt(cleaned.runtime_min);
  }
  if (cleaned.budget) {
    cleaned.budget = parseFloat(cleaned.budget);
  }
  if (cleaned.gross_worldwide_boxoffice) {
    cleaned.gross_worldwide_boxoffice = parseFloat(cleaned.gross_worldwide_boxoffice);
  }

  // Ensure boolean fields are properly typed
  if (cleaned.is_color !== null && cleaned.is_color !== undefined) {
    cleaned.is_color = Boolean(cleaned.is_color);
  }

  // Clean string fields
  ['title', 'original_title', 'country', 'description', 'genre', 'distribution', 'studio', 'based_on'].forEach(field => {
    if (cleaned[field] && typeof cleaned[field] === 'string') {
      cleaned[field] = cleaned[field].trim();
    }
  });

  // Ensure cast is an array
  if (!Array.isArray(cleaned.cast)) {
    cleaned.cast = [];
  }

  // Ensure other_titles is an array
  if (!Array.isArray(cleaned.other_titles)) {
    cleaned.other_titles = [];
  }

  return cleaned;
}

/**
 * Generate a filename with timestamp
 * @param {string} baseName - Base filename
 * @param {string} extension - File extension
 * @returns {string} Filename with timestamp
 */
function generateFilename(baseName, extension) {
  const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
  return `${baseName}_${timestamp}.${extension}`;
}

module.exports = {
  sleep,
  formatDate,
  isDateInRange,
  normalizeGenre,
  matchesFilters,
  mergeMovieData,
  cleanMovieData,
  generateFilename
};
