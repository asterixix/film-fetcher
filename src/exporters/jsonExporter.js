const fs = require('fs').promises;
const path = require('path');

class JSONExporter {
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

  async export(data, filename) {
    await this.ensureOutputDir();
    
    const filePath = path.join(this.outputDir, filename);
    const jsonData = JSON.stringify(data, null, 2);
    
    await fs.writeFile(filePath, jsonData, 'utf8');
    
    return filePath;
  }

  async exportMovies(movies, filename = 'movies.json') {
    return await this.export(movies, filename);
  }

  async exportWithMetadata(movies, metadata, filename = 'movies_with_metadata.json') {
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalMovies: movies.length,
        ...metadata
      },
      movies: movies
    };

    return await this.export(exportData, filename);
  }
}

module.exports = JSONExporter;
