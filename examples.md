# Filmweb Fetcher - Advanced Usage Examples

## 🎬 Complete Enhanced Movie Data Fetching Examples

### Basic Usage Examples

```bash
# Simple search with SQL export
node index.js search --titles "The Matrix" --format sql

# Multiple movies with all formats
node index.js search --titles "Inception" "The Dark Knight" --format json csv excel sql

# Search from file with enrichment
node index.js search --file movies.txt --enrich --apis omdb tmdb --format excel
```

### Discovery Examples

```bash
# Discover Polish movies with SQL export
node index.js discover --country "PL" --start-date "2000-01-01" --format sql

# Large US Action dataset
node index.js discover --country "US" --genre "Action" --max-pages 50 --format sql

# Streaming mode for very large datasets
node index.js discover --country "US" --max-pages 200 --streaming --format csv
```

### Trending & Top Rated Examples

```bash
# Weekly trending movies
node index.js trending --time-window week --format json

# Daily trending with enrichment
node index.js trending --time-window day --enrich --apis omdb tmdb --format excel

# Top rated movies with SQL export
node index.js top-rated --max-pages 10 --format sql

# Top rated with full enrichment
node index.js top-rated --enrich --apis omdb tmdb imdb --format excel
```

### Advanced Search Examples

```bash
# High-rated action movies (8.0+ rating, 100k+ votes)
node index.js advanced-search --min-rating 8.0 --min-votes 100000 --genres Action --countries US --format sql

# Complex multi-criteria search
node index.js advanced-search \
  --min-rating 7.5 \
  --min-votes 50000 \
  --min-year 1990 \
  --max-year 2020 \
  --genres "Sci-Fi" "Drama" \
  --countries US GB \
  --languages en \
  --format excel

# Find highly rated recent movies
node index.js advanced-search --min-rating 8.5 --min-year 2015 --enrich --format sql
```

### API Selection Examples

```bash
# Use only OMDB (best for awards and financial data)
node index.js search --titles "The Godfather" --apis omdb --format json

# Use only TMDB (best for discovery and international data)
node index.js discover --country "PL" --apis tmdb --format sql

# Use OMDB + TMDB (best overall quality)
node index.js search --titles "Inception" --apis omdb tmdb --enrich --format excel

# Use TMDB + IMDB (best for ratings and cast)
node index.js trending --apis tmdb imdb --enrich --format sql

# Use all three APIs (maximum data coverage)
node index.js search --titles "The Matrix" --apis omdb tmdb imdb --enrich --format excel
```

### Large Dataset Examples

```bash
# Process 1000+ movies efficiently
node index.js discover --genre "Drama" --max-pages 100 --batch-size 25 --format sql

# Stream very large datasets
node index.js discover --country "US" --max-pages 500 --streaming --format csv

# Advanced search with large results
node index.js advanced-search --min-rating 7.0 --min-votes 10000 --max-pages 50 --format sql
```

### Research-Focused Examples

```bash
# Polish cinema research
node index.js discover --country "PL" --start-date "1990-01-01" --enrich --apis omdb tmdb --format excel sql

# Sci-Fi movie analysis
node index.js advanced-search --genres "Science Fiction" --min-rating 7.0 --min-year 1980 --format sql

# Box office analysis
node index.js search --file blockbusters.txt --enrich --apis omdb tmdb --format excel

# Trending analysis over time
node index.js trending --time-window week --enrich --format sql
node index.js trending --time-window day --enrich --format sql
```

### Export Format Combinations

```bash
# All formats for comprehensive analysis
node index.js search --titles "The Matrix" --format json csv excel sql

# Database-ready export
node index.js discover --genre "Action" --max-pages 20 --format sql

# Research-ready spreadsheet
node index.js top-rated --enrich --apis omdb tmdb imdb --format excel

# Data science ready
node index.js advanced-search --min-rating 8.0 --format json csv
```

## 📊 Data Quality Examples

### Rich Data from Multiple Sources

When using `--enrich --apis omdb tmdb imdb`, you get:

```json
{
  "title": "The Matrix",
  "sources": ["OMDB", "TMDB", "IMDB"],
  "imdb_rating": 8.7,
  "imdb_vote_count": 2187879,
  "tmdb_rating": 8.232,
  "metascore": 73,
  "metacritic_score": 73,
  "awards": "Won 4 Oscars. 42 wins & 52 nominations total",
  "budget": 63000000,
  "gross_worldwide_boxoffice": 172076928,
  "keywords": "artificial intelligence, virtual reality, cyberpunk",
  "videos": [{"type": "Trailer", "url": "https://youtube.com/..."}],
  "social_media": {
    "facebook_id": "thematrix",
    "twitter_id": "thematrix"
  }
}
```

### SQL Database Schema

The SQL export creates a complete relational database:

```sql
-- Normalized tables
CREATE TABLE movies (...);
CREATE TABLE cast (...);
CREATE TABLE alternative_titles (...);
CREATE TABLE genres (...);
CREATE TABLE countries (...);

-- With proper indexes and relationships
CREATE INDEX idx_movies_rating ON movies(imdb_rating);
CREATE INDEX idx_cast_actor_name ON cast(actor_name);

-- Sample analytical queries included
SELECT * FROM movies WHERE imdb_rating >= 8.0;
SELECT m.title, c.actor_name FROM movies m JOIN cast c ON m.id = c.movie_id;
```

## 🎯 Performance Optimizations

### Memory Management
- Batch processing for large datasets
- Streaming mode for 500+ pages
- Configurable batch sizes
- Automatic memory cleanup

### Rate Limiting
- OMDB: 10 requests/second (configurable)
- TMDB: 40 requests/10 seconds
- IMDB: 5 requests/second (conservative)
- Intelligent delays and retries

### Error Handling
- Graceful API failure handling
- Silent error mode for production
- Detailed debugging in development
- Fallback strategies for missing data
