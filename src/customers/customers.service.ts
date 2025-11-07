import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Model, RootFilterQuery, PipelineStage } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {
  AppointmentDocument,
  CustomerDocument,
  FilledFormDocument,
  RelationshipDocument,
  UserDocument,
} from 'src/database/schema';
import { paginationMetaGenerator } from 'src/utils';
import {
  CreateCustomerDto,
  CreateCustomerNoteDto,
  EditCustomerNoteDto,
  GetMyCustomersQueryParamsDto,
  SearchMyCustomersQueryParamsDto,
  UpdateCustomerPersonalDetailsDto,
  UpdatePersonalDetailsDto,
} from './dto';
import { randomUUID } from 'node:crypto';
import { FirebaseService } from 'src/firebase/firebase.service';
import { FilledFormStatus } from 'src/enums';
import { UserRecord } from 'firebase-admin/auth';

@Injectable()
export class CustomersService {
  constructor(
    private firebaseService: FirebaseService,
    @InjectModel('relationships')
    private relationshipModel: Model<RelationshipDocument>,
    @InjectModel('users')
    private userModel: Model<UserDocument>,
    @InjectModel('customers')
    private customerModel: Model<CustomerDocument>,
    @InjectModel('appointments')
    private appointmentModel: Model<AppointmentDocument>,
    @InjectModel('filled-forms')
    private filledFormModel: Model<FilledFormDocument>,
  ) {}

  private async checkRelationship({
    artistId,
    customerId,
  }: {
    artistId: string;
    customerId: string;
  }) {
    const relationship = await this.relationshipModel.findOne({
      artistId,
      customerId,
    });

    if (!relationship) {
      throw new ForbiddenException(
        `there is no relationship between customer ${customerId}`,
      );
    }
  }

  async getArtistCustomers(
    artistId: string,
    options: GetMyCustomersQueryParamsDto,
  ) {
    const queryObject: RootFilterQuery<RelationshipDocument> = { artistId };

    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const docCount = await this.relationshipModel.countDocuments(queryObject);

    const metadata = paginationMetaGenerator(docCount, page, limit);

    const customers = await this.relationshipModel
      .find(queryObject)
      .populate('customer', '-notes')
      .skip(skip)
      .limit(limit);

    const sortedCustomers = customers.sort((a, b) =>
      a.customer?.info?.client_name.localeCompare(
        b.customer?.info?.client_name,
      ),
    );

    return { metadata, customers: sortedCustomers };
  }

  async getCustomer(artistId: string, customerId: string) {
    const relationship = await this.relationshipModel
      .findOne({
        customerId,
        artistId,
      })
      .populate('customer', '-notes');

    if (!relationship) {
      throw new ForbiddenException(
        `artist with id ${artistId} and customer with id ${customerId} have no relationship`,
      );
    }

    return relationship.customer;
  }

