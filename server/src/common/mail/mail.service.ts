import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectPinoLogger(MailService.name)
    private readonly logger: PinoLogger,
  ) {
    const host = this.configService.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.configService.get<number>('SMTP_PORT', 587),
        secure: this.configService.get<number>('SMTP_PORT', 587) === 465,
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
    }
  }

  /**
   * Sends the password-reset email if SMTP is configured. In development (or
   * any environment without SMTP_HOST set) it logs the link instead of
   * failing, so the reset flow stays fully testable without real mail infra.
   */
  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        { to, resetLink },
        'SMTP not configured — logging password reset link instead of emailing it',
      );
      return;
    }

    const from = this.configService.get<string>(
      'SMTP_FROM',
      'noreply@example.com',
    );

    await this.transporter.sendMail({
      from,
      to,
      subject: 'Reset your Content Shelf password',
      text: `We received a request to reset your password. Open this link to choose a new one (expires in 30 minutes):\n\n${resetLink}\n\nIf you didn't request this, you can ignore this email.`,
      html: `<p>We received a request to reset your password.</p><p><a href="${resetLink}">Reset your password</a> (expires in 30 minutes)</p><p>If you didn't request this, you can ignore this email.</p>`,
    });
  }
}
