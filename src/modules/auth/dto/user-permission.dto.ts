import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray } from 'class-validator';

export class UpdateUserPermissionsDto {
  @ApiProperty({
    description: 'The username of the user to update',
    example: 'admin',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: 'The allowed pages for the user',
    example: ['/products', '/orders'],
  })
  @IsArray()
  @IsNotEmpty()
  allowedPages: string[];
}
