import * as bcrypt from 'bcryptjs';

export async function hashValue(value: string): Promise<string> {
  return bcrypt.hash(value, 10);
}

export async function compareValue(
  plainValue: string,
  hashedValue?: string | null,
): Promise<boolean> {
  if (!hashedValue) {
    return false;
  }

  return bcrypt.compare(plainValue, hashedValue);
}
