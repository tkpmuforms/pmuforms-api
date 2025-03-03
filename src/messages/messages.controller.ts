import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CreateNewMessageDto } from './dto';
import { MessagesService } from './messages.service';
import { Public } from 'src/auth/decorator';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('api/messages')
export class MessagesController {
  constructor(private readonly messageService: MessagesService) {}

  @Public()
  @Post('/')
  @UseGuards(ThrottlerGuard)
  async createNewMessage(@Body() dto: CreateNewMessageDto) {
    const message = await this.messageService.createNewMessage(dto);

    return { message };
  }
}
