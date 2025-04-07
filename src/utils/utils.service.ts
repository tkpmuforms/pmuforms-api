import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { AppConfigService } from 'src/config/config.service';
import { FirebaseService } from 'src/firebase/firebase.service';

type EmailOptions = {
  from?: string;
  to: string;
  subject: string;
  message: string;
};

@Injectable()
export class UtilsService {
  constructor(
    private config: AppConfigService,
    private firebaseService: FirebaseService,
  ) {}

  private createMailTransporter() {
    const user = this.config.get('SMTP_USERNAME');
    const pass = this.config.get('SMTP_PASSWORD');
    const host = this.config.get('SMTP_HOST');
    const port = this.config.get('SMTP_PORT');

    const transporter = nodemailer.createTransport({
      host,
      port,
      auth: {
        user,
        pass,
      },
    });
    return transporter;
  }

  async sendEmail(options: EmailOptions) {
    try {
      const transporter = this.createMailTransporter();
      const from = `PMUForms <${this.config.get('SMTP_USERNAME')}>`;

      // Define mail options
      const mailOptions = {
        from: options.from ?? from,
        to: options.to,
        subject: options.subject,
        html: options.message,
      };

      // Send email
      await transporter.sendMail(mailOptions);
    } catch (error: any) {
      console.error({ error });
    }
  }

  async sendPushNotification(params: {
    fcmToken: string;
    title: string;
    body: string;
  }) {
    await this.firebaseService.sendPushNotification(params);
  }
}
