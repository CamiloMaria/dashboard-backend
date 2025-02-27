import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { EnvService } from '../../../config/env/env.service';
import { UserPayloadDto } from '../dto/auth-response.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private envService: EnvService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: envService.jwtSecret,
    });
  }

  async validate(payload: UserPayloadDto) {
    return {
      userId: payload.sub,
      username: payload.username,
      email: payload.email,
      allowedPages: payload.allowedPages,
    };
  }
}
