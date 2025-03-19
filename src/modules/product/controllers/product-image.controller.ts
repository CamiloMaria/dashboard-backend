import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
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
} from '@nestjs/common';
import { ProductImageService } from '../services/product-image.service';
import { BaseResponse } from 'src/config/swagger/response.schema';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ResponseService } from 'src/common/services/response.service';
import { RequestWithUser } from 'src/common/interfaces/request.interface';
import { Public } from 'src/common/decorators';

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
}
