import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import {
  FileInterceptor,
} from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { DeviceInfo, GetDeviceInfo } from 'src/common/decorator/get-device-info.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokensDto } from './dto/refresh-tokens.dto';
import appConfig from 'src/config/app.config';
import { JwtService } from '@nestjs/jwt';
import { DateHelper } from 'src/common/helper/date.helper';
import { LogoutDto } from './dto/logout.dto';
import { StringHelper } from 'src/common/helper/string.helper';
import { extname } from 'path';
import { Storage } from 'src/common/lib/Disk/Storage';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResendVerificationEmailDto } from './dto/resend-verification-email.dto';



@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService, private jwtService: JwtService) { }


  @ApiOperation({ summary: 'Get user details' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request) {
    const user_id = req.user.userId;
    const response = await this.authService.me(user_id);
    if (response.data.avatar) {
      const key = `${appConfig().storageUrl.avatar}${response.data.avatar}`;
      response.data.avatar = await Storage.url(key);
    }
    return response;
  }

  @ApiOperation({ summary: 'Register a user' })
  @Post('register')
  async create(@Body() data: CreateUserDto) {
    return await this.authService.register(data);
  }

  // login user
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({ type: LoginDto })
  @UseGuards(LocalAuthGuard)
  @HttpCode(200)
  @Post('login')
  async login(@Req() req: Request, @Res() res: Response, @GetDeviceInfo() deviceInfo: DeviceInfo) {
    const user_id = req.user.id;
    const user_email = req.user.email;
    const user_type = req.user.type;

    const response = await this.authService.login(
      user_email,
      user_id,
      user_type,
      deviceInfo,
    );

    // store to secure cookies
    // res.cookie('refresh_token', response.authorization.refresh_token, {
    //   httpOnly: true,
    //   secure: true,
    //   maxAge: DateHelper.generateFutureDate(appConfig().jwt.refresh_token_expiry || '7d').date.getTime() - Date.now(),
    // });

    return res.json(response);
  }

  @ApiOperation({ summary: 'Refresh tokens' })
  @ApiBody({ type: RefreshTokensDto })
  @ApiBearerAuth()
  @HttpCode(200)
  @Post('refresh-tokens')
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokensDto,
    @GetDeviceInfo() deviceInfo: DeviceInfo,
    @Res() res: Response
  ) {
    let decoded: any;
    try {
      decoded = await this.jwtService.verifyAsync(refreshTokenDto.refresh_token, { secret: appConfig().jwt.refresh_token_secret });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const sessionId = decoded.sessionId;
    const user_id = decoded.sub;

    const response = await this.authService.refreshToken(
      user_id,
      sessionId,
      refreshTokenDto.refresh_token,
      deviceInfo
    );

    // store to secure cookies
    // res.cookie('refresh_token', response.authorization.refresh_token, {
    //   httpOnly: true,
    //   secure: true,
    //   maxAge: DateHelper.generateFutureDate(appConfig().jwt.refresh_token_expiry || '7d').date.getTime() - Date.now(),
    // });


    return res.json(response);
  }

  @ApiOperation({ summary: 'Logout user from current or specific session' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Post('logout')
  async logout(@Req() req: Request, @Body() logoutDto: LogoutDto) {
    const userId = req.user.userId;
    const sessionId = logoutDto.sessionId || req.user.sessionId;
    const response = await this.authService.revokeRefreshToken(userId, sessionId);

    return {
      success: true,
      message: 'Logged out successfully',
      data: response,
    };
  }

  // --- DEVICE MANAGEMENT ENDPOINTS ---
  @ApiOperation({ summary: 'Get active sessions/devices' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('devices')
  async getActiveDevices(@Req() req: Request) {
    const userId = req.user.userId;
    const sessions = await this.authService.deviceSessions(userId);
    return {
      success: true,
      message: 'Active devices retrieved successfully',
      data: sessions,
    };
  }

  // logout from all devices  
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Post('logout-all')
  async logoutAllDevices(@Req() req: Request) {
    const userId = req.user.userId;
    const sessions = await this.authService.deviceSessions(userId);

    for (const session of sessions) {
      await this.authService.revokeRefreshToken(userId, session.id);
    }

    return {
      success: true,
      message: 'Logged out from all devices successfully',
    };
  }



  // update user
  @ApiOperation({ summary: 'Update user' })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  @Patch('update')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed!'), false);
        }
      },
    }),
  )
  async updateUser(
    @Req() req: Request,
    @Body() data: UpdateUserDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    try {
      if (image) {
        const generatedFilename = `${StringHelper.randomString(16)}${extname(image.originalname)}`;
        const key = `${appConfig().storageUrl.avatar}${generatedFilename}`;
        await Storage.put(key, image.buffer);
        data.avatar = generatedFilename;
      }

      const user_id = req.user.userId;
      return await this.authService.updateUser(user_id, data);
    } catch (error) {
      // clean up the uploaded file if it was saved
      if (data.avatar) {
        const key = `${appConfig().storageUrl.avatar}${data.avatar}`;
        await Storage.delete(key);
      }
      throw error;
    }
  }




  // verify email to verify the email
  @ApiOperation({ summary: 'Verify email' })
  @Post('verify-email')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto, @GetDeviceInfo() deviceInfo: DeviceInfo) {
    return await this.authService.verifyEmail({
      email: verifyEmailDto.email,
      token: verifyEmailDto.token,
      deviceInfo: deviceInfo,
    });
  }

  // resend verification email to verify the email
  @ApiOperation({ summary: 'Resend verification email' })
  @Post('resend-verification-email')
  async resendVerificationEmail(@Body() resendVerificationEmailDto: ResendVerificationEmailDto) {
    return await this.authService.resendVerificationEmail(resendVerificationEmailDto.email);
  }


  @ApiOperation({ summary: 'Forgot password' })
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return await this.authService.forgotPassword(forgotPasswordDto.email);
  }

  // reset password if user forget the password
  @ApiOperation({ summary: 'Reset password' })
  @Post('reset-password')
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    const email = resetPasswordDto.email;
    const token = resetPasswordDto.token;
    const password = resetPasswordDto.password;

    return await this.authService.resetPassword({
      email: email,
      token: token,
      password: password,
    });
  }

  // change password if user want to change the password
  @ApiOperation({ summary: 'Change password' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req: Request,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return await this.authService.changePassword({
      user_id: req.user.userId,
      oldPassword: changePasswordDto.old_password,
      newPassword: changePasswordDto.new_password,
    });
  }


}
