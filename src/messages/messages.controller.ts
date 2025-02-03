import { Body, Controller, Post } from '@nestjs/common';
import { CreateNewMessageDto } from './dto';
import { MessagesService } from './messages.service';

@Controller('api/messages')
export class MessagesController {
  constructor(private readonly messageService: MessagesService) {}
  @Post('/')
  async createNewMessage(@Body() dto: CreateNewMessageDto) {
    const message = await this.messageService.createNewMessage(dto);

    return { message };
  }
}
