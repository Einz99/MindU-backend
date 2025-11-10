const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Check if file is an image
 */
const isImage = (mimetype) => {
  return mimetype && mimetype.startsWith('image/');
};

/**
 * Compress an image file
 */
const compressImage = async (file, outputPath, quality = 80) => {
  try {
    if (!isImage(file.mimetype)) {
      // Not an image, just move file without compression
      fs.renameSync(file.path, outputPath);
      return outputPath;
    }

    const ext = path.extname(file.originalname).toLowerCase();
    let sharpInstance = sharp(file.path);
    
    if (ext === '.png') {
      await sharpInstance
        .png({ quality, compressionLevel: 9 })
        .toFile(outputPath);
    } else if (ext === '.jpg' || ext === '.jpeg') {
      await sharpInstance
        .jpeg({ quality, mozjpeg: true })
        .toFile(outputPath);
    } else if (ext === '.webp') {
      await sharpInstance
        .webp({ quality })
        .toFile(outputPath);
    } else {
      await sharpInstance
        .jpeg({ quality, mozjpeg: true })
        .toFile(outputPath);
    }
    
    // Delete temp file after compression
    fs.unlinkSync(file.path);
    return outputPath;
  } catch (error) {
    console.error('[compressImage] Error:', error);
    throw error;
  }
};

/**
 * Compress and resize image (for thumbnails/banners)
 */
const compressAndResize = async (file, outputPath, options = {}) => {
  const { width = 1200, height = null, quality = 80 } = options;
  
  try {
    if (!isImage(file.mimetype)) {
      // Not an image, just move file
      fs.renameSync(file.path, outputPath);
      return outputPath;
    }

    await sharp(file.path)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality, mozjpeg: true })
      .toFile(outputPath);
    
    // Delete temp file after compression
    fs.unlinkSync(file.path);
    return outputPath;
  } catch (error) {
    console.error('[compressAndResize] Error:', error);
    throw error;
  }
};

module.exports = { compressImage, compressAndResize, isImage };