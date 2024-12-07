import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ServicesService } from './services.service';
import { UserRole } from 'src/enums';
import { GetUser, Roles } from 'src/auth/decorator';
import { UpdateServicesDto } from './dto';
import { UserDocument } from 'src/database/schema';

@Controller('api/services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get('/')
  async getAllServices() {
    const services = await this.servicesService.getAllServices();

    return { services };
  }

  @Get('/artist-services/:artistId')
  async getOneArtistsServices(@Param('artistId') artistId: string) {
    const services = await this.servicesService.getOneArtistsServices(artistId);

    return { services };
  }

  @Roles(UserRole.ARTIST)
  @Put('/update-services')
  async updateArtistServices(
    @GetUser() user: UserDocument,
    @Body() dto: UpdateServicesDto,
  ) {
    const artist = await this.servicesService.updateArtistServices(
      user.userId,
      dto.services,
    );
    return { services: artist.services };
  }
}
