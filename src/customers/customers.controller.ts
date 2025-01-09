import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { UserDocument } from 'src/database/schema';
import { UserRole } from 'src/enums';
import { GetUser, Roles } from 'src/auth/decorator';
import {
  CreateCustomerNoteDto,
  EditCustomerNoteDto,
  GetMyCustomersQueryParamsDto,
  SearchMyCustomersQueryParamsDto,
} from './dto';

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

  @Roles(UserRole.ARTIST)
  @Get('/my-customers/search')
  async searchMyCustomers(
    @GetUser() artist: UserDocument,
    @Query() query: SearchMyCustomersQueryParamsDto,
  ) {
    const { metadata, customers } =
      await this.customerService.searchMyCustomers(artist.userId, query);

    return { metadata, customers };
  }

  @Roles(UserRole.ARTIST)
  @Get('/my-customers/:customerId')
  async getCustomer(
    @GetUser() artist: UserDocument,
    @Param('customerId') customerId: string,
  ) {
    const customer = await this.customerService.getCustomer(
      artist.userId,
      customerId,
    );

    return { customer };
  }

  @Roles(UserRole.ARTIST)
  @Delete('my-customers/:customerId')
  async deleteCustomer(
    @GetUser() artist: UserDocument,
    @Param('customerId') customerId: string,
  ) {
    await this.customerService.deleteCustomer(artist.userId, customerId);

    return { message: `Customer Deleted Successfully` };
  }

  @Roles(UserRole.ARTIST)
  @Get('/my-customers/:customerId/notes')
  async getCustomerNotes(
    @GetUser() artist: UserDocument,
    @Param('customerId') customerId: string,
  ) {
    const notes = await this.customerService.getCustomerNotes(
      artist.userId,
      customerId,
    );

    return { notes };
  }

  @Roles(UserRole.ARTIST)
  @Post('/my-customers/:customerId/notes')
  async createCustomerNote(
    @GetUser() artist: UserDocument,
    @Param('customerId') customerId: string,
    @Body() dto: CreateCustomerNoteDto,
  ) {
    const notes = await this.customerService.createCustomerNote(
      artist.userId,
      customerId,
      dto,
    );

    return { notes };
  }

  @Roles(UserRole.ARTIST)
  @Put('/my-customers/:customerId/notes/:noteId')
  async editCustomerNote(
    @GetUser() artist: UserDocument,
    @Param('customerId') customerId: string,
    @Param('noteId') noteId: string,
    @Body() dto: EditCustomerNoteDto,
  ) {
    const notes = await this.customerService.editCustomerNote(
      artist.userId,
      customerId,
      noteId,
      dto,
    );

    return { notes };
  }

  @Roles(UserRole.ARTIST)
  @Delete('/my-customers/:customerId/notes/:noteId')
  async deleteCustomerNote(
    @GetUser() artist: UserDocument,
    @Param('customerId') customerId: string,
    @Param('noteId') noteId: string,
  ) {
    const notes = await this.customerService.deleteCustomerNote(
      artist.userId,
      customerId,
      noteId,
    );

    return { message: 'Note deleted successfully', notes };
  }
}
