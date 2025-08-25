import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseServicesPipe implements PipeTransform {
  transform(value: string): number[] {
    if (!value) {
      return [];
    }

    // Split by comma, trim spaces
    const parts = value.split(',').map((v) => v.trim());

    // Convert to numbers and validate
    const numbers = parts.map((part) => {
      const num = Number(part);
      if (isNaN(num)) {
        throw new BadRequestException(
          `Invalid value "${part}" in services query parameter. Must be a number.`,
        );
      }
      return num;
    });

    return numbers;
  }
}
