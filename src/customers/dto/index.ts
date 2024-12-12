import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class GetMyCustomersQueryParamsDto {
  @IsOptional()
  @Type(() => Number) // Ensures the value is cast to a number
  @IsInt({ message: 'Page must be an integer.' })
  @Min(1, { message: 'Page must be at least 1.' })
  page?: number;

  @IsOptional()
  @Type(() => Number) // Ensures the value is cast to a number
  @IsInt({ message: 'Limit must be an integer.' })
  @Min(1, { message: 'Limit must be at least 1.' })
  limit?: number;
}
