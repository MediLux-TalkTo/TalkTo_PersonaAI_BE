import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../notification.constants';

export class NotificationDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: Object.values(NotificationType) })
  type: NotificationType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  body: string;

  @ApiPropertyOptional({ nullable: true })
  resourceType: string | null;

  @ApiPropertyOptional({ nullable: true })
  resourceId: string | null;

  @ApiPropertyOptional({ nullable: true })
  subjectId: string | null;

  @ApiPropertyOptional({ nullable: true })
  recordingId: string | null;

  @ApiProperty()
  payload: Record<string, unknown>;

  @ApiPropertyOptional({ nullable: true })
  readAt: string | null;

  @ApiProperty()
  createdAt: string;
}

export class NotificationsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [NotificationDto] })
  data: NotificationDto[];
}

export class NotificationResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: NotificationDto })
  data: NotificationDto;
}
