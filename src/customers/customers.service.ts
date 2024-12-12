import { Injectable } from '@nestjs/common';
import { Model, RootFilterQuery } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CustomerDocument, RelationshipDocument } from 'src/database/schema';
import { paginationMetaGenerator } from 'src/utils';
import { GetMyCustomersQueryParamsDto } from './dto';

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

  async createCustomer(artistId: string) {
    const customer = await this.customerModel.create({});

    await this.relationshipModel.findOneAndUpdate(
      { artistId, customerId: customer.id },
      { customerId: customer.id, artistId },
      { upsert: true },
    );

    return customer;
  }
}
