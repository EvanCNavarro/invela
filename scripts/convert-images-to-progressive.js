#!/usr/bin/env node

/**
 * ========================================
 * Progressive JPEG Conversion Script
 * ========================================
 * 
 * Batch converts all PNG images in the project to progressive JPEGs
 * with 90% quality and optimal compression settings.
 * 
 * Features:
 * - Recursive directory scanning
 * - Progressive JPEG encoding with interlacing
 * - Preserves original PNG files as fallbacks
 * - Detailed compression statistics
 * - Error handling and validation
 * 
 * Usage: node scripts/convert-images-to-progressive.js
 * 
 * @version 1.0.0
 * @since 2025-06-08
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  // Image quality (90% for optimal balance of size vs quality)
  quality: 90,
  // Directories to scan for images
  scanDirectories: [
    'public/assets',
    'client/src/assets',
    'uploads',
    'attached_assets'
  ],
  // Image extensions to convert
  extensions: ['.png', '.webp', '.gif'],
  // Skip files containing these patterns
  skipPatterns: [
    'favicon',
    'icon-',
    'logo-small',
    'thumbnail-'
  ]
};

class ProgressiveImageConverter {
  constructor() {
    this.stats = {
      processed: 0,
      converted: 0,
      skipped: 0,
      errors: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0
    };
  }

  /**
   * Check if ImageMagick is available
   */
  async checkDependencies() {
    try {
      execSync('convert -version', { stdio: 'ignore' });
      console.log('✓ ImageMagick found');
      return true;
    } catch (error) {
      console.error('✗ ImageMagick not found. Please install ImageMagick:');
      console.error('  Ubuntu/Debian: apt-get install imagemagick');
      console.error('  macOS: brew install imagemagick');
      console.error('  Windows: Download from https://imagemagick.org/');
      return false;
    }
  }

  /**
   * Get file size in bytes
   */
  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Convert single image to progressive JPEG
   */
  async convertImage(inputPath, outputPath) {
    try {
      const command = [
        'convert',
        `"${inputPath}"`,
        '-quality', CONFIG.quality.toString(),
        '-interlace', 'JPEG',
        '-sampling-factor', '4:2:0',
        '-define', 'jpeg:optimize-coding=true',
        '-strip',
        `"${outputPath}"`
      ].join(' ');

      execSync(command, { stdio: 'ignore' });
      return true;
    } catch (error) {
      console.error(`Failed to convert ${inputPath}:`, error.message);
      return false;
    }
  }

  /**
   * Check if file should be skipped
   */
  shouldSkipFile(fileName) {
    return CONFIG.skipPatterns.some(pattern => 
      fileName.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Recursively find all images in directory
   */
  async findImages(directory) {
    const images = [];
    
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          const subImages = await this.findImages(fullPath);
          images.push(...subImages);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          
          if (CONFIG.extensions.includes(ext) && !this.shouldSkipFile(entry.name)) {
            images.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or is not accessible
      console.log(`Skipping directory ${directory}: ${error.message}`);
    }
    
    return images;
  }

  /**
   * Process all images in specified directories
   */
  async processAllImages() {
    console.log('🔍 Scanning for images to convert...\n');
    
    // Find all images
    const allImages = [];
    for (const dir of CONFIG.scanDirectories) {
      const images = await this.findImages(dir);
      allImages.push(...images);
    }
    
    if (allImages.length === 0) {
      console.log('No images found to convert.');
      return;
    }
    
    console.log(`Found ${allImages.length} images to process\n`);
    
    // Process each image
    for (const imagePath of allImages) {
      await this.processImage(imagePath);
    }
    
    this.printSummary();
  }

  /**
   * Process single image
   */
  async processImage(imagePath) {
    this.stats.processed++;
    
    const dir = path.dirname(imagePath);
    const name = path.parse(imagePath).name;
    const jpegPath = path.join(dir, `${name}.jpg`);
    
    console.log(`Processing: ${imagePath}`);
    
    // Check if JPEG already exists
    try {
      await fs.access(jpegPath);
      console.log(`  ⚠️  JPEG already exists: ${jpegPath}`);
      this.stats.skipped++;
      return;
    } catch (error) {
      // JPEG doesn't exist, proceed with conversion
    }
    
    // Get original file size
    const originalSize = await this.getFileSize(imagePath);
    this.stats.totalOriginalSize += originalSize;
    
    // Convert to progressive JPEG
    const success = await this.convertImage(imagePath, jpegPath);
    
    if (success) {
      const compressedSize = await this.getFileSize(jpegPath);
      this.stats.totalCompressedSize += compressedSize;
      this.stats.converted++;
      
      const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
      const originalKB = (originalSize / 1024).toFixed(1);
      const compressedKB = (compressedSize / 1024).toFixed(1);
      
      console.log(`  ✅ Converted: ${originalKB}KB → ${compressedKB}KB (${savings}% smaller)`);
    } else {
      this.stats.errors++;
      console.log(`  ❌ Failed to convert`);
    }
    
    console.log('');
  }

  /**
   * Print conversion summary
   */
  printSummary() {
    const totalSavings = this.stats.totalOriginalSize > 0 
      ? ((this.stats.totalOriginalSize - this.stats.totalCompressedSize) / this.stats.totalOriginalSize * 100).toFixed(1)
      : '0';
    
    const originalMB = (this.stats.totalOriginalSize / 1024 / 1024).toFixed(2);
    const compressedMB = (this.stats.totalCompressedSize / 1024 / 1024).toFixed(2);
    const savedMB = (originalMB - compressedMB).toFixed(2);
    
    console.log('=========================================');
    console.log('📊 CONVERSION SUMMARY');
    console.log('=========================================');
    console.log(`Images processed: ${this.stats.processed}`);
    console.log(`Successfully converted: ${this.stats.converted}`);
    console.log(`Skipped (already exist): ${this.stats.skipped}`);
    console.log(`Errors: ${this.stats.errors}`);
    console.log('');
    console.log(`Original total size: ${originalMB} MB`);
    console.log(`Compressed total size: ${compressedMB} MB`);
    console.log(`Total space saved: ${savedMB} MB (${totalSavings}%)`);
    console.log('');
    
    if (this.stats.converted > 0) {
      console.log('✨ Progressive JPEG conversion completed!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Update your components to use ProgressiveImage');
      console.log('2. Test the improved loading performance');
      console.log('3. Consider using the new progressive JPEGs in production');
    }
  }

  /**
   * Main execution method
   */
  async run() {
    console.log('🖼️  Progressive JPEG Conversion Tool');
    console.log('=====================================\n');
    
    // Check dependencies
    const hasImageMagick = await this.checkDependencies();
    if (!hasImageMagick) {
      process.exit(1);
    }
    
    console.log(`Quality setting: ${CONFIG.quality}%`);
    console.log(`Scan directories: ${CONFIG.scanDirectories.join(', ')}`);
    console.log(`Target extensions: ${CONFIG.extensions.join(', ')}\n`);
    
    await this.processAllImages();
  }
}

// Run the converter
const converter = new ProgressiveImageConverter();
converter.run().catch(error => {
  console.error('Conversion failed:', error);
  process.exit(1);
});