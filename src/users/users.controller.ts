import { Body, Controller, Patch } from '@nestjs/common';
import { UsersService } from './users.service';
import { GetUser, Roles } from 'src/auth/decorator';
import { UserRole } from 'src/enums';
import { UserDocument } from 'src/database/schema';
import { UpdateBusinessNameDto } from './dto';

@Controller('api/artists')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Roles(UserRole.ARTIST)
  @Patch('/update-business-name')
  async updateBusinessName(
    @GetUser() artist: UserDocument,
    @Body() dto: UpdateBusinessNameDto,
  ) {
    const artistDoc = await this.usersService.updateBusinessName(
      artist.userId,
      dto.businessName,
    );

    return { artist: artistDoc };
  }
}
