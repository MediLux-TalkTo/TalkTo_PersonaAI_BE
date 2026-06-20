import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsUUID()
  targetRecordingId?: string;
}
