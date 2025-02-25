import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ExampleDto } from './dtos/example.dto';
import { BaseResponse } from './config/swagger';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get hello message' })
  @ApiResponse({
    status: 200,
    description: 'Returns a hello message',
    type: BaseResponse,
  })
  getHello(): BaseResponse<string> {
    const message = this.appService.getHello();
    return {
      success: true,
      message: 'Hello message retrieved successfully',
      data: message,
    };
  }

  @Post('example')
  @ApiOperation({ summary: 'Example endpoint' })
  @ApiResponse({
    status: 201,
    description: 'Example created successfully',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
  })
  createExample(@Body() exampleDto: ExampleDto): BaseResponse<ExampleDto> {
    return {
      success: true,
      message: 'Example created successfully',
      data: exampleDto,
    };
  }
}
