import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import appConfig from '../config/app.config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  constructor(
    @InjectQueue('mail-queue') private queue: Queue,
  ) {}

  async sendMemberInvitation({ user, member, url }) {
    try {
      const from = `${process.env.APP_NAME} <${appConfig().mail.from}>`;
      const subject = `${user.fname} is inviting you to ${appConfig().app.name}`;

      // add to queue
      await this.queue.add('sendMemberInvitation', {
        to: member.email,
        from: from,
        subject: subject,
        template: 'member-invitation',
        context: {
          user: user,
          member: member,
          url: url,
        },
      });
    } catch (error) {
      this.logger.error('Error sending member invitation', error);
    }
  }

  // send otp code for email verification
  async sendOtpCodeToEmail({ name, email, otp }) {
    try {
      const from = `${process.env.APP_NAME} <${appConfig().mail.from}>`;
      const subject = 'Email Verification';

      this.logger.debug(`Adding job to queue for sending OTP code: ${otp} to email: ${email}`);
      
      // TODO: uncomment this add queue
      // add to queue
      // await this.queue.add('sendOtpCodeToEmail', {
      //   to: email,
      //   from: from,
      //   subject: subject,
      //   template: 'email-verification',
      //   context: {
      //     name: name,
      //     otp: otp,
      //   },
      // });
    } catch (error) {
      this.logger.error('Error sending OTP code to email', error);
    }
  }

  async sendMemberStatusUpdateEmail({ email, name, status }) {
    try {
      const from = `${process.env.APP_NAME} <${appConfig().mail.from}>`;
      const subject = 'Account Status Update';

      // add to queue
      await this.queue.add('sendMemberStatusUpdateEmail', {
        to: email,
        from: from,
        subject: subject,
        template: 'member-status-update',
        context: {
          name: name,
          status: status,
        },
      });
    } catch (error) {
      this.logger.error('Error sending member status update email', error);
    }
  }

  async sendVerificationLink(params: {
    email: string;
    name: string;
    token: string;
    type: string;
  }) {
    try {
      const verificationLink = `${appConfig().app.client_app_url}/verify-email?token=${params.token}&email=${params.email}&type=${params.type}`;

      // add to queue
      await this.queue.add('sendVerificationLink', {
        to: params.email,
        subject: 'Verify Your Email',
        template: './verification-link',
        context: {
          name: params.name,
          verificationLink,
        },
      });
    } catch (error) {
      this.logger.error('Error sending verification link email', error);
    }
  }


}
