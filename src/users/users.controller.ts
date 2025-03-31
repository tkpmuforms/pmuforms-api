import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { UsersService } from './users.service';
import { GetUser, Roles } from 'src/auth/decorator';
import { UserRole } from 'src/enums';
import { UserDocument } from 'src/database/schema';
import {
  UpdateSignatureUrlDto,
  UpdateBusinessNameDto,
  UpdateFcmTokenDto,
} from './dto';

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

  @Roles(UserRole.ARTIST)
  @Patch('/update-fcm-token')
  async updateFcmtoken(
    @GetUser() artist: UserDocument,
    @Body() dto: UpdateFcmTokenDto,
  ) {
    const artistDoc = await this.usersService.updateFcmToken(
      artist.userId,
      dto.fcmToken,
    );

    return { artist: artistDoc };
  }

  @Get('/:artistId')
  async getAnArtist(@Param('artistId') artistId: string) {
    const artist = await this.usersService.getAnArtist(artistId);

    return { artist };
  }

  @Get(':artistId/url')
  async getArtistUrls(@Param('artistId') artistId: string) {
    const urls = await this.usersService.getArtistShortUrl(artistId);

    return { urls };
  }

  @Roles(UserRole.ARTIST)
  @Patch('/update-artist-signature')
  async updateArtistSignature(
    @GetUser() artist: UserDocument,
    @Body() dto: UpdateSignatureUrlDto,
  ) {
    const artistDoc = await this.usersService.updateArtistSignatureUrl(
      artist.userId,
      dto.signature_url,
    );

    return { artist: artistDoc };
  }
}
