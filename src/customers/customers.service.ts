import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Model, RootFilterQuery } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CustomerDocument, RelationshipDocument } from 'src/database/schema';
import { paginationMetaGenerator } from 'src/utils';
import {
  CreateCustomerNoteDto,
  EditCustomerNoteDto,
  GetMyCustomersQueryParamsDto,
  SearchMyCustomersQueryParamsDto,
} from './dto';
import { randomUUID } from 'node:crypto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel('relationships')
    private relationshipModel: Model<RelationshipDocument>,
    @InjectModel('customers')
    private customerModel: Model<CustomerDocument>,
  ) {}

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
      .populate('customer')
      .skip(skip)
      .limit(limit);

    return { metadata, customers };
  }

  async getCustomer(artistId: string, customerId: string) {
    const relationship = await this.relationshipModel
      .findOne({
        customerId,
        artistId,
      })
      .populate('customer');

    if (!relationship) {
      throw new ForbiddenException(
        `artist with id ${artistId} and customer with id ${customerId} have no relationship`,
      );
    }

    console.log({ customer: relationship.customer });
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
    // delete the relationship between artist and customer
    await relationship.deleteOne();
  }

  async getCustomerNotes(artistId: string, customerId: string) {
    const relationship = await this.relationshipModel.findOne({
      artistId,
      customerId,
    });

    if (!relationship) {
      throw new ForbiddenException(
        `there is no relationship between customer ${customerId}`,
      );
    }
    const customer = await this.customerModel.findOne({ id: customerId });

    return customer.notes ?? [];
  }

  async createCustomerNote(
    artistId: string,
    customerId: string,
    dto: CreateCustomerNoteDto,
  ) {
    const relationship = await this.relationshipModel.findOne({
      artistId,
      customerId,
    });

    if (!relationship) {
      throw new ForbiddenException(
        `there is no relationship between customer ${customerId}`,
      );
    }

    const customer = await this.customerModel.findOne({ id: customerId });

    if (!customer) {
      throw new NotFoundException(`customer with id ${customerId} not found`);
    }

    const newNote = {
      id: randomUUID(),
      imageUrl: dto.imageUrl,
      date: new Date(),
      note: dto.note,
    };

    const existingNotes = customer.notes ?? [];

    customer.notes = [newNote, ...existingNotes];

    await customer.save();

    return customer.notes;
  }

  async editCustomerNote(
    artistId: string,
    customerId: string,
    noteId: string,
    dto: EditCustomerNoteDto,
  ) {
    const relationship = await this.relationshipModel.findOne({
      artistId,
      customerId,
    });

    if (!relationship) {
      throw new ForbiddenException(
        `there is no relationship between customer ${customerId}`,
      );
    }

    const customer = await this.customerModel.findOne({ id: customerId });

    const noteIndex = customer.notes.findIndex((note) => note.id === noteId);

    if (!noteIndex) {
      throw new NotFoundException(`customer note with id ${noteId} not found`);
    }

    customer.notes[noteIndex].imageUrl = dto.imageUrl;
    customer.notes[noteIndex].note = dto.note;

    await customer.save();

    return customer.notes;
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
        `there is no relationship between customer ${customerId}`,
      );
    }

    const customer = await this.customerModel.findOne({ id: customerId });

    customer.notes = customer.notes.filter((note) => note.id !== noteId);

    await customer.save();

    return customer.notes;
  }

  async searchMyCustomers(
    artistId: string,
    params: SearchMyCustomersQueryParamsDto,
  ) {
    const { page = 1, limit = 10, name } = params;
    const skip = (page - 1) * limit;

    const pipeline = [
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
        $match: {
          'customer.name': {
            $regex: name,
            $options: 'i',
          },
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

    const result = await this.relationshipModel.aggregate(pipeline);
    const docCount = result[0].aggregation[0]?.count || 0;
    const customers: CustomerDocument[] = result[0].data;
    const metadata = paginationMetaGenerator(docCount, page, limit);

    return { metadata, customers };
  }
}
