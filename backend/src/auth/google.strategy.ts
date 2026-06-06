import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { UsersService } from '../users/users.service';

// стратегия для входа через гугл аккаунт
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private usersService: UsersService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    console.log('[GOOGLE] login attempt, profile id:', profile.id);
    const email = profile.emails?.[0]?.value;
    const googleId = profile.id;

    let name = profile.displayName;
    if (!name) {
      const firstName = profile.name?.givenName ?? '';
      const lastName = profile.name?.familyName ?? '';
      name = (firstName + ' ' + lastName).trim();
    }
    const user = await this.usersService.findOrCreateGoogleUser({
      googleId: googleId,
      email: email,
      name: name,
    });

    done(null, user);
  }
}
