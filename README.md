# Filmweb Fetcher

A comprehensive Node.js application that fetches movie data from multiple APIs (OMDB, TMDB, IMDB) and exports it to JSON, CSV, and Excel formats for research purposes.

## Features

- 🎬 **Multi-API Support**: Fetches data from OMDB, TMDB, and IMDB APIs
- 📊 **Multiple Export Formats**: JSON, CSV, and Excel with detailed worksheets
- 🔍 **Advanced Filtering**: Filter by release date range, country, and genre
- 🔄 **Data Enrichment**: Merge and enrich data from multiple sources
- 🚀 **CLI Interface**: Easy-to-use command line interface
- ⚡ **Rate Limiting**: Respects API rate limits to prevent blocking
- 📈 **Progress Tracking**: Visual progress indicators and detailed logging

## Installation

### Option 1: Global Installation (Recommended)

Install globally via npm for easy CLI access:

```bash
npm install -g film-fetcher
```

After installation, you can use the `film-fetcher` command from anywhere:

```bash
film-fetcher --help
film-fetcher search --titles "The Matrix" --format json
```

### Option 2: Local Development

1. Clone the repository:
```bash
git clone https://github.com/asterixix/film-fetcher.git
cd film-fetcher
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env
```

4. Edit the `.env` file and add your API keys:
```env
OMDB_API_KEY=your_omdb_api_key_here
TMDB_API_KEY=your_tmdb_api_key_here
IMDB_API_KEY=your_imdb_api_key_here  # Optional
OUTPUT_DIR=./output
RATE_LIMIT_PER_SECOND=10
```

## Getting API Keys

