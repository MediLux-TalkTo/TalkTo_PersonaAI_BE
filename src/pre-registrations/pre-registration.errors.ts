import { ConflictException } from '@nestjs/common';

export function preRegistrationAlreadyExists(): ConflictException {
  return new ConflictException({
    code: 'pre_registration_already_exists',
    message: 'A pre-registration already exists for this contact.',
  });
}
