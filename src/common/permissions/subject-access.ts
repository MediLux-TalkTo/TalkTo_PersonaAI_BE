import { ForbiddenException } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export interface SubjectAccessActor {
  readonly userId: string;
  readonly role: Role;
}

export interface OwnedSubject {
  readonly ownerUserId: string;
}

export function canAccessSubject(
  actor: SubjectAccessActor,
  subject: OwnedSubject,
): boolean {
  return (
    actor.userId === subject.ownerUserId || isSubjectPrivilegedRole(actor.role)
  );
}

export function assertSubjectAccess(
  actor: SubjectAccessActor,
  subject: OwnedSubject,
): void {
  if (canAccessSubject(actor, subject)) {
    return;
  }

  throw new ForbiddenException({
    error: 'subject_forbidden',
    message: 'You do not have permission to access this subject.',
  });
}

export function isSubjectPrivilegedRole(role: Role): boolean {
  return isAdminRole(role) || isOpsRole(role);
}

export function isAdminRole(role: Role): boolean {
  return role === Role.ADMIN;
}

export function isOpsRole(role: Role): boolean {
  return role === Role.OPS;
}

export function isAiQaRole(role: Role): boolean {
  return role === Role.AI_QA;
}

export function isFamilyScopedRole(role: Role): boolean {
  return role === Role.FAMILY;
}
