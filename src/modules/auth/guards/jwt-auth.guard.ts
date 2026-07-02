import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { PrismaClient } from '@prisma/client';
import { PUBLIC_KEY } from 'src/common/guard/public';

const prisma = new PrismaClient();

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  
  canActivate(context: ExecutionContext) {
     // Add your custom authentication logic here
    // for example, call super.logIn(request) to establish a session.
    // const reflector = new Reflector();
    //  const isPublic = reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
    //   context.getHandler(),
    //   context.getClass(),
    // ]);

    // if (isPublic) {
    //   // If route is public, bypass authentication
    //   return true;
    // }
    return super.canActivate(context);
  }

  handleRequest(err, user, info,  context: ExecutionContext) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      throw err || new UnauthorizedException();
    }

    // const request = context.switchToHttp().getRequest();
    // const authHeader = request.headers['authorization'];

    // console.log('authHeader => ', authHeader);
    // const token = authHeader.split(' ')[1] || authHeader.split(' ')[0];

    // if(!token){
    //   throw new UnauthorizedException('Token not found');
    // }

    // verify token in sessions table
    // this.validateToken(user.userId, token);

    
    return user;
  }


  // private async validateToken(userId: string, token: string) {
  //   const session = await prisma.session.findFirst({
  //     where: { access_token: token, user_id: userId },
  //   });
  //   if (!session) {
  //     throw new UnauthorizedException('Invalid token');
  //   }
  // }
}

