import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Data transfer object for print order request
 */
export class PrintOrderDto {
  @ApiProperty({
    description: 'Order number to print',
    example: 'ORD-123456',
  })
  @IsNotEmpty({ message: 'Order number is required' })
  @IsString({ message: 'Order number must be a string' })
  orderNumber: string;

  @ApiProperty({
    description: 'Spooler name for printing',
    example: 'PrinterXYZ',
  })
  @IsNotEmpty({ message: 'Spooler is required' })
  @IsString({ message: 'Spooler must be a string' })
  spooler: string;
}
