import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomerDocument, UserDocument } from 'src/database/schema';
import { UserRole } from 'src/enums';
import { GetCurrentUserRole, GetUser, Roles } from 'src/auth/decorator';
import {
  CreateCustomerDto,
  CreateCustomerNoteDto,
  EditCustomerNoteDto,
  GetMyCustomersQueryParamsDto,
  SearchMyCustomersQueryParamsDto,
  UpdateCustomerPersonalDetailsDto,
  UpdatePersonalDetailsDto,
} from './dto';
import { UpdateSignatureUrlDto } from '../users/dto';

@Controller('api/customers')
export class CustomersController {
  constructor(private customerService: CustomersService) {}

  @Roles(UserRole.ARTIST, UserRole.CUSTOMER)
  @Get('/my-customers')
  async getMyCustomers(
    @GetUser() user: UserDocument | CustomerDocument,
    @GetCurrentUserRole() userRole: UserRole,
    @Query() options: GetMyCustomersQueryParamsDto,
  ) {
    // userId- pk in artist collection
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const userId: string = UserRole.ARTIST === userRole ? user.userId : user.id;
    const { metadata, customers } =
      await this.customerService.getArtistCustomers(userId, options);

    return { metadata, customers };
  }

  @Roles(UserRole.ARTIST, UserRole.CUSTOMER)
  @Get('/my-customers/search')
  async searchMyCustomers(
    @GetUser() user: UserDocument | CustomerDocument,
    @GetCurrentUserRole() userRole: UserRole,
    @Query() query: SearchMyCustomersQueryParamsDto,
  ) {
    // userId- pk in artist collection
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const userId: string = UserRole.ARTIST === userRole ? user.userId : user.id;
    const { metadata, customers } =
      await this.customerService.searchMyCustomers(userId, query);

    return { metadata, customers };
  }

  @Roles(UserRole.CUSTOMER)
  @Post('/my-customers/create-customer')
  async createCustomer(
    @GetUser() customerArtist: CustomerDocument,
    @Body() dto: CreateCustomerDto,
  ) {
    const customer = await this.customerService.createCustomer(
      customerArtist.id,
      dto,
    );

    return { customer };
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
    const note = await this.customerService.createCustomerNote(
      artist.userId,
      customerId,
      dto,
    );

    return { note };
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

  @Roles(UserRole.ARTIST)
  @Patch('/my-customers/:customerId/update-signature')
  async updateCustomerSignature(
    @GetUser() artist: UserDocument,
    @Param('customerId') customerId: string,
    @Body() dto: UpdateSignatureUrlDto,
  ) {
    const customerDoc = await this.customerService.updateCustomerSignatureUrl(
      artist.userId,
      customerId,
      dto.signature_url,
    );

    return { customer: customerDoc };
  }

  @Roles(UserRole.CUSTOMER)
  @Patch('/personal-details')
  async updatePersonalDetails(
    @GetUser() authCustomer: CustomerDocument,
    @Body() personalDetailsDto: UpdatePersonalDetailsDto,
  ) {
    const customer = await this.customerService.updatePersonalDetails(
      authCustomer.id,
      personalDetailsDto,
    );
    return { customer };
  }

  @Roles(UserRole.ARTIST)
  @Patch('/my-customers/:customerId/personal-details')
  async updateCustomerPersonalDetails(
    @GetUser() artist: UserDocument,
    @Param('customerId') customerId: string,
    @Body() personalDetailsDto: UpdateCustomerPersonalDetailsDto,
  ) {
    console.log(artist.userId,customerId);
    const customer = await this.customerService.updateCustomerPersonalDetails(
      artist.userId,
      customerId,
      personalDetailsDto,
    );
    return { customer };
  }
}
