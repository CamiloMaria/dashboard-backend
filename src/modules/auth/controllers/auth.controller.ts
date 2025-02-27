import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { UserLoginResponseDto } from '../dto/auth-response.dto';
import { BaseResponse } from '../../../config/swagger/response.schema';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User authentication' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
    type: () => UserLoginResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
    type: () => BaseResponse<null>,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    type: () => BaseResponse<null>,
  })
  async login(@Body() loginDto: LoginDto): Promise<UserLoginResponseDto> {
    return this.authService.login(loginDto);
  }
}
