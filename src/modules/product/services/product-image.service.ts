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
      const uploadPromises = [];

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
        uploadPromises.push(
          this.processProductImages(
            product,
            productFiles,
            username,
            results,
            batchStats,
          ),
        );
      }

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);

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
  ): Promise<void> {
    const existingImages = product.images || [];
    let nextPosition =
      existingImages.length > 0
        ? Math.max(...existingImages.map((img) => img.position || 0)) + 1
        : 1;

    // Process each file for this product
    const uploadPromises = files.map(async (file) => {
      try {
        // Create new image entity
        const newImage = new WebProductImage();
        newImage.product_id = product.num;
        newImage.sku = product.sku;
        newImage.position = nextPosition++;
        newImage.alt = product.sku;
        newImage.width = 1800;
        newImage.height = 1800;
        newImage.status = 1; // Active status

        // Upload image to Cloudflare
        const cloudflareToken = this.envService.cloudflare;
        const uploadResult =
          await this.externalApiService.uploadBatchImageFromFile(
            file,
            cloudflareToken,
            { productId: product.num, sku: product.sku },
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
          url: `${newImage.src_cloudflare}/${this.envService.urlCloudflareSuffix}`,
        });

        batchStats.processed++;
        batchStats.successful++;

        return { success: true, image: newImage };
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

        return { success: false };
      }
    });

    // Wait for all uploads to complete
    const uploadResults = await Promise.all(uploadPromises);

    // Update product in Instaleap if we uploaded at least one image and there were no existing images
    const successfulUploads = uploadResults.filter((result) => result.success);

    if (successfulUploads.length > 0 && existingImages.length === 0) {
      try {
        // Get the first successful image to use for Instaleap
        const firstImage = successfulUploads[0].image;

        await this.externalApiService.updateProductInstaleap(product.sku, {
          name: product.title,
          photosUrl: [
            `${firstImage.src_cloudflare}/${this.envService.urlCloudflareSuffix}`,
          ],
          description: product.description_instaleap,
          bigItems: 0,
        });

        this.logger.log(
          `Product ${product.sku} updated with new image in Instaleap by ${username}`,
        );
      } catch (instaleapError) {
        this.logger.error(
          `Failed to update product ${product.sku} in Instaleap: ${instaleapError.message}`,
          instaleapError.stack,
        );
        // Continue with the process even if Instaleap update fails
      }
    }
  }
}
