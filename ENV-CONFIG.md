# Environment Configuration

This project uses a structured approach to manage environment variables, ensuring type safety, validation, and clear documentation.

## Structure

The environment configuration is organized as follows:

```
src/
  config/
    env/
      env.module.ts      // Configuration module with Joi validation
      env.service.ts     // Type-safe access to environment variables
      env.validation.ts  // Joi validation schema
      env.constants.ts   // ConfigKeys enum for type-safe access
      index.ts           // Exports
```

## Features

### 1. Environment Variables Documentation

The `.env.example` file in the root directory documents all required environment variables with placeholders. This file should be committed to the repository, while the actual `.env` file with real values should be gitignored.

### 2. Validation with Joi

Environment variables are validated at application startup using Joi. If required variables are missing or invalid, the application will fail to start with a clear error message.

### 3. Type-Safe Access

The `EnvService` provides typed accessors for all environment variables, ensuring type safety throughout the application.

### 4. ConfigKeys Enum

The `ConfigKeys` enum provides a single source of truth for all environment variable names, preventing typos and enabling IDE autocompletion.

### 5. Helper Methods

The `EnvService` includes helper methods for common tasks, such as getting database configuration objects.

## Usage

### 1. Accessing Environment Variables

Inject the `EnvService` into your service or controller:

```typescript
import { Injectable } from '@nestjs/common';
import { EnvService } from './config/env';

@Injectable()
export class AppService {
  constructor(private envService: EnvService) {}

  someMethod() {
    // Type-safe access to environment variables
    const port = this.envService.port;
    const apiSecret = this.envService.apiSecret;

    // Helper methods
    const dbConfig = this.envService.getShopDatabaseConfig();
  }
}
```

### 2. Direct Access via ConfigService with ConfigKeys

If you need to access environment variables directly through ConfigService:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigKeys } from './config/env';

@Injectable()
export class SomeService {
  constructor(private configService: ConfigService) {}

  someMethod() {
    // Type-safe access using ConfigKeys enum
    const port = this.configService.get<number>(ConfigKeys.PORT);
    const apiSecret = this.configService.get<string>(ConfigKeys.API_SECRET);
  }
}
```

### 3. Adding New Environment Variables

1. Add the variable to `.env.example` with a placeholder value
2. Add the variable to `ConfigKeys` enum in `env.constants.ts`
3. Add the variable to `env.validation.ts` with appropriate Joi validation
4. Add a getter to `EnvService` for type-safe access

## Benefits

- **Documentation**: Clear documentation of all required environment variables
- **Validation**: Early validation to prevent runtime errors
- **Type Safety**: Type-safe access to environment variables
- **Centralization**: Single source of truth for environment configuration
- **Maintainability**: Easy to add or modify environment variables

## Best Practices

1. Always add new environment variables to `.env.example`, `ConfigKeys`, and `env.validation.ts`
2. Use descriptive names for environment variables
3. Group related variables together
4. Use appropriate validation for each variable
5. Provide default values where appropriate
6. Use the `EnvService` instead of `process.env` directly
7. When directly accessing ConfigService, always use ConfigKeys enum
8. Provide helper methods for related configuration groups
