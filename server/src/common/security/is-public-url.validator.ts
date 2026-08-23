import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { assertPublicHttpUrl } from './ssrf-guard';

@ValidatorConstraint({ name: 'IsPublicUrl', async: true })
class IsPublicUrlConstraint implements ValidatorConstraintInterface {
  async validate(value: unknown): Promise<boolean> {
    if (typeof value !== 'string') return false;
    try {
      await assertPublicHttpUrl(value);
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a public http(s) URL, not a private/internal address`;
  }
}

/** Rejects URLs that point at private/loopback/link-local addresses (SSRF guard). */
export function IsPublicUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPublicUrlConstraint,
    });
  };
}
