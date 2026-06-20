import { Role } from '../enums/role.enum';
import {
  assertSubjectAccess,
  canAccessSubject,
  isAdminRole,
  isAiQaRole,
  isFamilyScopedRole,
  isOpsRole,
  isSubjectPrivilegedRole,
} from './subject-access';

describe('subject access helpers', () => {
  it('classifies current v1 roles through explicit helpers', () => {
    expect(isFamilyScopedRole(Role.FAMILY)).toBe(true);
    expect(isFamilyScopedRole(Role.ADMIN)).toBe(false);
    expect(isAdminRole(Role.ADMIN)).toBe(true);
    expect(isAdminRole(Role.FAMILY)).toBe(false);
    expect(isOpsRole(Role.OPS)).toBe(true);
    expect(isOpsRole(Role.AI_QA)).toBe(false);
    expect(isAiQaRole(Role.AI_QA)).toBe(true);
    expect(isAiQaRole(Role.OPS)).toBe(false);
  });

  it('allows subject access for owners, admin, and ops but not unrelated family or ai qa users', () => {
    const subject = { ownerUserId: 'owner-id' };

    expect(
      canAccessSubject(
        { userId: 'owner-id', role: Role.FAMILY },
        subject,
      ),
    ).toBe(true);
    expect(
      canAccessSubject(
        { userId: 'admin-id', role: Role.ADMIN },
        subject,
      ),
    ).toBe(true);
    expect(
      canAccessSubject(
        { userId: 'ops-id', role: Role.OPS },
        subject,
      ),
    ).toBe(true);
    expect(
      canAccessSubject(
        { userId: 'family-id', role: Role.FAMILY },
        subject,
      ),
    ).toBe(false);
    expect(
      canAccessSubject(
        { userId: 'ai-qa-id', role: Role.AI_QA },
        subject,
      ),
    ).toBe(false);

    expect(isSubjectPrivilegedRole(Role.ADMIN)).toBe(true);
    expect(isSubjectPrivilegedRole(Role.OPS)).toBe(true);
    expect(isSubjectPrivilegedRole(Role.AI_QA)).toBe(false);
  });

  it('throws a subject-scoped forbidden error for an unrelated family user', () => {
    expect(() =>
      assertSubjectAccess(
        { userId: 'family-id', role: Role.FAMILY },
        { ownerUserId: 'owner-id' },
      ),
    ).toThrow('You do not have permission to access this subject.');
  });
});
