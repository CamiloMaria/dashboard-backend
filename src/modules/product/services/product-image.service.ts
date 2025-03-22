import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { WebProduct } from '../entities/shop/web-product.entity';
import { WebProductImage } from '../entities/shop/web-product-image.entity';
import { DatabaseConnection } from '../../../config/database/constants';
import { EnvService } from '../../../config/env/env.service';
import { ExternalApiService } from '../../../common/services/external-api.service';

@Injectable()
export class ProductImageService {
  private readonly logger = new Logger(ProductImageService.name);

  constructor(
    @InjectRepository(WebProduct, DatabaseConnection.SHOP)
    private readonly webProductRepository: Repository<WebProduct>,
    @InjectRepository(WebProductImage, DatabaseConnection.SHOP)
    private readonly webProductImageRepository: Repository<WebProductImage>,
    private readonly externalApiService: ExternalApiService,
    private readonly envService: EnvService,
  ) {}

  /**
   * Upload product images in batch
   * @param files Array of uploaded files
   * @param username Username of the user uploading the images
   * @returns Array of uploaded image data
   */
  async uploadImages(
    files: Express.Multer.File[],
    username: string,
  ): Promise<any[]> {
    const results = [];
    const batchStats = {
      total: files.length,
      processed: 0,
      successful: 0,
      failed: 0,
    };

    // Batch token management
    const BATCH_TOKEN_LIMIT = 199; // Keep under 200 to be safe
    let currentBatchToken = '';
    let batchTokenUsageCount = 0;

    /**
     * Get a batch token, either reusing the current one or fetching a new one if limit reached
     */
    const getBatchToken = async (): Promise<string> => {
      // Get a new token if we don't have one or if we've hit the limit
      if (!currentBatchToken || batchTokenUsageCount >= BATCH_TOKEN_LIMIT) {
        currentBatchToken = await this.externalApiService.getBatchToken();
        batchTokenUsageCount = 0;
        this.logger.log(
          `Obtained new batch token #${Math.ceil(batchStats.processed / BATCH_TOKEN_LIMIT) + 1}: ${currentBatchToken.slice(0, 10)}...`,
        );
      }

      // Increment the usage counter
      batchTokenUsageCount++;

      return currentBatchToken;
    };

    try {
      // Extract SKUs from filenames using regex
      const fileData = files.map((file) => {
        // Assuming filename format contains SKU (e.g., product-123456789.jpg)
        const skuMatch = file.originalname.match(/[0-9]{9,13}/);
        const sku = skuMatch ? skuMatch[0] : null;

        return {
          file,
          sku,
        };
      });

      // Filter out files without valid SKUs
      const validFiles = fileData.filter((data) => data.sku);

      if (validFiles.length === 0) {
        throw new HttpException(
          {
            success: false,
            message: 'No valid product SKUs found in filenames',
            error: 'BAD_REQUEST',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Get unique SKUs
      const uniqueSkus = [...new Set(validFiles.map((data) => data.sku))];

      // Log batch processing start
      this.logger.log(
        `Starting batch upload of ${validFiles.length} images for ${uniqueSkus.length} unique products`,
      );

      // Initialize the first batch token
      currentBatchToken = await this.externalApiService.getBatchToken();
      this.logger.log(
        `Obtained initial batch token: ${currentBatchToken.slice(0, 10)}...`,
      );

      // Find products by SKUs
      const products = await this.webProductRepository.find({
        where: { sku: In(uniqueSkus) },
        relations: ['images'],
      });

      // Map products by SKU for easy access
      const productMap = new Map();
      products.forEach((product) => {
        productMap.set(product.sku, product);
      });

      // Group files by product SKU
      const filesByProduct = new Map<string, Express.Multer.File[]>();
      validFiles.forEach(({ file, sku }) => {
        if (!filesByProduct.has(sku)) {
          filesByProduct.set(sku, []);
        }
        filesByProduct.get(sku).push(file);
      });

      // Process each product's files
      for (const [sku, productFiles] of filesByProduct.entries()) {
        const product = productMap.get(sku);

        if (!product) {
          productFiles.forEach((file) => {
            results.push({
              filename: file.originalname,
              sku,
              success: false,
              message: `Product with SKU ${sku} not found`,
            });
            batchStats.processed++;
            batchStats.failed++;
          });
          continue;
        }

        // Process files for this product
        await this.processProductImages(
          product,
          productFiles,
          username,
          results,
          batchStats,
          getBatchToken,
        );
      }

      // Log batch processing completion
      this.logger.log(
        `Batch upload completed: ${batchStats.successful} successful, ${batchStats.failed} failed out of ${batchStats.total} total files`,
      );

      return results;
    } catch (error) {
      this.logger.error(
        `Error processing batch image uploads: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Process images for a specific product
   * @param product The product to upload images for
   * @param files Array of files for this product
   * @param username Username of the user uploading the images
   * @param results Array to collect results
   * @param batchStats Object to track batch statistics
   * @param getBatchToken Function to get a batch token, respecting limits
   */
  private async processProductImages(
    product: WebProduct,
    files: Express.Multer.File[],
    username: string,
    results: any[],
    batchStats: {
      total: number;
      processed: number;
      successful: number;
      failed: number;
    },
    getBatchToken: () => Promise<string>,
  ): Promise<void> {
    const existingImages = product.images || [];
    let nextPosition =
      existingImages.length > 0
        ? Math.max(...existingImages.map((img) => img.position || 0)) + 1
        : 1;

    // Process each file for this product in sequence to respect token limits
    for (const file of files) {
      try {
        // Get a batch token for this upload (may reuse existing or get a new one if limit reached)
        const batchToken = await getBatchToken();

        // Create new image entity
        const newImage = new WebProductImage();
        newImage.product_id = product.num;
        newImage.sku = product.sku;
        newImage.position = nextPosition++;
        newImage.alt = product.sku;
        newImage.width = 1800;
        newImage.height = 1800;
        newImage.status = 1;

        const uploadResult =
          await this.externalApiService.uploadBatchImageFromFile(
            file,
            batchToken,
            {
              productId: product.num,
              sku: product.sku,
            },
          );

        if (!uploadResult.success) {
          throw new HttpException(
            {
              success: false,
              message: 'Failed to upload image to Cloudflare',
              error: 'API_ERROR',
            },
            HttpStatus.BAD_GATEWAY,
          );
        }

        const idCloudflare = uploadResult.result.id;
        const srcCloudflare = `${this.envService.cloudflareImagePrefix}/${idCloudflare}`;

        newImage.id_cloudflare = idCloudflare;
        newImage.src_cloudflare = srcCloudflare;

        // Save image to database
        const savedImage = await this.webProductImageRepository.save(newImage);

        results.push({
          filename: file.originalname,
          sku: product.sku,
          success: true,
          message: 'Image uploaded successfully',
          imageId: savedImage.id,
          position: newImage.position,
          url: `${newImage.src_cloudflare}/base`,
        });

        batchStats.processed++;
        batchStats.successful++;
      } catch (error) {
        this.logger.error(
          `Error uploading image for SKU ${product.sku}: ${error.message}`,
          error.stack,
        );

        results.push({
          filename: file.originalname,
          sku: product.sku,
          success: false,
          message: `Failed to upload image: ${error.message}`,
        });

        batchStats.processed++;
        batchStats.failed++;
      }
    }

    // Update product in Instaleap if we uploaded at least one image
    if (batchStats.successful > 0) {
      try {
        // Find all images for the product
        const images = await this.webProductImageRepository.find({
          where: {
            product_id: product.num,
            status: 1,
          },
          order: { position: 'ASC' },
        });

        if (images.length > 0) {
          await this.externalApiService.updateProductInstaleap(product.sku, {
            photosUrl: images.map((img) => `${img.src_cloudflare}/base}`),
          });

          this.logger.log(
            `Product ${product.sku} updated with new image in Instaleap by ${username}`,
          );
        }
      } catch (instaleapError) {
        this.logger.error(
          `Failed to update product ${product.sku} in Instaleap: ${instaleapError.message}`,
          instaleapError.stack,
        );
        // Continue with the process even if Instaleap update fails
      }
    }
  }

  /**
   * Update a product image at a specific position
   * @param file Uploaded image file
   * @param sku Product SKU
   * @param position Position of the image to update
   * @param username Username of the user updating the image
   * @returns Object with success status and image data
   */
  async updateProductImage(
    file: Express.Multer.File,
    sku: string,
    position: number,
    username: string,
  ): Promise<{
    success: boolean;
    message: string;
    imageId?: number;
    position?: number;
    url?: string;
  }> {
    // Start a transaction
    const queryRunner =
      this.webProductRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find the product by SKU
      const product = await this.webProductRepository.findOne({
        where: { sku },
      });

      if (!product) {
        throw new HttpException(
          {
            success: false,
            message: `Product with SKU ${sku} not found`,
            error: 'NOT_FOUND',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      this.logger.log(
        `Updating image at position ${position} for product ${sku} by ${username}`,
      );

      // Check if an image already exists at this position
      const existingImage = await this.webProductImageRepository.findOne({
        where: {
          product_id: product.num,
          sku: product.sku,
          position,
        },
      });

      // If an image exists at this position, delete it from Cloudflare
      if (existingImage) {
        this.logger.log(
          `Found existing image at position ${position} for product ${sku} (ID: ${existingImage.id})`,
        );

        if (existingImage.id_cloudflare) {
          try {
            // Delete from Cloudflare
            await this.externalApiService.deleteImage(
              existingImage.id_cloudflare,
            );
            this.logger.log(
              `Deleted image from Cloudflare (ID: ${existingImage.id_cloudflare})`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to delete image from Cloudflare: ${error.message}`,
              error.stack,
            );
            // Continue with the update even if Cloudflare deletion fails
          }
        }

        // Delete the image record from the database
        await this.webProductImageRepository.remove(existingImage);
      }

      // Create new image entity
      const newImage = new WebProductImage();
      newImage.product_id = product.num;
      newImage.sku = product.sku;
      newImage.position = position;
      newImage.alt = product.sku;
      newImage.width = 1800;
      newImage.height = 1800;
      newImage.status = 1;

      // Upload the new image to Cloudflare
      const uploadResult =
        await this.externalApiService.uploadBatchImageFromFile(
          file,
          this.envService.cloudflareApiToken,
          {
            productId: product.num,
            sku: product.sku,
          },
        );

      if (!uploadResult.success) {
        throw new HttpException(
          {
            success: false,
            message: 'Failed to upload image to Cloudflare',
            error: 'API_ERROR',
          },
          HttpStatus.BAD_GATEWAY,
        );
      }

      const idCloudflare = uploadResult.result.id;
      const srcCloudflare = `${this.envService.cloudflareImagePrefix}/${idCloudflare}`;

      newImage.id_cloudflare = idCloudflare;
      newImage.src_cloudflare = srcCloudflare;

      // Save the new image
      const savedImage = await this.webProductImageRepository.save(newImage);

      // If this is the main image (position 1), update the product's images_url
      if (position === 1) {
        product.images_url = srcCloudflare;
        await this.webProductRepository.save(product);

        this.logger.log(`Updated main image (position 1) for product ${sku}`);
      }

      // Update product in Instaleap with all images
      try {
        // Find all images for the product
        const images = await this.webProductImageRepository.find({
          where: {
            product_id: product.num,
            status: 1,
          },
          order: { position: 'ASC' },
        });

        if (images.length > 0) {
          await this.externalApiService.updateProductInstaleap(product.sku, {
            photosUrl: images.map((img) => `${img.src_cloudflare}/base`),
          });

          this.logger.log(
            `Product ${product.sku} updated with new images in Instaleap by ${username}`,
          );
        }
      } catch (instaleapError) {
        this.logger.error(
          `Failed to update product ${product.sku} in Instaleap: ${instaleapError.message}`,
          instaleapError.stack,
        );
        // Continue with the process even if Instaleap update fails
      }

      // Commit the transaction
      await queryRunner.commitTransaction();

      return {
        success: true,
        message: `Image at position ${position} updated successfully`,
        imageId: savedImage.id,
        position,
        url: `${newImage.src_cloudflare}/base`,
      };
    } catch (error) {
      // Rollback the transaction in case of error
      await queryRunner.rollbackTransaction();

      this.logger.error(
        `Error updating image for SKU ${sku} at position ${position}: ${error.message}`,
        error.stack,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: `Failed to update image: ${error.message}`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

  /**
   * Delete a product image at a specific position
   * @param sku Product SKU
   * @param position Position of the image to delete
   * @param username Username of the user deleting the image
   * @returns Object with success status and message
   */
  async deleteProductImage(
    sku: string,
    position: number,
    username: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    // Start a transaction
    const queryRunner =
      this.webProductRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find the product by SKU
      const product = await this.webProductRepository.findOne({
        where: { sku },
      });

      if (!product) {
        throw new HttpException(
          {
            success: false,
            message: `Product with SKU ${sku} not found`,
            error: 'NOT_FOUND',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      this.logger.log(
        `Deleting image at position ${position} for product ${sku} by ${username}`,
      );

      // Check if an image exists at this position
      const imageToDelete = await this.webProductImageRepository.findOne({
        where: {
          product_id: product.num,
          sku: product.sku,
          position,
        },
      });

      if (!imageToDelete) {
        throw new HttpException(
          {
            success: false,
            message: `No image found at position ${position} for product ${sku}`,
            error: 'NOT_FOUND',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // Delete the image from Cloudflare if it has an ID
      if (imageToDelete.id_cloudflare) {
        try {
          // Delete from Cloudflare
          await this.externalApiService.deleteImage(
            imageToDelete.id_cloudflare,
          );
          this.logger.log(
            `Deleted image from Cloudflare (ID: ${imageToDelete.id_cloudflare})`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to delete image from Cloudflare: ${error.message}`,
            error.stack,
          );
          // Continue with the deletion even if Cloudflare deletion fails
        }
      }

      // Delete the image record from the database
      await this.webProductImageRepository.remove(imageToDelete);

      // If the deleted image was the main image (position 1), update the product's images_url
      if (position === 1) {
        // Find the next available image to use as the main image
        const nextMainImage = await this.webProductImageRepository.findOne({
          where: {
            product_id: product.num,
            status: 1,
          },
          order: { position: 'ASC' },
        });

        if (nextMainImage) {
          product.images_url = nextMainImage.src_cloudflare;
        } else {
          product.images_url = null; // No images left
        }

        await this.webProductRepository.save(product);
        this.logger.log(`Updated main image reference for product ${sku}`);
      }

      // Reindex remaining images to ensure consistent positions
      const remainingImages = await this.webProductImageRepository.find({
        where: {
          product_id: product.num,
          status: 1,
        },
        order: { position: 'ASC' },
      });

      // Reindex positions if there are remaining images
      if (remainingImages.length > 0) {
        let newPosition = 1;
        for (const img of remainingImages) {
          if (img.position !== newPosition) {
            img.position = newPosition;
            await this.webProductImageRepository.save(img);
          }
          newPosition++;
        }
        this.logger.log(
          `Reindexed positions for remaining ${remainingImages.length} images`,
        );
      }

      // Update product in Instaleap with remaining images
      try {
        if (remainingImages.length > 0) {
          await this.externalApiService.updateProductInstaleap(product.sku, {
            photosUrl: remainingImages.map(
              (img) => `${img.src_cloudflare}/base`,
            ),
          });
        } else {
          // No images left, update with empty array
          await this.externalApiService.updateProductInstaleap(product.sku, {
            photosUrl: [],
          });
        }

        this.logger.log(
          `Product ${product.sku} updated in Instaleap after image deletion by ${username}`,
        );
      } catch (instaleapError) {
        this.logger.error(
          `Failed to update product ${product.sku} in Instaleap: ${instaleapError.message}`,
          instaleapError.stack,
        );
        // Continue with the process even if Instaleap update fails
      }

      // Commit the transaction
      await queryRunner.commitTransaction();

      return {
        success: true,
        message: `Image at position ${position} deleted successfully`,
      };
    } catch (error) {
      // Rollback the transaction in case of error
      await queryRunner.rollbackTransaction();

      this.logger.error(
        `Error deleting image for SKU ${sku} at position ${position}: ${error.message}`,
        error.stack,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: `Failed to delete image: ${error.message}`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

  /**
   * Delete multiple product images at specific positions
   * @param sku Product SKU
   * @param positions Array of positions of the images to delete
   * @param username Username of the user deleting the images
   * @returns Object with success status and message
   */
  async deleteProductImages(
    sku: string,
    positions: number[],
    username: string,
  ): Promise<{
    success: boolean;
    message: string;
    deletedCount: number;
    failedPositions?: number[];
  }> {
    // Start a transaction
    const queryRunner =
      this.webProductRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find the product by SKU
      const product = await this.webProductRepository.findOne({
        where: { sku },
      });

      if (!product) {
        throw new HttpException(
          {
            success: false,
            message: `Product with SKU ${sku} not found`,
            error: 'NOT_FOUND',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      this.logger.log(
        `Batch deleting ${positions.length} images for product ${sku} by ${username}`,
      );

      // Track deletion results
      const failedPositions: number[] = [];
      let successCount = 0;

      // Sort positions in descending order to avoid reindexing issues
      // (deleting higher positions first won't affect lower positions)
      const sortedPositions = [...positions].sort((a, b) => b - a);

      // Process each position
      for (const position of sortedPositions) {
        try {
          // Check if an image exists at this position
          const imageToDelete = await this.webProductImageRepository.findOne({
            where: {
              product_id: product.num,
              sku: product.sku,
              position,
            },
          });

          if (!imageToDelete) {
            this.logger.warn(
              `No image found at position ${position} for product ${sku}`,
            );
            failedPositions.push(position);
            continue;
          }

          // Delete the image from Cloudflare if it has an ID
          if (imageToDelete.id_cloudflare) {
            try {
              // Delete from Cloudflare
              await this.externalApiService.deleteImage(
                imageToDelete.id_cloudflare,
              );
              this.logger.log(
                `Deleted image from Cloudflare (ID: ${imageToDelete.id_cloudflare})`,
              );
            } catch (error) {
              this.logger.error(
                `Failed to delete image from Cloudflare: ${error.message}`,
                error.stack,
              );
              // Continue with the deletion even if Cloudflare deletion fails
            }
          }

          // Delete the image record from the database
          await this.webProductImageRepository.remove(imageToDelete);
          successCount++;
        } catch (positionError) {
          this.logger.error(
            `Error deleting image at position ${position}: ${positionError.message}`,
            positionError.stack,
          );
          failedPositions.push(position);
        }
      }

      // After all deletions, check if position 1 was deleted and update main image if needed
      if (positions.includes(1)) {
        // Find the next available image to use as the main image
        const nextMainImage = await this.webProductImageRepository.findOne({
          where: {
            product_id: product.num,
            status: 1,
          },
          order: { position: 'ASC' },
        });

        if (nextMainImage) {
          product.images_url = nextMainImage.src_cloudflare;
        } else {
          product.images_url = null; // No images left
        }

        await this.webProductRepository.save(product);
        this.logger.log(`Updated main image reference for product ${sku}`);
      }

      // Reindex remaining images to ensure consistent positions
      const remainingImages = await this.webProductImageRepository.find({
        where: {
          product_id: product.num,
          status: 1,
        },
        order: { position: 'ASC' },
      });

      // Reindex positions if there are remaining images
      if (remainingImages.length > 0) {
        let newPosition = 1;
        for (const img of remainingImages) {
          if (img.position !== newPosition) {
            img.position = newPosition;
            await this.webProductImageRepository.save(img);
          }
          newPosition++;
        }
        this.logger.log(
          `Reindexed positions for remaining ${remainingImages.length} images`,
        );
      }

      // Update product in Instaleap with remaining images
      try {
        if (remainingImages.length > 0) {
          await this.externalApiService.updateProductInstaleap(product.sku, {
            photosUrl: remainingImages.map(
              (img) => `${img.src_cloudflare}/base`,
            ),
          });
        } else {
          // No images left, update with empty array
          await this.externalApiService.updateProductInstaleap(product.sku, {
            photosUrl: [],
          });
        }

        this.logger.log(
          `Product ${product.sku} updated in Instaleap after batch image deletion by ${username}`,
        );
      } catch (instaleapError) {
        this.logger.error(
          `Failed to update product ${product.sku} in Instaleap: ${instaleapError.message}`,
          instaleapError.stack,
        );
        // Continue with the process even if Instaleap update fails
      }

      // Commit the transaction
      await queryRunner.commitTransaction();

      return {
        success: true,
        message: `Successfully deleted ${successCount} of ${positions.length} images`,
        deletedCount: successCount,
        failedPositions:
          failedPositions.length > 0 ? failedPositions : undefined,
      };
    } catch (error) {
      // Rollback the transaction in case of error
      await queryRunner.rollbackTransaction();

      this.logger.error(
        `Error deleting images for SKU ${sku}: ${error.message}`,
        error.stack,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: `Failed to delete images: ${error.message}`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }
}
