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

        const uploadResult = await this.externalApiService.uploadImageFromFile(
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
          try {
            await this.externalApiService.updateProductInstaleap(product.sku, {
              photosUrl: images.map((img) => `${img.src_cloudflare}/base}`),
            });
          } catch (error) {
            if (error.response?.status === 400) {
              this.logger.error(
                `Product ${product.sku} not found in Instaleap, creating it`,
              );

              const specifications: {
                title: string;
                description: string;
              }[] = JSON.parse(product.specifications);
              const specificationsArray = {
                title: 'Detalles',
                values: specifications.map((item: any) => ({
                  label: item.title,
                  value: item.description,
                })),
              };

              await this.externalApiService.createProductInstaleap({
                sku: product.sku,
                name: product.title,
                photosUrl: images.map((img) => `${img.src_cloudflare}/base}`),
                ean: [product.sku],
                unit: product.unmanejo,
                clickMultiplier: product.click_multiplier,
                description: product.description_instaleap,
                searchKeywords: product.search_keywords,
                specifications: [specificationsArray],
                brand: product.brand,
              });
            } else {
              this.logger.error(
                `Failed to update product ${product.sku} in Instaleap: ${error.message}`,
                error.stack,
              );
            }
          }

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
      const uploadResult = await this.externalApiService.uploadImageFromFile(
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

  /**
   * Reorder product images by changing their positions
   * @param sku Product SKU
   * @param positionChanges Array of position changes
   * @param username Username of the user performing the reordering
   * @returns Object with success status and reordered positions
   */
  async reorderProductImages(
    sku: string,
    positionChanges: { currentPosition: number; newPosition: number }[],
    username: string,
  ): Promise<{
    success: boolean;
    message: string;
    reorderedPositions: {
      imageId: number;
      oldPosition: number;
      newPosition: number;
    }[];
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
        `Reordering ${positionChanges.length} image positions for product ${sku} by ${username}`,
      );

      // Fetch all product images to validate positions
      const existingImages = await this.webProductImageRepository.find({
        where: {
          product_id: product.num,
          sku: product.sku,
          status: 1,
        },
        order: { position: 'ASC' },
      });

      if (existingImages.length === 0) {
        throw new HttpException(
          {
            success: false,
            message: `Product ${sku} has no images to reorder`,
            error: 'NOT_FOUND',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // Validate that all current positions exist
      const existingPositions = existingImages.map((img) => img.position);

      for (const change of positionChanges) {
        if (!existingPositions.includes(change.currentPosition)) {
          throw new HttpException(
            {
              success: false,
              message: `Position ${change.currentPosition} does not exist for product ${sku}`,
              error: 'BAD_REQUEST',
            },
            HttpStatus.BAD_REQUEST,
          );
        }

        // Validate new positions are within range
        if (
          change.newPosition < 1 ||
          change.newPosition > existingImages.length
        ) {
          throw new HttpException(
            {
              success: false,
              message: `New position ${change.newPosition} is out of range (1-${existingImages.length})`,
              error: 'BAD_REQUEST',
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Track reordered images for response
      const reorderedPositions: {
        imageId: number;
        oldPosition: number;
        newPosition: number;
      }[] = [];

      // Calculate position changes to avoid conflicts
      // Use temporary positions (starting at 1000) to avoid conflicts during reordering
      const TEMP_POSITION_START = 1000;

      // First, move all affected images to temporary positions
      for (let i = 0; i < positionChanges.length; i++) {
        const change = positionChanges[i];
        const tempPosition = TEMP_POSITION_START + i;

        // Find the image to reorder
        const imageToUpdate = existingImages.find(
          (img) => img.position === change.currentPosition,
        );

        if (imageToUpdate) {
          // Store original position for response
          const oldPosition = imageToUpdate.position;

          // Move to temporary position first
          imageToUpdate.position = tempPosition;
          await this.webProductImageRepository.save(imageToUpdate);

          // Track for final move
          reorderedPositions.push({
            imageId: imageToUpdate.id,
            oldPosition,
            newPosition: change.newPosition,
          });
        }
      }

      // Then move all images to their final positions
      for (const reorder of reorderedPositions) {
        const imageToUpdate = await this.webProductImageRepository.findOne({
          where: { id: reorder.imageId },
        });

        if (imageToUpdate) {
          imageToUpdate.position = reorder.newPosition;
          await this.webProductImageRepository.save(imageToUpdate);
          this.logger.log(
            `Moved image ID ${imageToUpdate.id} from position ${reorder.oldPosition} to ${reorder.newPosition}`,
          );
        }
      }

      // Check if the main image position (1) has changed, update the product's images_url if needed
      const newMainImage = await this.webProductImageRepository.findOne({
        where: {
          product_id: product.num,
          sku: product.sku,
          position: 1,
          status: 1,
        },
      });

      if (
        newMainImage &&
        (!product.images_url ||
          product.images_url !== newMainImage.src_cloudflare)
      ) {
        product.images_url = newMainImage.src_cloudflare;
        await this.webProductRepository.save(product);
        this.logger.log(
          `Updated main image reference for product ${sku} to image ID ${newMainImage.id}`,
        );
      }

      // Reindex all positions to ensure consistency
      const allImages = await this.webProductImageRepository.find({
        where: {
          product_id: product.num,
          sku: product.sku,
          status: 1,
        },
        order: { position: 'ASC' },
      });

      // Fix any gaps in positions
      let currentPosition = 1;
      for (const img of allImages) {
        if (img.position !== currentPosition) {
          img.position = currentPosition;
          await this.webProductImageRepository.save(img);
        }
        currentPosition++;
      }

      // Update product in Instaleap with reordered images
      try {
        await this.externalApiService.updateProductInstaleap(product.sku, {
          photosUrl: allImages.map((img) => `${img.src_cloudflare}/base`),
        });

        this.logger.log(
          `Product ${product.sku} updated in Instaleap after image reordering by ${username}`,
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
        message: `Successfully reordered ${reorderedPositions.length} image positions`,
        reorderedPositions,
      };
    } catch (error) {
      // Rollback the transaction in case of error
      await queryRunner.rollbackTransaction();

      this.logger.error(
        `Error reordering images for SKU ${sku}: ${error.message}`,
        error.stack,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: `Failed to reorder images: ${error.message}`,
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
   * Process and upload a single image
   * @param file The image file to upload
   * @param sku Product SKU
   * @param position Image position
   * @param batchToken Batch token for Cloudflare upload
   * @param username Username performing the upload
   * @returns Result of the upload operation
   */
  async processAndUploadImage(
    file: Express.Multer.File,
    sku: string,
    position: number,
    username: string,
  ): Promise<{
    success: boolean;
    imageId?: number;
    url?: string;
  }> {
    try {
      // Find the product
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

      // Check if an image already exists at this position
      const existingImage = await this.webProductImageRepository.findOne({
        where: {
          product_id: product.num,
          sku: product.sku,
          position,
        },
      });

      if (existingImage) {
        // Delete existing image from Cloudflare if it has an ID
        if (existingImage.id_cloudflare) {
          try {
            await this.externalApiService.deleteImage(
              existingImage.id_cloudflare,
            );
            this.logger.log(
              `Deleted existing image from Cloudflare: ${existingImage.id_cloudflare}`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to delete image from Cloudflare: ${error.message}`,
              error.stack,
            );
            // Continue with the upload even if Cloudflare deletion fails
          }
        }

        // Remove the existing image from the database
        await this.webProductImageRepository.remove(existingImage);
      }

      // Upload image to Cloudflare
      const cloudflareResponse =
        await this.externalApiService.uploadImageFromFile(
          file,
          this.envService.cloudflareApiToken,
          { product_id: product.num, sku: product.sku, position },
        );

      if (!cloudflareResponse.success) {
        throw new HttpException(
          {
            success: false,
            message: 'Failed to upload image to Cloudflare',
            error: 'UPLOAD_ERROR',
          },
          HttpStatus.BAD_GATEWAY,
        );
      }

      const imageUrl = `${cloudflareResponse.result.variants[0]}`;

      // Create a new product image entity
      const newImage = this.webProductImageRepository.create({
        product_id: product.num,
        sku: product.sku,
        src_cloudflare: imageUrl,
        id_cloudflare: cloudflareResponse.result.id,
        width: 1800,
        height: 1800,
        status: 1,
        position,
      });

      // Save the new image
      const savedImage = await this.webProductImageRepository.save(newImage);

      // If this is the main image (position 1), update the product's images_url
      if (position === 1) {
        product.images_url = imageUrl;
        await this.webProductRepository.save(product);
      }

      this.logger.log(
        `Image for product ${sku} uploaded successfully by ${username}, position: ${position}, ID: ${savedImage.id}`,
      );

      // Get all product images after this update
      const allImages = await this.webProductImageRepository.find({
        where: {
          product_id: product.num,
          sku: product.sku,
          status: 1,
        },
      });

      // Update product in Instaleap with new images
      try {
        await this.externalApiService.updateProductInstaleap(product.sku, {
          photosUrl: allImages.map((img) => `${img.src_cloudflare}/base`),
        });

        this.logger.log(
          `Product ${product.sku} updated in Instaleap with new images by ${username}`,
        );
      } catch (instaleapError) {
        this.logger.error(
          `Failed to update product ${product.sku} in Instaleap: ${instaleapError.message}`,
          instaleapError.stack,
        );
        // Continue with the process even if Instaleap update fails
      }

      return {
        success: true,
        imageId: savedImage.id,
        url: imageUrl,
      };
    } catch (error) {
      this.logger.error(
        `Error processing and uploading image for SKU ${sku} at position ${position}: ${error.message}`,
        error.stack,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: `Failed to process and upload image: ${error.message}`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
