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


@Injectable()
export class AuthService {
  private readonly registerOtpExpirySeconds = 2 * 60; // 2 minutes

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
    image?: Express.Multer.File,
  ) {
    try {
      const data: any = {};
      // if (updateUserDto.name) {
      //   data.name = updateUserDto.name;
      // }
      // if (updateUserDto.first_name) {
      //   data.first_name = updateUserDto.first_name;
      // }
      // if (updateUserDto.last_name) {
      //   data.last_name = updateUserDto.last_name;
      // }
      if (updateUserDto.username) {
        const exist = await this.prisma.user.findUnique({
          where: { username: updateUserDto.username },
        });

        if (exist) {
          throw new BadRequestException('Username already taken');
        }
        data.username = updateUserDto.username;
      }

      if (updateUserDto.title) {
        data.title = updateUserDto.title;
      }
      if (updateUserDto.about) {
        data.about = updateUserDto.about;
      }

      if (updateUserDto.skils) {
        data.skils = updateUserDto.skils;
      }

      if (updateUserDto.experience) {
        data.experience = updateUserDto.experience;
      }

      if (updateUserDto.type) {
        data.type = updateUserDto.type;
      }

      if (updateUserDto.instrument) {
        data.instrument = updateUserDto.instrument;
      }

      if (updateUserDto.language) {
        data.language = updateUserDto.language;
      }

      if (updateUserDto.online_status) {
        data.online_status = updateUserDto.online_status;
      }
      if (updateUserDto.phone_number) {
        data.phone_number = updateUserDto.phone_number;
      }
      if (updateUserDto.country) {
        data.country = updateUserDto.country;
      }
      if (updateUserDto.state) {
        data.state = updateUserDto.state;
      }
      if (updateUserDto.local_government) {
        data.local_government = updateUserDto.local_government;
      }
      if (updateUserDto.city) {
        data.city = updateUserDto.city;
      }
      if (updateUserDto.zip_code) {
        data.zip_code = updateUserDto.zip_code;
      }
      if (updateUserDto.address) {
        data.address = updateUserDto.address;
      }
      if (updateUserDto.gender) {
        data.gender = updateUserDto.gender;
      }
      if (updateUserDto.date_of_birth) {
        data.date_of_birth = DateHelper.format(updateUserDto.date_of_birth);
      }

      if (updateUserDto.order_email !== undefined) {
        data.order_email = updateUserDto.order_email;
      }

      if (updateUserDto.order_push !== undefined) {
        data.order_push = updateUserDto.order_push;
      }

      if (updateUserDto.message_email !== undefined) {
        data.message_email = updateUserDto.message_email;
      }

      if (updateUserDto.message_push !== undefined) {
        data.message_push = updateUserDto.message_push;
      }

      if (updateUserDto.earning_email !== undefined) {
        data.earning_email = updateUserDto.earning_email;
      }

      if (updateUserDto.earning_push !== undefined) {
        data.earning_push = updateUserDto.earning_push;
      }

      if (updateUserDto.promo_email !== undefined) {
        data.promo_email = updateUserDto.promo_email;
      }

      if (updateUserDto.promo_push !== undefined) {
        data.promo_push = updateUserDto.promo_push;
      }

      if (image) {
        // delete old image from storage
        const oldImage = await this.prisma.user.findFirst({
          where: { id: userId },
          select: { avatar: true },
        });
        if (oldImage.avatar) {
          await SojebStorage.delete(
            appConfig().storageUrl.avatar + oldImage.avatar,
          );
        }

        // upload file
        const fileName = `${StringHelper.randomString()}${image.originalname}`;
        await SojebStorage.put(
          appConfig().storageUrl.avatar + fileName,
          image.buffer,
        );

        data.avatar = fileName;
      }
      const user = await UserRepository.getUserDetails(userId);
      if (user) {
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
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: error.message,
      };
    }
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

    if (user) {
      if(user.status === UserStatus.BLOCKED) {
        throw new UnauthorizedException('Your account has been blocked. Please contact support.');
      }

      if(user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException('Your account has been suspended. Please contact support.');
      }

      const _isValidPassword = await bcrypt.compare(password, user.password);
      if (_isValidPassword) {
        const { password, ...result } = user;
        return result;
      } else {
        throw new UnauthorizedException('Invalid email or password.');
      }
    } else {
      throw new UnauthorizedException('Invalid email or password.');
    }
  }

    async login(email: string, user_id: string, type: string,  deviceInfo: DeviceInfo) {
    try {
      // delete any existing session for the same device and user
      await this.prisma.userSession.deleteMany({
        where: {
          user_id: user_id,
          deviceName: deviceInfo.deviceName,
          ipAddress: deviceInfo.ip,
        },
      });

      const userSession = await this.prisma.userSession.create({
        data: {
          user_id: user_id,
          device_name: deviceInfo.deviceName,
          ip_address: deviceInfo.ip,
          expires_at: DateHelper.generateFutureDate(appConfig().jwt.refresh_token_expiry || '30d').date,
        },
      });

      const accessTokenPayload = { email: email, sub: user_id, sessionId: userSession.id, type: type };
      const refreshTokenPayload = { sessionId: userSession.id, sub: user_id };

  

      const accessToken = this.jwtService.sign(accessTokenPayload, { expiresIn: DateHelper.generateFutureDate(appConfig().jwt.access_token_expiry || '1h').unixSeconds, secret: appConfig().jwt.access_token_secret });
      const refreshToken = this.jwtService.sign(refreshTokenPayload, { expiresIn: DateHelper.generateFutureDate(appConfig().jwt.refresh_token_expiry || '30d').unixSeconds, secret: appConfig().jwt.refresh_token_secret });
 

      // store refreshToken
      await this.redis.set(
        `refresh_token:${userSession.id}`,
        refreshToken,
        'EX',
        DateHelper.generateFutureDate(appConfig().jwt.refresh_token_expiry || '30d').date.getTime() - new Date().getTime()
      );

      return {
        success: true,
        message: 'Logged in successfully',
        authorization: {
          type: 'bearer',
          access_token: accessToken,
          refresh_token: refreshToken,
        },
        roles: roles,
      };
    } catch (error) {
      console.log('Login error:', error);
    }

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


  async refreshToken(user_id: string, refreshToken: string) {
    const storedToken = await this.redis.get(`refresh_token:${user_id}`);

    if (!storedToken || storedToken != refreshToken) {
      return {
        success: false,
        message: 'Refresh token is required',
      };
    }

    if (!user_id) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: user_id },
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    const payload = { email: user.email, sub: user.id };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });

    return {
      success: true,
      authorization: {
        type: 'bearer',
        access_token: accessToken,
      },
    };
  }

  async revokeRefreshToken(user_id: string) {
    const storedToken = await this.redis.get(`refresh_token:${user_id}`);
    if (!storedToken) {
      throw new BadRequestException('Refresh token not found');
    }

    await this.redis.del(`refresh_token:${user_id}`);

    return {
      success: true,
      message: 'Refresh token revoked successfully',
    };
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

  async forgotPassword(email) {
    try {
      const user = await UserRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const token = await UcodeRepository.createToken({
          userId: user.id,
          isOtp: true,
        });

        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.name,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent an OTP code to your email',
        };
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async resetPassword({ email, token, password }) {
    try {
      const user = await UserRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const existToken = await UcodeRepository.validateToken({
          email: email,
          token: token,
        });

        if (existToken) {
          await UserRepository.changePassword({
            email: email,
            password: password,
          });

          // delete otp code
          await UcodeRepository.deleteToken({
            email: email,
            token: token,
          });

          return {
            success: true,
            message: 'Password updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async verifyEmail({
    email,
    token,
    req,
  }: {
    email: string;
    token: string;
    req: Request;
  }) {
    try {
      const user = await UserRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const existToken = await UcodeRepository.validateToken({
          email: email,
          token: token,
        });

        if (existToken) {
          await this.prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              email_verified_at: new Date(Date.now()),
            },
          });

          // delete otp code
          await UcodeRepository.deleteToken({
            email: email,
            token: token,
          });

          // auto login after email verification
          return await this.login({ email: user.email, userId: user.id }, req);

          // return {
          //   success: true,
          //   message: 'Email verified successfully',
          // };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async resendVerificationEmail(email: string) {
    try {
      const user = await UserRepository.getUserByEmail(email);

      if (user) {
        // create otp code
        const token = await UcodeRepository.createToken({
          userId: user.id,
          isOtp: true,
        });

        // send otp code to email
        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.name,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent a otp code to your email',
        };
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async changePassword({ user_id, oldPassword, newPassword }) {
    try {
      const user = await UserRepository.getUserDetails(user_id);

      if (user) {
        const _isValidPassword = await UserRepository.validatePassword({
          email: user.email,
          password: oldPassword,
        });
        if (_isValidPassword) {
          await UserRepository.changePassword({
            email: user.email,
            password: newPassword,
          });

          return {
            success: true,
            message: 'Password updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid password',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }



  async logoutCurrentDevice(userId: string, access_token: string) {
    await this.prisma.session.deleteMany({
      where: { user_id: userId, access_token: access_token },
    });
    return { success: true, message: 'Logged out from current device' };
  }

  async logoutAllDevices(userId: string) {
    await this.prisma.session.deleteMany({
      where: { user_id: userId },
    });
    return { success: true, message: 'Logged out from all devices' };
  }

  async logoutDeviceById(userId: string, sessionId: string) {
    await this.prisma.session.deleteMany({
      where: { user_id: userId, id: sessionId },
    });
    return { success: true, message: 'Logged out from selected device' };
  }


  async getUserDevices(userId: string) {
    const devices = await this.prisma.session.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        device: true,
        ip: true,
        created_at: true,
        user_agent: true,
      },
    });

    const devicesWithLocation = await Promise.all(
      devices.map(async (device) => {
        const location = await this.getLocationByIpAddress(device.ip);
        return { ...device, location };
      }),
    );

    return { success: true, data: devicesWithLocation };
  }

}