  async deleteCustomer(artistId: string, customerId: string) {
    const relationship = await this.relationshipModel.findOne({
      artistId,
      customerId,
    });

    if (!relationship) {
      throw new NotFoundException(
        `there is no relationship between customer ${customerId} and artist ${artistId}`,
      );
    }

    await relationship.deleteOne();

    // check if customer has appointments
    const numOfCustomerAppointments =
      await this.appointmentModel.countDocuments({ customerId });

    if (numOfCustomerAppointments > 0) {
      throw new BadRequestException(
        `customer has ${numOfCustomerAppointments} appointments, cannot delete customer`,
      );
    }

    await this.customerModel.deleteOne({ customerId });
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(customerId)) {
      await this.firebaseService.deleteUser(customerId);
    }
  }

  async getCustomerNotes(artistId: string, customerId: string) {
    await this.checkRelationship({ artistId, customerId });
    const customer = await this.customerModel.findOne({ id: customerId });

    const artistsNotesForCustomer = customer.notes?.filter((note) => {
      return note.artistId === artistId;
    });

    return artistsNotesForCustomer ?? [];
  }

  async createCustomerNote(
    artistId: string,
    customerId: string,
    dto: CreateCustomerNoteDto,
  ) {
    await this.checkRelationship({ artistId, customerId });

    const customer = await this.customerModel.findOne({ id: customerId });

    if (!customer) {
      throw new NotFoundException(`customer with id ${customerId} not found`);
    }

    const newNote = {
      id: randomUUID(),
      imageUrl: dto?.imageUrl || undefined,
      date: new Date(),
      note: dto?.note || '',
      artistId,
    };

    if (!newNote.note && !newNote.imageUrl) {
      return newNote;
    }

    const existingNotes = customer.notes ?? [];

    customer.notes = [newNote, ...existingNotes];

    await customer.save();

    return newNote;
  }

  async editCustomerNote(
    artistId: string,
    customerId: string,
    noteId: string,
    dto: EditCustomerNoteDto,
  ) {
    if (!dto?.imageUrl && !dto?.note) {
      throw new ForbiddenException(`there is no note content to update`);
    }

    await this.checkRelationship({ artistId, customerId });

    const customer = await this.customerModel.findOne({ id: customerId });

    const noteIndex = customer.notes.findIndex((note) => note.id === noteId);

    if (noteIndex === -1) {
      throw new NotFoundException(`customer note with id ${noteId} not found`);
    }

    if (customer.notes[noteIndex].artistId !== artistId) {
      throw new ForbiddenException(`you are not authorized to edit this note`);
    }

    if (dto?.imageUrl) {
      customer.notes[noteIndex].imageUrl = dto.imageUrl;
    }

    if (dto?.note) {
      customer.notes[noteIndex].note = dto.note;
    }

    customer.notes[noteIndex].date = new Date();

    await customer.save();

    return customer.notes[noteIndex];
  }

  async deleteCustomerNote(
    artistId: string,
    customerId: string,
    noteId: string,
  ) {
    const relationship = await this.relationshipModel.findOne({
      artistId,
      customerId,
    });

    if (!relationship) {
      throw new ForbiddenException(
        `there is no relationship between you and customer ${customerId}`,
      );
    }

    const customer = await this.customerModel.findOne({ id: customerId });

    const noteIndex = customer.notes.findIndex((note) => note.id === noteId);

    if (noteIndex === -1) {
      throw new NotFoundException(`customer note with id ${noteId} not found`);
    }

    if (customer.notes[noteIndex].artistId !== artistId) {
      throw new ForbiddenException(`you are not authorized to edit this note`);
    }

    const deletedNote = customer.notes.splice(noteIndex, 1);

    await customer.save();

    return deletedNote;
  }

  async searchMyCustomers(
    artistId: string,
    params: SearchMyCustomersQueryParamsDto,
  ) {
    const { page = 1, limit = 10, name } = params;
    const skip = (page - 1) * limit;

    const pipeline: PipelineStage[] = [
      {
        $match: {
          artistId,
        },
      },
      {
        $lookup: {
          from: 'customers',
          localField: 'customerId',
          foreignField: 'id',
          as: 'customer',
        },
      },
      {
        $unwind: {
          path: '$customer',
          includeArrayIndex: '0',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $facet: {
          data: [
            {
              $skip: skip,
            },
            {
              $limit: Number(limit),
            },
            {
              $replaceRoot: {
                newRoot: '$customer',
              },
            },
          ],
          aggregation: [
            {
              $count: 'count',
            },
          ],
        },
      },
    ];

    if (name) {
      const matchNameStage = {
        $match: {
          $or: [
            { 'customer.info.client_name': { $regex: name, $options: 'i' } },
            { 'customer.email': { $regex: name, $options: 'i' } },
            { 'customer.info.cell_phone': { $regex: name, $options: 'i' } },
          ],
        },
      };
      pipeline.splice(3, 0, matchNameStage);
    }

    const result = await this.relationshipModel.aggregate(pipeline);
    const docCount = result[0].aggregation[0]?.count || 0;
    const customers: any[] = result[0].data;
    const metadata = paginationMetaGenerator(docCount, page, limit);

    const sortedCustomers = customers.length
      ? customers.sort((a, b) =>
          a?.customer?.name.localeCompare(b?.customer?.name),
        )
      : [];

    return { metadata, customers: sortedCustomers };
  }

  async updatePersonalDetails(
    customerId: string,
    personalDetails: UpdatePersonalDetailsDto,
  ) {
    const customer = await this.customerModel.findOne({ id: customerId });

    if (!customer) {
      throw new NotFoundException(`customer with id ${customerId} not found`);
    }

    //update the details
    const name = `${personalDetails.firstName} ${personalDetails.lastName}`;
    const updateCustomerData = {
      name,
      info: {
        client_name: name,
        date_of_birth: personalDetails.dob.toISOString(),
        home_address: personalDetails.homeAddress,
        cell_phone: personalDetails.primaryPhone,
        referred: personalDetails.referralSource,
        emergency_contact_name: personalDetails.emergencyContactName,
        emergency_contact_phone: personalDetails.emergencyContactPhone,
        avatar_url: personalDetails.avatarUrl,
      },
    };

    const updatedCustomer = await this.customerModel.findOneAndUpdate(
      { id: customerId },
      updateCustomerData,
    );

    return updatedCustomer;
  }

  async updateCustomerPersonalDetails(
    artistId: string,
    customerId: string,
    personalDetails: UpdateCustomerPersonalDetailsDto,
  ) {
    const relationship = await this.relationshipModel.findOne({
      artistId,
      customerId,
    });

    if (!relationship) {
      throw new ForbiddenException(
        'there is no relationship between customer and artist',
      );
    }

    const customer = await this.customerModel.findOne({ id: customerId });

    //update the details
    const name = personalDetails.name;
    customer.name = name;
    customer.info.client_name = name;

    if (personalDetails.primaryPhone)
      customer.info.cell_phone = personalDetails.primaryPhone;

    if (personalDetails.email) {
      customer.email = personalDetails.email;
      const uuidRegex =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      if (!uuidRegex.test(customerId)) {
        await this.firebaseService.updateEmail(
          customer.id,
          personalDetails.email,
        );
      }
    }

    await customer.save();

    return customer;
  }

  async updateCustomerSignatureUrl(
    artistId: string,
    customerId: string,
    url: string,
  ) {
    const relationship = await this.relationshipModel.findOne({
      artistId,
      customerId,
    });

    if (!relationship) {
      throw new ForbiddenException(
        'there is no relationship between customer and artist',
      );
    }

    const customer = await this.customerModel.findOne({ id: customerId });

    if (!customer) {
      throw new NotFoundException(`customer with id ${customerId} not found`);
    }

    customer.signature_url = url;
    await customer.save();

    delete customer.notes;

    return customer;
  }

  async createCustomer(artistId: string, dto: CreateCustomerDto) {
    let firebaseUser: UserRecord | undefined;
    if (dto.email) {
      firebaseUser = await this.firebaseService.getUserByEmail(
        dto.email.toLowerCase(),
      );
      if (!firebaseUser) {
        console.log(`\nfirebase user does not exist. creating user....`);
        firebaseUser = await this.firebaseService.createUser({
          email: dto.email.toLowerCase(),
          displayName: dto.name,
        });
      }
    }

    let customer = await this.customerModel.findOne({
      id: firebaseUser.uid ?? undefined,
      email: dto?.email,
    });

    const customerId = customer?.id ?? firebaseUser?.uid ?? randomUUID();

    if (!customer) {
      customer = await this.customerModel.create({
        id: customerId,
        email: dto?.email ?? undefined,
        name: dto.name,
        info: { client_name: dto.name, cell_phone: dto?.phone ?? undefined },
      });
    }

    await this.relationshipModel.findOneAndUpdate(
      { artistId, customerId: customer.id },
      { artistId, customerId: customer.id },
      { upsert: true },
    );
    return customer;
  }

  async getCustomerMetrics(artistId: string, customerId: string) {
    await this.checkRelationship({ artistId, customerId });

    const totalApppointmentsPromise = this.appointmentModel.countDocuments({
      artistId,
      customerId,
    });

    const pendingFilledForms: PipelineStage[] = [
      {
        $lookup: {
          from: 'appointments',
          localField: 'appointmentId',
          foreignField: 'id',
          as: 'appointment',
        },
      },
      {
        $unwind: {
          path: '$appointment',
          includeArrayIndex: '0',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $project: {
          id: 1,
          status: 1,
          clientId: 1,
          appointmentId: 1,
          appointment: 1,
        },
      },
      {
        $match: {
          'appointment.artistId': artistId,
          clientId: customerId,
          status: FilledFormStatus.INCOMPLETE,
        },
      },

      {
        $facet: {
          aggregation: [
            {
              $count: 'count',
            },
          ],
        },
      },
    ];

    const pendingFilledFormsPromise =
      this.filledFormModel.aggregate(pendingFilledForms);

    const [totalAppointments, pendingFormsAgg] = await Promise.all([
      totalApppointmentsPromise,
      pendingFilledFormsPromise,
    ]);

    const pendingForms = pendingFormsAgg?.[0]?.aggregation?.[0]?.count || 0;

    return { totalAppointments, pendingForms };
  }
}
