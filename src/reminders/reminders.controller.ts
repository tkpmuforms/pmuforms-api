import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { RemindersService } from './reminders.service';
import {
  CreateReminderDto,
  PaginationParamsDto,
  UpdateReminderDto,
} from './dto';
import { GetUser, Roles } from 'src/auth/decorator';
import { UserRole } from 'src/enums';

@Controller('api/reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Roles(UserRole.ARTIST)
  @Post('/new-reminder')
  async createNewReminder(
    @GetUser('userId') artistId: string,
    @Body() dto: CreateReminderDto,
  ) {
    return await this.remindersService.createNewReminder(artistId, dto);
  }

  @Roles(UserRole.ARTIST)
  @Get('/all-reminders')
  async getArtistReminders(
    @GetUser('userId') artistId: string,
    @Query() options: PaginationParamsDto,
  ) {
    return await this.remindersService.getAllArtistReminders(artistId, options);
  }

  @Roles(UserRole.ARTIST)
  @Get('/customer/:customerId')
  async myCustomerReminders(
    @GetUser('userId') artistId: string,
    @Param('customerId') customerId: string,
    @Query() options: PaginationParamsDto,
  ) {
    return await this.remindersService.myCustomerReminders(
      artistId,
      customerId,
      options,
    );
  }

  @Roles(UserRole.ARTIST)
  @Get('/:reminderId')
  async getOneReminder(
    @GetUser('userId') artistId: string,
    @Param('reminderId') id: string,
  ) {
    return await this.remindersService.getOneReminder(artistId, id);
  }

  @Roles(UserRole.ARTIST)
  @Patch('/:reminderId')
  async updateReminder(
    @GetUser('userId') artistId: string,
    @Param('reminderId') id: string,
    @Body() dto: UpdateReminderDto,
  ) {
    return await this.remindersService.updateReminder(artistId, id, dto);
  }

  @Roles(UserRole.ARTIST)
  @Delete('/:reminderId')
  async remove(
    @GetUser('userId') artistId: string,
    @Param('reminderId') id: string,
  ) {
    await this.remindersService.deleteReminder(artistId, id);
    return { message: 'Deleted Successfully!!' };
  }
}
