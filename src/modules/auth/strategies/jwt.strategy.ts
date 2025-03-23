import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { EnvService } from '../../../config/env/env.service';
import { UserPayloadDto } from '../dto/auth-response.dto';
import { createJwtExtractor } from '../utils/token-extractor.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private envService: EnvService) {
    super({
      jwtFromRequest: createJwtExtractor(envService),
      ignoreExpiration: false,
      secretOrKey: envService.jwtSecret,
    });
  }

  async validate(payload: UserPayloadDto) {
    // Skip refresh tokens when validating for API access
    if (payload['tokenType'] === 'refresh') {
      return false;
    }

    return {
      userId: payload.sub,
      username: payload.username,
      email: payload.email,
      allowedPages: payload.allowedPages,
    };
  }
}
