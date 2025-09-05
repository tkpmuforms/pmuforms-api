import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Custom validator to check if date is in the future
@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(dateString: string) {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date.getTime() > Date.now();
  }

  defaultMessage() {
    return 'sendAt must be a valid ISO date string in the future';
  }
}
