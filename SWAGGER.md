# Swagger Documentation

This project uses Swagger for API documentation. The Swagger UI provides an interactive interface to explore and test the API endpoints.

## Environment Variables

The following environment variables are required for Swagger documentation:

- `APP_DOCUMENTATION_TITLE`: The title of the API documentation
- `APP_DOCUMENTATION_DESCRIPTION`: A description of the API
- `VERSION`: The version of the API (following semantic versioning)
- `SWAGGER_DOCUMENT_URL`: The URL path for the Swagger documentation
- `ENVIRONMENT`: The environment (development, staging, production)
- `PORT`: The port number for the server

## Accessing Swagger Documentation

The Swagger documentation is available at the URL specified by the `SWAGGER_DOCUMENT_URL` environment variable. By default, it is accessible at `/api/v1`.

## Features

- **Interactive UI**: Test API endpoints directly from the browser
- **Authentication**: Bearer token authentication is supported
- **Response Models**: Standardized response models for consistency
- **Environment-specific Servers**: Different server URLs based on the environment
- **API Categorization**: Endpoints are categorized by tags for better organization

## Best Practices for API Documentation

1. **Use Descriptive Tags**: Group related endpoints under meaningful tags
2. **Provide Examples**: Include example values for request parameters and responses
3. **Document Response Schemas**: Define response schemas for all endpoints
4. **Include Error Responses**: Document possible error responses and their meanings
5. **Use Consistent Naming**: Follow consistent naming conventions for endpoints and parameters

## Example Usage

```typescript
// Controller with Swagger decorators
@ApiTags('users')
@Controller('users')
export class UsersController {
  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: BaseResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
  })
  create(@Body() createUserDto: CreateUserDto): BaseResponse<User> {
    // Implementation
  }
}
```

## Extending Swagger Documentation

To add new endpoints to the Swagger documentation, use the `@ApiTags`, `@ApiOperation`, and `@ApiResponse` decorators from the `@nestjs/swagger` package.

For DTOs, use the `@ApiProperty` decorator to document properties.
