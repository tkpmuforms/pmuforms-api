import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CustomerDocument } from 'src/database/schema';
@Injectable()
export class CustomerService {
  constructor(
    @InjectModel('Customer') private customerModel: Model<CustomerDocument>,
  ) {}
}
