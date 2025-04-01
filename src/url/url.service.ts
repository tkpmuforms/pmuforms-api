import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Model } from 'mongoose';
import { AppConfigService } from 'src/config/config.service';
import { UrlDocument } from 'src/database/schema';

type BitLyShortenUrlResponse = {
  references: { [k: string]: any };
  link: string;
  id: string;
  long_url: string;
  archived: boolean;
  created_at: string;
  custom_bitlinks: string[];
  tags: string[];
  deeplinks: [
    {
      guid: string;
      bitlink: string;
      app_uri_path: string;
      install_url: string;
      app_guid: string;
      os: string;
      install_type: string;
      created: string;
      modified: string;
      brand_guid: string;
    },
  ];
};

@Injectable()
export class UrlService {
  constructor(
    @InjectModel('urls')
    private urlModel: Model<UrlDocument>,
    private config: AppConfigService,
  ) {}

  private bitlyAxiosInstance() {
    const url = this.config.get('BITLY_BASE_URL');
    const token = this.config.get('BITLY_TOKEN');

    return axios.create({
      baseURL: url,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  private async generateShortUrlWithBitly(longUrl: string) {
    try {
      const res = await this.bitlyAxiosInstance().post<BitLyShortenUrlResponse>(
        '/v4/shorten',
        {
          long_url: longUrl,
        },
      );
      return res.data.link;
    } catch (error: any) {
      console.error({ error });
      throw new InternalServerErrorException('Unable to generate short url');
    }
  }

  async generateShortUrl(longUrl: string) {
    try {
      const doc = await this.urlModel.findOne({ url: longUrl.trim() });

      if (doc) {
        let shortUrl: string;

        if (!doc?.shortUrl) {
          shortUrl = await this.generateShortUrlWithBitly(longUrl);
          await this.urlModel.updateOne({ url: doc.url }, {
            shortUrl,
          });
        }
        
        return { shortUrl: shortUrl || doc.shortUrl, longUrl: doc.url };
      }
      return { shortUrl: "", longUrl: "" }
    } catch (error) {
      throw new InternalServerErrorException('Unable to return business urls');
    }
  }
}
