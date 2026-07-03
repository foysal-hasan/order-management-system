// external imports
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { UAParser } from 'ua-parser-js';
//internal imports
import appConfig from '../../config/app.config';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { DateHelper } from '../../common/helper/date.helper';
import { StringHelper } from '../../common/helper/string.helper';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { UserStatus } from 'src/generated/prisma/enums';
import { DeviceInfo } from 'src/common/decorator/get-device-info.decorator';
import { PrismaHelper } from 'src/prisma/helper/exclude';
import { Prisma } from 'src/generated/prisma/client';


@Injectable()
export class AuthService {
  private readonly registerOtpExpirySeconds = 2 * 60; // 2 minutes
  private readonly forgotPasswordOtpExpirySeconds = 2 * 60; // 2 minutes

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailService: MailService,
    @InjectRedis() private readonly redis: Redis,
  ) { }

  private getRegisterOtpKey(email: string): string {
    return `register_otp:${email}`;
  }

  private getForgotPasswordOtpKey(email: string): string {
    return `forgot_password_otp:${email}`;
  }

  private getRefreshTokenKey(user_session_id: string): string {
    return `refresh_token:${user_session_id}`;
  }


  async register(createUserDto: CreateUserDto) {
    // Check if email already exist
    const userEmailExist = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (userEmailExist) {
      throw new BadRequestException('Email already exist');
    }


    // hash password
    const hashPassword = await bcrypt.hash(createUserDto.password, appConfig().security.salt);

    await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashPassword,
      },
    });

    const otp = String(randomInt(100000, 1000000));

    await this.redis.set(
      this.getRegisterOtpKey(createUserDto.email),
      otp,
      'EX',
      this.registerOtpExpirySeconds,
    );

    // send otp code to email
    await this.mailService.sendOtpCodeToEmail({
      email: createUserDto.email,
      name: createUserDto.name,
      otp: otp,
    });

    return {
      success: true,
      message: 'We have sent an OTP code to your email',
    };

  }

  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
  ) {
    const data: Prisma.UserUpdateInput = {};

    if (updateUserDto.name) {
      data.name = updateUserDto.name;
    }

    if (updateUserDto.avatar) {
      data.avatar = updateUserDto.avatar;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
      },
    });

    return {
      success: true,
      message: 'User updated successfully',
    };
  }

  async validateUser(
    email: string,
    password: string
  ): Promise<any> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }


    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('Your account has been blocked. Please contact support.');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Your account has been suspended. Please contact support.');
    }

    const _isValidPassword = await bcrypt.compare(password, user.password);

    if (!_isValidPassword) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const safeUser = PrismaHelper.exclude(user, ['password']);

    if (!user.email_verified_at) {
      const otp = String(randomInt(100000, 1000000));

      await this.redis.set(
        this.getRegisterOtpKey(email),
        otp,
        'EX',
        this.registerOtpExpirySeconds,
      );

      // send otp code to email
      await this.mailService.sendOtpCodeToEmail({
        email: safeUser.email,
        name: safeUser.name,
        otp: otp,
      });


      throw new UnauthorizedException('Email not verified. We have sent an OTP code to your email for verification.');
    }

    return safeUser;
  }

  async login(email: string, user_id: string, type: string, deviceInfo: DeviceInfo) {
    // delete any existing session for the same device and user
    await this.prisma.userSession.deleteMany({
      where: {
        user_id: user_id,
        device_name: deviceInfo.deviceName,
        ip_address: deviceInfo.ip,
      },
    });

    const userSession = await this.prisma.userSession.create({
      data: {
        user_id: user_id,
        device_name: deviceInfo.deviceName,
        ip_address: deviceInfo.ip,
        expires_at: DateHelper.generateFutureDate(appConfig().jwt.refresh_token_expiry).date,
      },
    });

    const accessTokenPayload = { email: email, sub: user_id, sessionId: userSession.id, type: type };
    const refreshTokenPayload = { sessionId: userSession.id, sub: user_id };



    const accessToken = this.jwtService.sign(accessTokenPayload, { expiresIn: DateHelper.generateFutureDate(appConfig().jwt.access_token_expiry).unixSeconds, secret: appConfig().jwt.access_token_secret });

    const refreshToken = this.jwtService.sign(refreshTokenPayload, { expiresIn: DateHelper.generateFutureDate(appConfig().jwt.refresh_token_expiry).unixSeconds, secret: appConfig().jwt.refresh_token_secret });


    // store refreshToken
    await this.redis.set(
      this.getRefreshTokenKey(userSession.id),
      refreshToken,
      'EX',
      DateHelper.generateFutureDate(appConfig().jwt.refresh_token_expiry).date.getTime() - new Date().getTime()
    );

    return {
      success: true,
      message: 'Logged in successfully',
      authorization: {
        type: 'bearer',
        access_token: accessToken,
        refresh_token: refreshToken,
      },
      type: type,
    };
  }


  private async invalidateSession(sessionId: string, ttlSeconds: number) {
    // Flag this session ID as dead in Redis for the remainder of the access token's life
    await this.redis.set(
      `blacklist:${sessionId}`,
      'true',
      'EX',
      ttlSeconds
    );
  }


  async refreshToken(user_id: string, sessionId: string, refreshToken: string, deviceInfo: DeviceInfo) {

    const storedToken = await this.redis.get(`refresh_token:${sessionId}`);

    if (!storedToken || storedToken != refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!user_id) {
      throw new UnauthorizedException('User not found');
    }


    // update device info of the session
    await this.prisma.userSession.delete({
      where: { id: sessionId }
    });

    await this.invalidateSession(sessionId, DateHelper.generateFutureDate(appConfig().jwt.access_token_expiry).date.getTime() - new Date().getTime());

    const newUserSession = await this.prisma.userSession.create({
      data: {
        user_id: user_id,
        device_name: deviceInfo.deviceName,
        ip_address: deviceInfo.ip,
        expires_at: DateHelper.generateFutureDate(appConfig().jwt.refresh_token_expiry).date,
      }
    });

    const userDetails = await this.prisma.user.findUnique({
      where: { id: user_id },
    });

    if (!userDetails) {
      throw new UnauthorizedException('User not found');
    }

    // delete old refresh token
    await this.redis.del(this.getRefreshTokenKey(sessionId));

    const payload = { email: userDetails.email, sub: userDetails.id, sessionId: newUserSession.id, type: userDetails.type };

    const accessToken = this.jwtService.sign(payload, { expiresIn: DateHelper.generateFutureDate(appConfig().jwt.access_token_expiry).unixSeconds, secret: appConfig().jwt.access_token_secret });

    const newRefreshTokenPayload = { sessionId: newUserSession.id, sub: user_id };

    const newRefreshToken = this.jwtService.sign(newRefreshTokenPayload, { expiresIn: DateHelper.generateFutureDate(appConfig().jwt.refresh_token_expiry).unixSeconds, secret: appConfig().jwt.refresh_token_secret });

    await this.redis.set(
      this.getRefreshTokenKey(newUserSession.id),
      newRefreshToken,
      'EX',
      DateHelper.generateFutureDate(appConfig().jwt.refresh_token_expiry).date.getTime() - new Date().getTime()
    );


    return {
      success: true,
      authorization: {
        type: 'bearer',
        access_token: accessToken,
        refresh_token: newRefreshToken,
      },
      type: userDetails.type,
    };
  }

  async revokeRefreshToken(userId: string, sessionId: string) {
    const storedToken = await this.redis.get(this.getRefreshTokenKey(sessionId));
    if (!storedToken) {
      throw new UnauthorizedException('Invalid session');
    }

    await this.invalidateSession(sessionId, DateHelper.generateFutureDate(appConfig().jwt.access_token_expiry).date.getTime() - new Date().getTime());

    await this.redis.del(this.getRefreshTokenKey(sessionId));

    await this.prisma.userSession.delete({
      where: { id: sessionId, user_id: userId }
    });

    return null;
  }

  async deviceSessions(userId: string) {
    const sessions = await this.prisma.userSession.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        device_name: true,
        ip_address: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
      },
    });
    return sessions;
  }


  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        type: true,
        avatar: true,
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      data: user,
    };
  }



  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const otp = String(randomInt(100000, 1000000));

    await this.redis.set(
      this.getForgotPasswordOtpKey(email),
      otp,
      'EX',
      this.forgotPasswordOtpExpirySeconds
    );

    await this.mailService.sendOtpCodeToEmail({
      email: email,
      name: user.name,
      otp: otp,
    });

    return {
      success: true,
      message: 'We have sent an OTP code to your email',
    };

  }

  async resetPassword({ email, token, password }) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }


    const existToken = await this.redis.get(this.getForgotPasswordOtpKey(email));

    if (!existToken || existToken !== token) {
      throw new BadRequestException('Invalid token');
    }

    const hashPassword = await bcrypt.hash(password, appConfig().security.salt);


    await this.prisma.user.update({
      where: {
        email: email,
      },
      data: {
        password: hashPassword,
      },
    });

    // delete otp code
    await this.redis.del(this.getForgotPasswordOtpKey(email));

    return {
      success: true,
      message: 'Password updated successfully',
    };
  }

  async verifyEmail({
    email,
    token,
    deviceInfo
  }: {
    email: string;
    token: string;
    deviceInfo: DeviceInfo;
  }) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: email,
      },
      select: {
        id: true,
        type: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User does not found');
    }


    const existToken = await this.redis.get(this.getRegisterOtpKey(email));

    if (!existToken || existToken !== token) {
      throw new BadRequestException('Invalid token');
    }

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        email_verified_at: new Date(Date.now()),
      },
    });

    // delete otp code
    await this.redis.del(this.getRegisterOtpKey(email));

    // auto login after email verification
    return await this.login(email, user.id, user.type, deviceInfo);

  }

  async resendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!user || user.email_verified_at) {
      throw new NotFoundException('User not found');
    }


    // create otp code
    const otp = String(randomInt(100000, 1000000));
    await this.redis.set(this.getRegisterOtpKey(email), otp, 'EX', this.registerOtpExpirySeconds);

    // send otp code to email
    await this.mailService.sendOtpCodeToEmail({
      email: email,
      name: user.name,
      otp: otp,
    });

    return {
      success: true,
      message: 'We have sent a otp code again to your email',
    };

  }

  async changePassword({ user_id, oldPassword, newPassword }) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: user_id,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const _isValidPassword = await bcrypt.compare(oldPassword, user.password);

    if (!_isValidPassword) {
      throw new BadRequestException('Invalid old password');
    }


    const hashPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashPassword,
      },
    });

    return {
      success: true,
      message: 'Password updated successfully',
    };

  }

}
