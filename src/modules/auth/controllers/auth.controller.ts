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
  Res,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiCookieAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';

import { AuthService } from '../services/auth.service';
import { LoginDto, UpdateUserPermissionsDto, UserPaginationDto } from '../dto';
import { UserLoginResponseDto } from '../dto';
import {
  BaseResponse,
  PaginatedResponse,
} from '../../../common/schemas/response.schema';
import { JwtAuthGuard, RolesGuard, RequirePages } from '../../../common/guards';
import { Public } from '../../../common/decorators';
import { ResponseService } from '../../../common/services/response.service';
import { RequestWithUser } from '../../../common/interfaces/request.interface';
import { UserService } from '../services/user.service';
import { PermissionsService } from '../services/permissions.service';
import { UserLogPaginationDto } from '../dto/user-log.dto';

/**
 * Controller for authentication-related endpoints
 */
@ApiCookieAuth()
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly permissionsService: PermissionsService,
    private readonly responseService: ResponseService,
  ) {}

  @Get('health')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  health() {
    return;
  }

  /**
   * A protected endpoint that requires authentication and specific page permissions
   * @returns User profile information
   */
  @Get('user/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePages('/')
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
        { user: req.user },
        'Profile retrieved successfully',
        {
          statusCode: HttpStatus.OK,
          timestamp: new Date().toISOString(),
        },
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
   * @param res Express response object to set cookies
   * @returns JWT token and user information including permissions
   */
  @Post('sign-in')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User authentication',
    description:
      'Authenticate with username and password to receive a JWT token and user details with permissions. The token is also set as an HTTP-only cookie.',
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
    @Res({ passthrough: true }) res: Response,
  ): Promise<BaseResponse<UserLoginResponseDto>> {
    const result = await this.authService.login(loginDto);
    // Set the access token cookie
    if (result.access_cookie) {
      const { name, ...options } = result.access_cookie;

      res.cookie(name, result.access_token, options);
    }

    // Set the refresh token cookie if available
    if (result.refresh_cookie && result.refresh_token) {
      const { name, ...options } = result.refresh_cookie;

      res.cookie(name, result.refresh_token, options);
    }

    // Always remove tokens from response in all environments
    // Tokens are now only sent in cookies
    const sanitizedResult = { ...result };
    delete sanitizedResult.access_token;
    delete sanitizedResult.refresh_token;
    delete sanitizedResult.access_cookie;
    delete sanitizedResult.refresh_cookie;

    return this.responseService.success(sanitizedResult, 'Login successful', {
      statusCode: HttpStatus.OK,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Refresh the access token using a refresh token from cookies
   * @param req The request containing the refresh token cookie
   * @param res The response to set the new access token cookie
   */
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Use a refresh token to get a new access token',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token refreshed successfully',
    schema: {
      example: {
        success: true,
        message: 'Token refreshed successfully',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid refresh token',
    type: BaseResponse,
  })
  async refreshToken(
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<BaseResponse<null>> {
    try {
      // Extract refresh token from cookies
      const refreshTokenName = `refresh_${this.authService['envService'].cookieName}`;
      const refreshToken = req.cookies[refreshTokenName];

      if (!refreshToken) {
        throw new InternalServerErrorException('Refresh token not found');
      }

      // Generate a new access token
      const { token, cookieOptions } =
        await this.authService.refreshAccessToken(refreshToken);

      // Set the new access token cookie
      const { name, ...options } = cookieOptions;
      res.cookie(name, token, options);

      return this.responseService.success(
        null,
        'Token refreshed successfully',
        {
          statusCode: HttpStatus.OK,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to refresh token',
        error: error.message,
      });
    }
  }

  /**
   * Logout a user by clearing authentication cookies
   * @param res The response to clear cookies
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout user',
    description: 'Clears authentication cookies to log out the user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logged out successfully',
    schema: {
      example: {
        success: true,
        message: 'Logged out successfully',
        data: null,
      },
    },
  })
  async logout(
    @Res({ passthrough: true }) res: Response,
  ): Promise<BaseResponse<null>> {
    // Get cookie options configured to expire the cookies
    const { accessCookie, refreshCookie } = this.authService.logout();

    // Clear the access token cookie
    const { name: accessName, ...accessOptions } = accessCookie;
    res.cookie(accessName, '', accessOptions);

    // Clear the refresh token cookie
    const { name: refreshName, ...refreshOptions } = refreshCookie;
    res.cookie(refreshName, '', refreshOptions);

    return this.responseService.success(null, 'Logged out successfully', {
      statusCode: HttpStatus.OK,
      timestamp: new Date().toISOString(),
    });
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePages('/permissions')
  @ApiOperation({
    summary: 'Get all users with pagination',
    description: 'Returns a paginated list of all users with their permissions',
  })
  @ApiQuery({ type: UserPaginationDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users retrieved successfully',
    type: PaginatedResponse,
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
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    type: BaseResponse,
  })
  async getUsersWithPagination(@Query() paginationDto: UserPaginationDto) {
    try {
      const { items, meta } = await this.userService.getAllUsers(paginationDto);

      return this.responseService.paginate(
        items,
        meta.totalItems,
        meta.currentPage,
        meta.itemsPerPage,
        'Users retrieved successfully',
        {
          statusCode: HttpStatus.OK,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to retrieve users',
        error: error.message,
      });
    }
  }

  @Post('user/permissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePages('/permissions')
  @ApiOperation({
    summary: 'Update user permissions',
    description: 'Updates the permissions for a user',
  })
  @ApiBody({ type: UpdateUserPermissionsDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permissions updated successfully',
  })
  async updateUserPermissions(
    @Body() updateUserPermissionsDto: UpdateUserPermissionsDto,
  ) {
    try {
      const updatedUser = await this.permissionsService.updateUserAllowedPages(
        updateUserPermissionsDto,
      );
      return this.responseService.success(
        updatedUser,
        'Permissions updated successfully',
        {
          statusCode: HttpStatus.OK,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to update user permissions',
        error: error.message,
      });
    }
  }

  // user/logs
  @Get('user/logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePages('/logs')
  @ApiOperation({
    summary: 'Get user logs',
    description: 'Returns a paginated list of user logs',
  })
  async getUserLogs(@Query() paginationDto: UserLogPaginationDto) {
    try {
      const { items, meta } = await this.userService.getUserLogs(paginationDto);

      return this.responseService.paginate(
        items,
        meta.totalItems,
        meta.currentPage,
        meta.itemsPerPage,
        'User logs retrieved successfully',
        {
          statusCode: HttpStatus.OK,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error) {
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to retrieve user logs',
        error: error.message,
      });
    }
  }
}
