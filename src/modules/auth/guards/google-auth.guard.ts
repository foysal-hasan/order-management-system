import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
 
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  handleRequest(err: any, user: any, info: any, context: any) {
    const request = context.switchToHttp().getRequest();
 
    // 1️⃣ Detect when user cancels login
    if (request.query.error === 'access_denied') {
      // Throw a custom object so controller can handle it
      return { cancelled: true };
    }
 
    // 2️⃣ If Passport threw error, stop
    if (err || !user) {
      throw err || new Error('Google login failed');
    }
 
    return user;
  }
}