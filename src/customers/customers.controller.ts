import { Controller, Get, Query } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { UserDocument } from 'src/database/schema';
import { UserRole } from 'src/enums';
import { GetUser, Roles } from 'src/auth/decorator';
import { GetMyCustomersQueryParamsDto } from './dto';

@Controller('api/customers')
export class CustomersController {
  constructor(private customerService: CustomersService) {}

  @Roles(UserRole.ARTIST)
  @Get('/my-customers')
  async getMyCustomers(
    @GetUser() artist: UserDocument,
    @Query() options: GetMyCustomersQueryParamsDto,
  ) {
    const { metadata, customers } =
      await this.customerService.getArtistCustomers(artist.userId, options);

    return { metadata, customers };
  }
}
