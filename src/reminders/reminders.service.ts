import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateReminderDto, UpdateReminderDto } from './dto';
import { InjectModel } from '@nestjs/mongoose';
import { ReminderDocument } from 'src/database/schema';
import { FilterQuery, Model } from 'mongoose';
import { paginationMetaGenerator } from 'src/utils';
import { randomUUID } from 'node:crypto';

@Injectable()
export class RemindersService {
  constructor(
    @InjectModel('reminders')
    private reminderModel: Model<ReminderDocument>,
  ) {}

  async createNewReminder(artistId: string, dto: CreateReminderDto) {
    const reminder = new this.reminderModel({
      id: randomUUID(),
      artistId,
      type: dto.type,
      sendAt: dto.sendAt,
      customerId: dto.customerId,
      note: dto.note,
    });

    await reminder.save();

    // schedule reminder with id as idempkey

    return reminder;
  }

  async getAllArtistReminders(
    artistId: string,
    options: { page?: number; limit?: number },
  ) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const queryObject: FilterQuery<ReminderDocument> = {
      artistId,
      // sendAt: { $gte: new Date() },
    };

    const total = await this.reminderModel.countDocuments(queryObject);

    const reminders = await this.reminderModel
      .find(queryObject)
      .sort({ sendAt: 'asc' })
      .skip(skip)
      .limit(limit);

    const metadata = paginationMetaGenerator(total, page, limit);
    return { metadata, reminders };
  }

  async myCustomerReminders(
    artistId: string,
    customerId: string,
    options: { page?: number; limit?: number },
  ) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const queryObject: FilterQuery<ReminderDocument> = {
      artistId,
      customerId,
      // sendAt: { $gte: new Date() },
    };

    const total = await this.reminderModel.countDocuments(queryObject);

    const reminders = await this.reminderModel
      .find(queryObject)
      .sort({ sendAt: 'asc' })
      .skip(skip)
      .limit(limit);

    const metadata = paginationMetaGenerator(total, page, limit);
    return { metadata, reminders };
  }

  async getOneReminder(artistId: string, reminderId: string) {
    const reminder = await this.reminderModel.findOne({
      id: reminderId,
      artistId,
    });

    if (!reminder) {
      throw new NotFoundException(`reminder with id ${reminderId} not found`);
    }

    return reminder;
  }

  async updateReminder(
    artistId: string,
    reminderId: string,
    dto: UpdateReminderDto,
  ) {
    const reminder = await this.reminderModel.findOne({
      id: reminderId,
      artistId,
    });

    if (!reminder) {
      throw new NotFoundException(`reminder with id ${reminderId} not found`);
    }

    reminder.set({
      sendAt: dto.sendAt,
      note: dto.note,
      type: dto.type,
    });

    await reminder.save();

    // reschedule reminder

    return reminder;
  }

  async deleteReminder(artistId: string, reminderId: string) {
    const reminder = await this.reminderModel.findOne({
      id: reminderId,
      artistId,
    });

    if (!reminder) {
      throw new NotFoundException(`reminder with id ${reminderId} not found`);
    }

    await reminder.deleteOne();

    return { message: 'reminder deleted successfully' };
  }
}
