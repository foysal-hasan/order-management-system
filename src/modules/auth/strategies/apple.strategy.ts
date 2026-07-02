import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-apple';
import { Injectable } from '@nestjs/common';
import appConfig from '../../../config/app.config';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor() {
    super({
      clientID: appConfig().auth.apple.client_id,
      teamID: appConfig().auth.apple.team_id,
      keyID: appConfig().auth.apple.key_id,
      privateKeyLocation: appConfig().auth.apple.private_key_path,
      callbackURL: appConfig().auth.apple.callback,
      scope: ['email', 'name'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    idToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { sub: appleId, email, name } = profile._json;

      const user = {
        appleId,
        email: email || null,
        firstName: name?.firstName || '',
        lastName: name?.lastName || '',
        accessToken,
        refreshToken,
        idToken,
      };

      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}