### OMDB API
1. Visit [OMDB API](https://www.omdbapi.com/apikey.aspx)
2. Register for a free API key
3. Add it to your `.env` file

### TMDB API
1. Visit [TMDB API](https://developer.themoviedb.org/reference/intro/getting-started)
2. Create an account and request an API key
3. Add it to your `.env` file

### IMDB API (Optional)
1. Visit [IMDB API](https://imdbapi.dev/)
2. Some endpoints work without keys, others may require registration

## Usage

### Check Configuration
```bash
node index.js config
```

### Search for Specific Movies
```bash
# Search by movie titles
node index.js search --titles "The Matrix" "Inception" "Interstellar"

# Search with specific APIs (avoid problematic APIs)
node index.js search --titles "The Matrix" --apis omdb tmdb --format json

# Search with filters
node index.js search --titles "The Matrix" --start-date "1990-01-01" --end-date "2010-12-31" --country "USA" --genre "Action"

# Search from file (one title per line)
node index.js search --file movies.txt --format json csv excel

# Enrich data from selected APIs only
node index.js search --titles "The Matrix" --apis tmdb omdb --enrich --format excel

# Use only TMDB for reliable results
node index.js search --titles "Inception" --apis tmdb --enrich --format json
```

### Discover Movies
```bash
# Discover movies with filters
node index.js discover --start-date "2020-01-01" --end-date "2023-12-31" --genre "Action" --country "US"

# Discover with specific APIs for enrichment
node index.js discover --country "PL" --apis tmdb --enrich --format json

# Discover with multiple pages and selected APIs
node index.js discover --genre "Drama" --max-pages 10 --apis omdb tmdb --format json csv excel sql

# Enrich discovered movies with reliable APIs only
node index.js discover --genre "Sci-Fi" --apis tmdb --enrich --format excel

# Large dataset discovery with streaming
node index.js discover --country "US" --genre "Action" --max-pages 100 --apis tmdb --streaming
```

### Get Trending Movies
```bash
# Weekly trending movies
node index.js trending --time-window week --format json

# Daily trending with enrichment
node index.js trending --time-window day --enrich --apis omdb tmdb --format excel

# Export trending to SQL database
node index.js trending --max-pages 3 --format sql
```

### Get Top Rated Movies
```bash
# Top rated movies
node index.js top-rated --max-pages 5 --format json

# Top rated with full enrichment
node index.js top-rated --enrich --apis omdb tmdb imdb --format excel

# Export top rated to SQL
node index.js top-rated --format sql
```

### Advanced Search
```bash
# High-rated action movies from 2000-2020
node index.js advanced-search --min-rating 8.0 --min-votes 100000 --min-year 2000 --max-year 2020 --genres Action --countries US

# Complex multi-criteria search
node index.js advanced-search --min-rating 7.5 --min-votes 50000 --genres "Sci-Fi" "Drama" --countries US GB --languages en --format sql

# Advanced search with enrichment
node index.js advanced-search --min-rating 8.5 --min-year 1990 --enrich --apis omdb tmdb imdb --format excel
```

### Command Options

#### Search Command
- `--titles <titles...>`: Movie titles to search for
- `--file <file>`: File containing movie titles (one per line)
- `--start-date <date>`: Filter by release date start (YYYY-MM-DD)
- `--end-date <date>`: Filter by release date end (YYYY-MM-DD)
- `--country <country>`: Filter by country
- `--genre <genre>`: Filter by genre
- `--apis <apis...>`: APIs to use (omdb, tmdb, imdb) - default: omdb, tmdb
- `--format <formats...>`: Export formats (json, csv, excel) - default: json
- `--output-dir <dir>`: Output directory - default: ./output
- `--enrich`: Enrich data by fetching from multiple APIs

#### Discover Command
- `--start-date <date>`: Filter by release date start (YYYY-MM-DD)
- `--end-date <date>`: Filter by release date end (YYYY-MM-DD)
- `--country <country>`: Filter by country (ISO code, e.g., US, PL)
- `--genre <genre>`: Filter by genre
- `--max-pages <number>`: Maximum pages to fetch (up to 500) - default: 50
- `--batch-size <number>`: Batch size for processing (lower = less memory) - default: 100
- `--apis <apis...>`: APIs to use for enrichment (omdb, tmdb, imdb) - default: tmdb
- `--format <formats...>`: Export formats (json, csv, excel, sql) - default: json
- `--output-dir <dir>`: Output directory - default: ./output
- `--enrich`: Enrich data by fetching from multiple APIs
- `--streaming`: Use streaming export for large datasets

#### Trending Command
- `--time-window <window>`: Time window (day, week) - default: week
- `--max-pages <number>`: Maximum pages to fetch - default: 5
- `--apis <apis...>`: APIs to use for enrichment - default: tmdb
- `--format <formats...>`: Export formats (json, csv, excel, sql) - default: json
- `--output-dir <dir>`: Output directory - default: ./output
- `--enrich`: Enrich data by fetching from multiple APIs

#### Top Rated Command
- `--max-pages <number>`: Maximum pages to fetch - default: 5
- `--apis <apis...>`: APIs to use for enrichment - default: tmdb
- `--format <formats...>`: Export formats (json, csv, excel, sql) - default: json
- `--output-dir <dir>`: Output directory - default: ./output
- `--enrich`: Enrich data by fetching from multiple APIs

#### Advanced Search Command
- `--min-rating <rating>`: Minimum IMDB rating (0-10)
- `--max-rating <rating>`: Maximum IMDB rating (0-10)
- `--min-votes <votes>`: Minimum vote count
- `--min-year <year>`: Minimum release year
- `--max-year <year>`: Maximum release year
- `--genres <genres...>`: Genres to include
- `--countries <countries...>`: Countries to include (ISO codes)
- `--languages <languages...>`: Languages to include (ISO codes)
- `--sort-by <sort>`: Sort by (popularity, rating, year, votes) - default: popularity
- `--max-pages <number>`: Maximum pages to fetch - default: 10
- `--apis <apis...>`: APIs to use - default: imdb, tmdb
- `--format <formats...>`: Export formats (json, csv, excel, sql) - default: json
- `--output-dir <dir>`: Output directory - default: ./output
- `--enrich`: Enrich data by fetching from multiple APIs

## Output Formats

### JSON Format
The JSON export includes complete movie data with the following structure:
```json
[
  {
    "title": "OGNIEM I MIECZEM",
    "original_title": "Ogniem i mieczem",
    "release_year": 1999,
    "release_month": 10,
    "release_day": 8,
    "country": "Polska",
    "description": "Adaptacja powieści Henryka Sienkiewicza...",
    "cast": [
      {
        "name": "Michał Żebrowski",
        "role": "Jan Skrzetuski"
      }
    ],
    "genre": "Historical/Adventure",
    "runtime_min": 175,
    "is_color": true,
    "gross_worldwide_boxoffice": null,
    "budget": 15000000.0,
    "distribution": "Syrena EG",
    "studio": "Agencja Produkcji Filmowej",
    "based_on": "Henryk Sienkiewicz (powieść)",
    "other_titles": [
      {
        "title": "With Fire and Sword",
        "country": "USA"
      }
    ],
    "imdb_id": "tt0124296",
    "imdb_rating": 7.0,
    "tmdb_id": 12345,
    "sources": ["OMDB", "TMDB"]
  }
]
```

### CSV Format
Two CSV files are generated:
- `movies.csv`: Main movie data with flattened fields
- `cast.csv`: Separate file with detailed cast information

### Excel Format
Excel files contain multiple worksheets:
- **Movies**: Main movie data
- **Cast**: Detailed cast information
- **Other Titles**: Alternative titles by country
- **Summary**: Export statistics and metadata

### SQL Format
SQL files contain complete database schema and data:
- **Schema Creation**: Full database structure with indexes
- **Data Insertion**: All movie data with proper escaping
- **Normalized Tables**: Movies, cast, alternative titles, genres, countries
- **Sample Queries**: Ready-to-use SQL queries for analysis
- **Database Ready**: Can be imported into SQLite, MySQL, PostgreSQL

## API Selection

You can now choose which APIs to use for fetching and enrichment, giving you better control over data quality and avoiding problematic APIs.

### Available APIs
- `omdb`: OMDB API (requires API key)
- `tmdb`: The Movie Database API (requires API key) 
- `imdb`: IMDB API (optional API key, but often unreliable)
- `filmweb`: Filmweb API (placeholder, not implemented)

### Recommended Configurations

#### Most Reliable (Recommended)
```bash
--apis omdb tmdb
```
- **Best overall data quality and reliability**
- OMDB provides excellent financial data, awards, and detailed ratings
- TMDB provides discovery, images, and international data
- Requires both OMDB and TMDB API keys

#### TMDB Only (Discovery & Large Datasets)
```bash
--apis tmdb
```
- Perfect for discovery and large datasets
- Most reliable for Polish and international movies
- Only requires TMDB API key

#### TMDB + IMDB (Best Enrichment)
```bash
--apis tmdb imdb
```
- Excellent for enrichment with detailed IMDB data
- Combines TMDB discovery with IMDB ratings and cast info
- Requires TMDB API key, IMDB API key optional

#### OMDB Only (Detailed Info)
```bash
--apis omdb
```
- Great for detailed movie information
- Good for US/UK movies
- Only requires OMDB API key

### API Selection Examples
```bash
# Use only TMDB (most reliable)
node index.js search --titles "The Matrix" --apis tmdb

# Use OMDB and TMDB (best quality - RECOMMENDED)
node index.js search --titles "Inception" --apis omdb tmdb --enrich

# Discovery with TMDB only (recommended for large datasets)
node index.js discover --country "PL" --apis tmdb --max-pages 50

# Use TMDB + IMDB for best enrichment (now working!)
node index.js search --titles "The Matrix" --apis tmdb imdb --enrich
```

## Data Sources

### OMDB API
- The Open Movie Database (via [omdbapi.com](https://www.omdbapi.com/))
- Comprehensive movie database with excellent data quality
- Provides detailed plot, ratings, cast, awards, and financial data
- Includes IMDB ratings, Metascore, box office, and technical details
- Rate limit: Configurable (default: 10 requests/second)
- **Status**: ✅ Excellent (Highly Recommended)
- **Features**: Awards data, financial info, ratings, detailed cast

### TMDB API
- The Movie Database
- Rich metadata, images, and alternative titles
- Rate limit: 40 requests per 10 seconds
- **Status**: ✅ Most Reliable (Recommended)

### IMDB API
- Internet Movie Database (via [imdbapi.dev](https://imdbapi.dev))
- Excellent ratings, cast, director, and technical details
- Rich metadata including Metacritic scores and vote counts
- Rate limit: 5 requests per second (conservative)
- **Status**: ✅ Working (ID-based lookups only)
- **Note**: Text search requires authentication, but enrichment works perfectly

### Enhanced Data Coverage

All three APIs now provide extensive data coverage:

**OMDB API Fields:**
- Financial data (budget, box office, production costs)
- Awards and nominations
- Technical details (runtime, color, rating)
- Cast and crew information
- Release information (DVD, streaming)
- Official websites and additional metadata

**TMDB API Fields:**
- Rich media (posters, backdrops, videos, trailers)
- International data (alternative titles, release dates)
- Social media links (Facebook, Instagram, Twitter)
- Keywords and themes
- Watch providers and streaming availability
- Similar movies and recommendations
- Detailed cast with character names and photos

**IMDB API Fields:**
- Authoritative ratings with vote counts
- Metacritic scores and reviews
- Detailed cast and crew with roles
- Production information
- International release dates
- High-quality images and media

## Error Handling

The application includes comprehensive error handling:
- API rate limiting with automatic delays
- Graceful handling of missing data
- Detailed error logging with colored output
- Fallback mechanisms when APIs are unavailable

## Rate Limiting

The application respects API rate limits:
- OMDB: Configurable (default: 10 requests/second)
- TMDB: 40 requests per 10 seconds
- IMDB: 5 requests/second (conservative)

## Examples

### Example 1: Search for Polish Movies
```bash
node index.js search --titles "Ogniem i mieczem" "Krzyżacy" "Potop" --country "Poland" --format excel
```

### Example 2: Discover Recent Action Movies
```bash
node index.js discover --start-date "2020-01-01" --genre "Action" --max-pages 5 --enrich --format json csv excel
```

### Example 3: Bulk Search from File
Create a file `movies.txt`:
```
The Matrix
Inception
Interstellar
Blade Runner 2049
```

Then run:
```bash
node index.js search --file movies.txt --enrich --format excel
```

## Troubleshooting

### Common Issues

1. **API Key Errors**
   - Ensure your API keys are correctly set in the `.env` file
   - Check that your API keys are valid and have not expired

2. **Rate Limit Exceeded**
   - The application automatically handles rate limiting
   - If you encounter issues, try reducing the `RATE_LIMIT_PER_SECOND` value

3. **No Results Found**
   - Check your search terms for typos
   - Try broader search criteria
   - Verify that the movie exists in the target databases

4. **Export Errors**
   - Ensure the output directory exists and is writable
   - Check available disk space

### Debug Mode
Set `NODE_ENV=development` for more detailed logging:
```bash
NODE_ENV=development node index.js search --titles "The Matrix"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [OMDB API](https://www.omdbapi.com/) for movie data
- [TMDB API](https://developer.themoviedb.org/) for comprehensive movie database
- [IMDB API](https://imdbapi.dev/) for additional movie information
- [Filmweb API](https://github.com/b44x/filmweb-api) for inspiration

## Changelog

### Version 1.0.0
- Initial release
- Multi-API support for OMDB, TMDB, and IMDB
- JSON, CSV, and Excel export formats
- CLI interface with filtering options
- Data enrichment capabilities
- Comprehensive error handling and rate limiting
