const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs').promises;
const path = require('path');

class CSVExporter {
  constructor(outputDir = './output') {
    this.outputDir = outputDir;
  }

  async ensureOutputDir() {
    try {
      await fs.access(this.outputDir);
    } catch {
      await fs.mkdir(this.outputDir, { recursive: true });
    }
  }

  getMovieHeaders() {
    return [
      { id: 'title', title: 'Title' },
      { id: 'original_title', title: 'Original Title' },
      { id: 'release_year', title: 'Release Year' },
      { id: 'release_month', title: 'Release Month' },
      { id: 'release_day', title: 'Release Day' },
      { id: 'country', title: 'Country' },
      { id: 'description', title: 'Description' },
      { id: 'cast_names', title: 'Cast Names' },
      { id: 'cast_roles', title: 'Cast Roles' },
      { id: 'genre', title: 'Genre' },
      { id: 'runtime_min', title: 'Runtime (minutes)' },
      { id: 'is_color', title: 'Is Color' },
      { id: 'gross_worldwide_boxoffice', title: 'Worldwide Box Office' },
      { id: 'budget', title: 'Budget' },
      { id: 'distribution', title: 'Distribution' },
      { id: 'studio', title: 'Studio' },
      { id: 'based_on', title: 'Based On' },
      { id: 'other_titles', title: 'Other Titles' },
      { id: 'imdb_id', title: 'IMDB ID' },
      { id: 'imdb_rating', title: 'IMDB Rating' },
      { id: 'tmdb_id', title: 'TMDB ID' },
      { id: 'tmdb_rating', title: 'TMDB Rating' },
      { id: 'director', title: 'Director' },
      { id: 'writer', title: 'Writer' },
      { id: 'awards', title: 'Awards' },
      { id: 'poster_url', title: 'Poster URL' },
      { id: 'sources', title: 'Data Sources' }
    ];
  }

  flattenMovieData(movies) {
    return movies.map(movie => {
      const flattened = { ...movie };

      // Flatten cast array
      if (Array.isArray(movie.cast)) {
        flattened.cast_names = movie.cast.map(actor => actor.name).join('; ');
        flattened.cast_roles = movie.cast.map(actor => actor.role || '').join('; ');
      } else {
        flattened.cast_names = '';
        flattened.cast_roles = '';
      }

      // Flatten other titles array
      if (Array.isArray(movie.other_titles)) {
        flattened.other_titles = movie.other_titles
          .map(title => `${title.title} (${title.country})`)
          .join('; ');
      } else {
        flattened.other_titles = '';
      }

      // Flatten sources array
      if (Array.isArray(movie.sources)) {
        flattened.sources = movie.sources.join('; ');
      } else if (movie.source) {
        flattened.sources = movie.source;
      } else {
        flattened.sources = '';
      }

      // Remove original complex objects
      delete flattened.cast;
      delete flattened.source;

      // Convert boolean to string for CSV
      if (flattened.is_color !== null && flattened.is_color !== undefined) {
        flattened.is_color = flattened.is_color ? 'Yes' : 'No';
      }

      return flattened;
    });
  }

  async exportMovies(movies, filename = 'movies.csv') {
    await this.ensureOutputDir();
    
    const filePath = path.join(this.outputDir, filename);
    const flattenedData = this.flattenMovieData(movies);
    
    const csvWriter = createCsvWriter({
      path: filePath,
      header: this.getMovieHeaders(),
      encoding: 'utf8'
    });

    await csvWriter.writeRecords(flattenedData);
    
    return filePath;
  }

  async exportCast(movies, filename = 'cast.csv') {
    await this.ensureOutputDir();
    
    const filePath = path.join(this.outputDir, filename);
    const castData = [];

    movies.forEach(movie => {
      if (Array.isArray(movie.cast)) {
        movie.cast.forEach(actor => {
          castData.push({
            movie_title: movie.title,
            actor_name: actor.name,
            character_role: actor.role || '',
            release_year: movie.release_year
          });
        });
      }
    });

    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'movie_title', title: 'Movie Title' },
        { id: 'actor_name', title: 'Actor Name' },
        { id: 'character_role', title: 'Character Role' },
        { id: 'release_year', title: 'Release Year' }
      ],
      encoding: 'utf8'
    });

    await csvWriter.writeRecords(castData);
    
    return filePath;
  }
}

module.exports = CSVExporter;
