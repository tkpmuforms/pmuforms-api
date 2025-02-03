import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MessageDocument } from 'src/database/schema';
import { CreateNewMessageDto } from './dto';
import nodemailer from 'nodemailer';
import { AppConfigService } from 'src/config/config.service';

type EmailOptions = {
  from: string;
  to: string;
  subject: string;
  message: string;
};

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel('messages')
    private messageModel: Model<MessageDocument>,
    private config: AppConfigService,
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

  private async sendEmail(options: EmailOptions) {
    try {
      const transporter = this.createMailTransporter();

      // Define mail options
      const mailOptions = {
        from: options.from, //'"Akinola" <akinola@gmail.com>'
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

  async createNewMessage(dto: CreateNewMessageDto) {
    const { email, firstName, subject, message } = dto;
    const msg = await this.messageModel.create({
      email,
      firstName,
      subject,
      message,
    });

    this.sendEmail({
      from: `PMUForms <${this.config.get('SMTP_USERNAME')}>`,
      to: 'contact@pmuforms.com',
      subject,
      message,
    });
    return msg;
  }
}
