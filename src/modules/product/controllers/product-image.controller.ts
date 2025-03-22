import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import {
  Controller,
  HttpException,
  HttpStatus,
  Post,
  UploadedFiles,
  UseInterceptors,
  Request,
  HttpCode,
  Get,
  Put,
  UploadedFile,
  Body,
  Delete,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ProductImageService } from '../services/product-image.service';
import { BaseResponse } from 'src/common/schemas/response.schema';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ResponseService } from 'src/common/services/response.service';
import { RequestWithUser } from 'src/common/interfaces/request.interface';
import { Public } from 'src/common/decorators';
import { ImageDeleteBatchDto, ImageUpdateDto } from '../dto';

@ApiTags('Products Images')
@ApiBearerAuth()
@Controller('product-images')
export class ProductImageController {
  constructor(
    private readonly productImageService: ProductImageService,
    private readonly responseService: ResponseService,
  ) {}

  @Get('health')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  health() {
    return;
  }

  @Post()
  @ApiOperation({
    summary: 'Upload product images',
    description:
      'Upload one or more product images. Filenames should contain product SKUs.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Images uploaded successfully',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'No images provided or invalid request',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: BaseResponse,
  })
  @UseInterceptors(FilesInterceptor('images'))
  async uploadImage(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Request() req: RequestWithUser,
  ) {
    try {
      // Validate that files exist
      if (!files || files.length === 0) {
        throw new HttpException(
          {
            success: false,
            message: 'No images provided',
            error: 'BAD_REQUEST',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Get the authenticated user from the request
      const username = req.user?.username || 'system';

      // Pass files to service layer for processing
      const results = await this.productImageService.uploadImages(
        files,
        username,
      );

      return this.responseService.success(
        results,
        'Images uploaded successfully',
        {
          statusCode: HttpStatus.CREATED,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to upload images',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put()
  @ApiOperation({
    summary: 'Update a product image at a specific position',
    description:
      'Update a product image at a specific position. If an image already exists at that position, it will be replaced. If position is 1, it will also be set as the main product image.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file to upload',
        },
        sku: {
          type: 'string',
          description: 'Product SKU',
          example: '1234567890123',
        },
        position: {
          type: 'number',
          description: 'Position of the image (1 for main image)',
          example: 1,
        },
      },
      required: ['image', 'sku', 'position'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Image updated successfully',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/BaseResponse' },
        {
          properties: {
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                imageId: { type: 'number' },
                position: { type: 'number' },
                url: { type: 'string' },
              },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'No image provided or invalid request',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: BaseResponse,
  })
  @UseInterceptors(FileInterceptor('image'))
  async updateImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() updateDto: ImageUpdateDto,
    @Request() req: RequestWithUser,
  ) {
    try {
      // Validate that file exists
      if (!file) {
        throw new HttpException(
          {
            success: false,
            message: 'No image provided',
            error: 'BAD_REQUEST',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Get the authenticated user from the request
      const username = req.user?.username || 'system';

      // Extract SKU and position from DTO
      const { sku, position } = updateDto;

      // Call service to update the image
      const result = await this.productImageService.updateProductImage(
        file,
        sku,
        position,
        username,
      );

      return this.responseService.success(
        result,
        'Image updated successfully',
        {
          statusCode: HttpStatus.OK,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update image',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':sku/:position')
  @ApiOperation({
    summary: 'Delete a product image at a specific position',
    description:
      'Delete a product image at a specific position using URL parameters. If position is 1, the next available image will be set as the main product image.',
  })
  @ApiParam({
    name: 'sku',
    description: 'Product SKU',
    type: String,
    example: '1234567890123',
  })
  @ApiParam({
    name: 'position',
    description: 'Position of the image to delete',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Image deleted successfully',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/BaseResponse' },
        {
          properties: {
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
              },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Product or image not found',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: BaseResponse,
  })
  async deleteImage(
    @Param('sku') sku: string,
    @Param('position', ParseIntPipe) position: number,
    @Request() req: RequestWithUser,
  ) {
    try {
      // Get the authenticated user from the request
      const username = req.user?.username || 'system';

      // Call service to delete the image
      const result = await this.productImageService.deleteProductImage(
        sku,
        position,
        username,
      );

      return this.responseService.success(
        result,
        'Image deleted successfully',
        {
          statusCode: HttpStatus.OK,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to delete image',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete()
  @ApiOperation({
    summary: 'Delete multiple product images',
    description:
      'Delete multiple product images by position. Provide SKU and an array of positions. If position 1 is deleted, the next available image will be set as the main product image.',
  })
  @ApiBody({
    schema: {
      oneOf: [{ $ref: '#/components/schemas/ImageDeleteBatchDto' }],
    },
    description: 'Provide SKU and an array of positions',
  })
  @ApiResponse({
    status: 200,
    description: 'Images deleted successfully',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/BaseResponse' },
        {
          properties: {
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                deletedCount: {
                  type: 'number',
                  description: 'Number of images deleted',
                },
                failedPositions: {
                  type: 'array',
                  items: { type: 'number' },
                  description: 'List of positions that could not be deleted',
                },
              },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Product or image not found',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: BaseResponse,
  })
  async deleteImageBatch(
    @Body() deleteDto: ImageDeleteBatchDto,
    @Request() req: RequestWithUser,
  ) {
    try {
      // Get the authenticated user from the request
      const username = req.user?.username || 'system';

      const { sku, positions } = deleteDto;
      const result = await this.productImageService.deleteProductImages(
        sku,
        positions,
        username,
      );

      return this.responseService.success(
        result,
        'Images deleted successfully',
        {
          statusCode: HttpStatus.OK,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to delete image(s)',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
