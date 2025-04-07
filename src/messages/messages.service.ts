import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MessageDocument } from 'src/database/schema';
import { CreateNewMessageDto } from './dto';
import { AppConfigService } from 'src/config/config.service';
import { UtilsService } from 'src/utils/utils.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel('messages')
    private messageModel: Model<MessageDocument>,
    private config: AppConfigService,
    private utilsService: UtilsService,
  ) {}

  async createNewMessage(dto: CreateNewMessageDto) {
    const { email, firstName, subject, message } = dto;

    const msg = await this.messageModel.create({
      email,
      firstName,
      subject,
      message,
    });

    const emailBody = `
      <p> Reply to: ${email}</p>
      <p> First Name: ${firstName}</p>
      <p> Subject: ${subject}</p>
      <p> Message: ${message}</p>
    `;

    this.utilsService.sendEmail({
      to: this.config.get('CONTACT_US_EMAIL'),
      subject,
      message: emailBody,
    });
    return msg;
  }
}
