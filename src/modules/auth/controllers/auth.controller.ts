import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UseGuards,
  Get,
  Request,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';

import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { UserLoginResponseDto } from '../dto/auth-response.dto';
import { BaseResponse } from '../../../config/swagger/response.schema';
import { JwtAuthGuard, RolesGuard, RequirePages } from '../../../common/guards';
import { Public } from '../../../common/decorators';
import { ResponseService } from '../../../common/services/response.service';
import { RequestWithUser } from '../../../common/interfaces/request.interface';

/**
 * Controller for authentication-related endpoints
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly responseService: ResponseService,
  ) {}

  /**
   * A protected endpoint that requires authentication and specific page permissions
   * @returns User profile information
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePages('/')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Returns the authenticated user profile information',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          username: 'jdoe',
          userId: '12345',
          email: 'jdoe@plazalama.com',
          allowedPages: ['dashboard', 'settings', 'products'],
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
    type: BaseResponse,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - User does not have required permissions',
    type: BaseResponse,
  })
  getProfile(@Request() req: RequestWithUser) {
    try {
      // The user is automatically injected into the request by the JwtAuthGuard
      // and is available as req.user
      return this.responseService.success(
        req.user,
        'Profile retrieved successfully',
      );
    } catch (error) {
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to retrieve profile',
        error: error.message,
      });
    }
  }

  /**
   * Authenticate a user and return a JWT token
   * @param loginDto User credentials
   * @returns JWT token and user information including permissions
   */
  @Post('sign-in')
  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @ApiOperation({
    summary: 'User authentication',
    description:
      'Authenticate with username and password to receive a JWT token and user details with permissions',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User credentials',
    examples: {
      validExample: {
        summary: 'Valid credentials example',
        value: {
          username: 'jdoe',
          password: 'securePassword123',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
    type: UserLoginResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Authentication successful',
        data: {
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: {
            username: 'jdoe',
            sub: '12345',
            email: 'jdoe@plazalama.com',
            allowedPages: ['dashboard', 'settings', 'products'],
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
    type: BaseResponse,
    schema: {
      example: {
        success: false,
        message: 'Invalid credentials',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Too many login attempts',
    type: BaseResponse,
    schema: {
      example: {
        success: false,
        message: 'Too many requests',
        error: 'ThrottlerException: Too Many Requests',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    type: BaseResponse,
    schema: {
      example: {
        success: false,
        message: 'An error occurred during login. Please try again later.',
        error: 'Internal Server Error',
      },
    },
  })
  async login(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
      }),
    )
    loginDto: LoginDto,
  ): Promise<UserLoginResponseDto> {
    const result = await this.authService.login(loginDto);
    return result;
  }

  @ApiOperation({ summary: 'Check health of the authentication service' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Authentication service is healthy',
    type: BaseResponse,
    schema: {
      example: {
        success: true,
        message: 'Authentication service is healthy',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    type: BaseResponse,
    schema: {
      example: {
        success: false,
        message:
          'An error occurred while checking the health of the authentication service. Please try again later.',
        error: 'Internal Server Error',
      },
    },
  })
  @Get('health')
  @Public()
  async checkHealth(): Promise<BaseResponse<any>> {
    try {
      // Perform any necessary health checks here
      return {
        success: true,
        message: 'Authentication service is healthy',
      };
    } catch {
      throw new InternalServerErrorException(
        'An error occurred while checking the health of the authentication service. Please try again later.',
      );
    }
  }
}
