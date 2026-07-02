import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import appConfig from '../../../config/app.config';
import { MemberStatus, PrismaClient } from '@prisma/client';

import { Request } from 'express';


const prisma = new PrismaClient();

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // ignoreExpiration: false,
      ignoreExpiration: true,
      secretOrKey: appConfig().jwt.secret,
      passReqToCallback: true, // <-- Add this line
    });
  }


  async validate(request: Request, payload: any, ) {
    // console.log('payload => ', payload);
    // console.log('req.ip => ', request); // Example usage

    // check user is exist or not in database
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });
    
    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.deleted_at) {
      throw new UnauthorizedException('Account deleted');
    }

    if (user.member_status === MemberStatus.Suspend) {
      throw new UnauthorizedException('Account suspended');
    }

    if (user.member_status === MemberStatus.Ban) {
      throw new UnauthorizedException('Account banned');
    }

    
    // Extract token from Authorization header
    const authHeader = request.headers['authorization'];
    // console.log('authHeader => ', authHeader);

    // console.log('authHeader => ', authHeader);
    const token = authHeader?.split(' ')[1] || authHeader?.split(' ')[0];

    if(!token){
      throw new UnauthorizedException();
    }

    // verify token in sessions table
    const session = await prisma.session.findFirst({
      where: { access_token: token, user_id: payload.sub },
    });


    // console.log('session => ', session);
    if (!session) {
      throw new UnauthorizedException();
    }
    return { userId: payload.sub, email: payload.email };
  }
}

