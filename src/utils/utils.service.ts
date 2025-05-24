import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import nodemailer from 'nodemailer';
import { AppConfigService } from 'src/config/config.service';
import { UserDocument } from 'src/database/schema';
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
    @InjectModel('users')
    private userModel: Model<UserDocument>,
    private config: AppConfigService,
    private firebaseService: FirebaseService,
  ) {}

  async generateBusinessUri(businessName: string, userId: string) {
    let businessUri = businessName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');

    // remove leading and trailing hyphens
    businessUri = businessUri.replace(/^-+|-+$/g, '');

    // remove multiple consecutive hyphens
    businessUri = businessUri.replace(/-+/g, '-');
    
    const businessUriExists = await this.userModel.findOne({
      userId: { $ne: userId },
      businessUri,
    });

    if (businessUriExists) {
      businessUri = `${businessUri}-${Date.now()}`;
    }

    return businessUri;
  }

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
