import { ApiProperty } from '@nestjs/swagger';

export class UserPayloadDto {
  @ApiProperty({
    description: 'Username',
    example: 'jdoe',
  })
  username: string;

  @ApiProperty({
    description: 'User ID',
    example: '12345',
  })
  sub: string;

  @ApiProperty({
    description: 'User email',
    example: 'jdoe@plazalama.com',
  })
  email: string;

  @ApiProperty({
    description: 'List of pages the user has access to',
    example: ['dashboard', 'settings', 'products'],
    type: [String],
  })
  allowedPages: string[];
}

export class UserLoginResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'User information and permissions',
    type: () => UserPayloadDto,
  })
  user: UserPayloadDto;
}

export class UserDetailsDto {
  @ApiProperty({
    description: 'User ID',
    example: '12345',
  })
  id: string;

  @ApiProperty({
    description: 'Full name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'Email address',
    example: 'jdoe@plazalama.com',
  })
  email: string;

  @ApiProperty({
    description: 'Avatar image URL',
    example: 'assets/images/avatars/user-128.png',
  })
  avatar: string;

  @ApiProperty({
    description: 'User status',
    example: 'online',
    enum: ['online', 'offline'],
  })
  status: string;

  @ApiProperty({
    description: 'Username',
    example: 'jdoe',
  })
  username: string;
}
