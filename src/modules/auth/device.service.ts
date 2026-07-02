import { Injectable } from '@nestjs/common';
import { UAParser } from 'ua-parser-js';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

interface DeviceInfo {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  device: string;
  deviceType: string;
  userAgent: string;
  ip: string;
  location?: string;
  timezone?: string;
}

interface SessionData {
  userId: string;
  deviceInfo: string;
  ip: string;
  refreshToken: string;
  deviceDetails?: DeviceInfo;
}

@Injectable()
export class DeviceService {
  constructor(
    private prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Extract comprehensive device information from user agent and request
   */
  extractDeviceInfo(req: Request): DeviceInfo {
    const ua = UAParser(req.headers['user-agent'] || '');

    const deviceInfo: DeviceInfo = {
      browser: ua.browser.name || 'Unknown',
      browserVersion: ua.browser.version || '',
      os: ua.os.name || 'Unknown',
      osVersion: ua.os.version || '',
      device: ua.device.model || 'Unknown',
      deviceType: ua.device.type || 'desktop',
      userAgent: req.headers['user-agent'] || '',
      ip: this.getClientIP(req),
      location: req.headers['cf-ipcountry'] as string || undefined,
      timezone: req.headers['timezone'] as string || undefined,
    };

    return deviceInfo;
  }

  /**
   * Get client IP address from request
   */
  private getClientIP(req: Request): string {
    // Check various headers for IP address
    const ip =
      req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      req.headers['cf-connecting-ip'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.ip ||
      'unknown';

    // Handle comma-separated IPs (from x-forwarded-for)
    if (typeof ip === 'string' && ip.includes(',')) {
      return ip.split(',')[0].trim();
    }

    return Array.isArray(ip) ? ip[0] : ip;
  }

  /**
   * Create a human-readable device string
   */
  createDeviceString(deviceInfo: DeviceInfo): string {
    const parts = [];

    // Browser info
    if (deviceInfo.browser && deviceInfo.browser !== 'Unknown') {
      const browserStr = deviceInfo.browserVersion
        ? `${deviceInfo.browser} ${deviceInfo.browserVersion}`
        : deviceInfo.browser;
      parts.push(browserStr);
    }

    // OS info
    if (deviceInfo.os && deviceInfo.os !== 'Unknown') {
      const osStr = deviceInfo.osVersion
        ? `${deviceInfo.os} ${deviceInfo.osVersion}`
        : deviceInfo.os;
      parts.push(`on ${osStr}`);
    }

    // Device info
    if (deviceInfo.device && deviceInfo.device !== 'Unknown') {
      parts.push(`(${deviceInfo.device})`);
    } else if (deviceInfo.deviceType) {
      parts.push(`(${deviceInfo.deviceType})`);
    }

    return parts.length > 0 ? parts.join(' ') : 'Unknown Device';
  }

  /**
   * Create a new session record
   */
  async createSession(sessionData: SessionData): Promise<any> {
    try {
      const session = await this.prisma.session.create({
        data: {
          user_id: sessionData.userId,
          device: sessionData.deviceInfo,
          ip: sessionData.ip,
          refresh_token: sessionData.refreshToken,
          // You can store additional device details as JSON if needed
          // device_details: sessionData.deviceDetails ? JSON.stringify(sessionData.deviceDetails) : null,
        },
      });

      return {
        success: true,
        session,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<any> {
    try {
      const sessions = await this.prisma.session.findMany({
        where: { user_id: userId },
        select: {
          id: true,
          device: true,
          ip: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      return {
        success: true,
        sessions,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Delete a specific session
   */
  async deleteSession(userId: string, sessionId: string): Promise<any> {
    try {
      const session = await this.prisma.session.findFirst({
        where: { id: sessionId, user_id: userId },
      });

      if (!session) {
        return {
          success: false,
          message: 'Session not found',
        };
      }

      // Remove from Redis
      await this.redis.del(`refresh_token:${userId}`);

      // Remove from database
      await this.prisma.session.delete({
        where: { id: sessionId },
      });

      return {
        success: true,
        message: 'Session deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Delete all sessions for a user
   */
  async deleteAllSessions(userId: string): Promise<any> {
    try {
      // Remove from Redis
      await this.redis.del(`refresh_token:${userId}`);

      // Remove from database
      await this.prisma.session.deleteMany({
        where: { user_id: userId },
      });

      return {
        success: true,
        message: 'All sessions deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Delete current session by refresh token
   */
  async deleteCurrentSession(userId: string, refreshToken: string): Promise<any> {
    try {
      const session = await this.prisma.session.findFirst({
        where: { user_id: userId, refresh_token: refreshToken },
      });

      if (!session) {
        return {
          success: false,
          message: 'Session not found',
        };
      }

      // Remove from Redis
      await this.redis.del(`refresh_token:${userId}`);

      // Remove from database
      await this.prisma.session.delete({
        where: { id: session.id },
      });

      return {
        success: true,
        message: 'Current session deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Validate if a session exists and is active
   */
  async validateSession(userId: string, refreshToken: string): Promise<boolean> {
    try {
      const session = await this.prisma.session.findFirst({
        where: {
          user_id: userId,
          refresh_token: refreshToken,
        },
      });

      return !!session;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clean up expired sessions (optional utility method)
   */
  async cleanupExpiredSessions(): Promise<any> {
    try {
      // This could be implemented to remove sessions older than a certain period
      // For now, we'll keep all sessions
      return {
        success: true,
        message: 'Cleanup completed',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
