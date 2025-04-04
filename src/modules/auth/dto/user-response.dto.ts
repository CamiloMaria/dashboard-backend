import { ApiProperty } from '@nestjs/swagger';

/**
 * Data transfer object for user response
 */
export class UserResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '12345',
  })
  userId: string;

  @ApiProperty({
    description: 'Username',
    example: 'jdoe',
  })
  username: string;

  @ApiProperty({
    description: 'User code',
    example: 1001,
  })
  codigo: number;

  @ApiProperty({
    description: 'User email',
    example: 'jdoe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'List of allowed pages/permissions',
    example: ['dashboard', 'users:view', 'orders:print'],
    type: [String],
  })
  allowedPages: string[];
}
