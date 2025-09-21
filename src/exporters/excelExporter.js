const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs').promises;

class ExcelExporter {
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

  async exportMovies(movies, filename = 'movies.xlsx') {
    await this.ensureOutputDir();
    
    const filePath = path.join(this.outputDir, filename);
    const workbook = new ExcelJS.Workbook();
    
    // Create Movies worksheet
    const moviesSheet = workbook.addWorksheet('Movies');
    
    // Define columns for movies sheet
    moviesSheet.columns = [
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Original Title', key: 'original_title', width: 30 },
      { header: 'Release Year', key: 'release_year', width: 15 },
      { header: 'Release Month', key: 'release_month', width: 15 },
      { header: 'Release Day', key: 'release_day', width: 15 },
      { header: 'Country', key: 'country', width: 20 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Genre', key: 'genre', width: 20 },
      { header: 'Runtime (min)', key: 'runtime_min', width: 15 },
      { header: 'Is Color', key: 'is_color', width: 10 },
      { header: 'Box Office', key: 'gross_worldwide_boxoffice', width: 15 },
      { header: 'Budget', key: 'budget', width: 15 },
      { header: 'Distribution', key: 'distribution', width: 25 },
      { header: 'Studio', key: 'studio', width: 30 },
      { header: 'Based On', key: 'based_on', width: 25 },
      { header: 'IMDB ID', key: 'imdb_id', width: 15 },
      { header: 'IMDB Rating', key: 'imdb_rating', width: 15 },
      { header: 'TMDB ID', key: 'tmdb_id', width: 15 },
      { header: 'TMDB Rating', key: 'tmdb_rating', width: 15 },
      { header: 'Director', key: 'director', width: 25 },
      { header: 'Writer', key: 'writer', width: 25 },
      { header: 'Awards', key: 'awards', width: 30 },
      { header: 'Poster URL', key: 'poster_url', width: 40 },
      { header: 'Sources', key: 'sources', width: 20 }
    ];

    // Style the header row
    moviesSheet.getRow(1).font = { bold: true };
    moviesSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add movie data
    movies.forEach(movie => {
      const row = {
        title: movie.title,
        original_title: movie.original_title,
        release_year: movie.release_year,
        release_month: movie.release_month,
        release_day: movie.release_day,
        country: movie.country,
        description: movie.description,
        genre: movie.genre,
        runtime_min: movie.runtime_min,
        is_color: movie.is_color ? 'Yes' : 'No',
        gross_worldwide_boxoffice: movie.gross_worldwide_boxoffice,
        budget: movie.budget,
        distribution: movie.distribution,
        studio: movie.studio,
        based_on: movie.based_on,
        imdb_id: movie.imdb_id,
        imdb_rating: movie.imdb_rating,
        tmdb_id: movie.tmdb_id,
        tmdb_rating: movie.tmdb_rating,
        director: movie.director,
        writer: movie.writer,
        awards: movie.awards,
        poster_url: movie.poster_url,
        sources: Array.isArray(movie.sources) ? movie.sources.join(', ') : movie.source || ''
      };
      
      moviesSheet.addRow(row);
    });

    // Create Cast worksheet
    const castSheet = workbook.addWorksheet('Cast');
    
    castSheet.columns = [
      { header: 'Movie Title', key: 'movie_title', width: 30 },
      { header: 'Actor Name', key: 'actor_name', width: 25 },
      { header: 'Character Role', key: 'character_role', width: 25 },
      { header: 'Release Year', key: 'release_year', width: 15 }
    ];

    // Style the cast header row
    castSheet.getRow(1).font = { bold: true };
    castSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add cast data
    movies.forEach(movie => {
      if (Array.isArray(movie.cast)) {
        movie.cast.forEach(actor => {
          castSheet.addRow({
            movie_title: movie.title,
            actor_name: actor.name,
            character_role: actor.role || '',
            release_year: movie.release_year
          });
        });
      }
    });

    // Create Other Titles worksheet
    const otherTitlesSheet = workbook.addWorksheet('Other Titles');
    
    otherTitlesSheet.columns = [
      { header: 'Original Title', key: 'original_title', width: 30 },
      { header: 'Alternative Title', key: 'alt_title', width: 30 },
      { header: 'Country', key: 'country', width: 15 },
      { header: 'Release Year', key: 'release_year', width: 15 }
    ];

    // Style the other titles header row
    otherTitlesSheet.getRow(1).font = { bold: true };
    otherTitlesSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add other titles data
    movies.forEach(movie => {
      if (Array.isArray(movie.other_titles)) {
        movie.other_titles.forEach(altTitle => {
          otherTitlesSheet.addRow({
            original_title: movie.title,
            alt_title: altTitle.title,
            country: altTitle.country,
            release_year: movie.release_year
          });
        });
      }
    });

    // Create Summary worksheet
    const summarySheet = workbook.addWorksheet('Summary');
    
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 }
    ];

    // Style the summary header row
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add summary data
    const totalMovies = movies.length;
    const avgRating = movies.filter(m => m.imdb_rating)
      .reduce((sum, m) => sum + parseFloat(m.imdb_rating), 0) / 
      movies.filter(m => m.imdb_rating).length;
    const yearRange = movies.filter(m => m.release_year)
      .reduce((range, m) => {
        const year = m.release_year;
        return {
          min: Math.min(range.min, year),
          max: Math.max(range.max, year)
        };
      }, { min: Infinity, max: -Infinity });

    const genres = [...new Set(movies.map(m => m.genre).filter(Boolean))];
    const countries = [...new Set(movies.map(m => m.country).filter(Boolean))];

    summarySheet.addRows([
      { metric: 'Total Movies', value: totalMovies },
      { metric: 'Average IMDB Rating', value: avgRating ? avgRating.toFixed(1) : 'N/A' },
      { metric: 'Year Range', value: `${yearRange.min} - ${yearRange.max}` },
      { metric: 'Unique Genres', value: genres.length },
      { metric: 'Unique Countries', value: countries.length },
      { metric: 'Export Date', value: new Date().toISOString().split('T')[0] }
    ]);

    // Save the workbook
    await workbook.xlsx.writeFile(filePath);
    
    return filePath;
  }
}

module.exports = ExcelExporter;
