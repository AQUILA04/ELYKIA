import { Injectable } from '@angular/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class ThumbnailService {

  async generateThumbnail(imagePath: string, width: number = 200, height: number = 200): Promise<string> {
    if (Capacitor.getPlatform() === 'web') {
      // For web platform, we can't directly manipulate files, so return original path
      return imagePath;
    }

    try {
      // Read the original image file
      const originalFile = await Filesystem.readFile({
        path: imagePath,
        directory: Directory.ExternalStorage
      });

      // Create a canvas to resize the image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Create image from base64 data
      const img = new Image();
      img.src = `data:image/jpeg;base64,${originalFile.data}`;
      
      // Wait for image to load
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Draw the image on canvas with new dimensions
      ctx.drawImage(img, 0, 0, width, height);

      // Convert canvas to base64
      const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.8); // 80% quality
      
      // Extract base64 data
      const base64Data = resizedDataUrl.split(',')[1];

      // Create thumbnail filename
      const pathParts = imagePath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
      const extension = fileName.substring(fileName.lastIndexOf('.'));
      const thumbnailFileName = `${nameWithoutExt}_thumb${extension}`;
      
      // Create directory path for thumbnails
      const directoryPath = imagePath.substring(0, imagePath.lastIndexOf('/') + 1);
      const thumbnailPath = directoryPath + thumbnailFileName;

      // Write the thumbnail to filesystem
      await Filesystem.writeFile({
        path: thumbnailPath,
        data: base64Data,
        directory: Directory.ExternalStorage
      });

      return thumbnailPath;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      // Return original path if thumbnail generation fails
      return imagePath;
    }
  }
}