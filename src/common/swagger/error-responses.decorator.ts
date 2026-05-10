import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto';

export function ApiCommonErrorResponses(options?: {
  badRequest?: boolean;
  unauthorized?: boolean;
  forbidden?: boolean;
  notFound?: boolean;
}) {
  const {
    badRequest = true,
    unauthorized = true,
    forbidden = false,
    notFound = false,
  } = options ?? {};

  const decorators: Array<ClassDecorator | MethodDecorator> = [];

  if (badRequest) {
    decorators.push(
      ApiBadRequestResponse({
        type: ErrorResponseDto,
        description: '요청 본문 또는 쿼리 파라미터 검증 실패',
      }),
    );
  }

  if (unauthorized) {
    decorators.push(
      ApiUnauthorizedResponse({
        type: ErrorResponseDto,
        description: '인증 실패 또는 토큰 누락',
      }),
    );
  }

  if (forbidden) {
    decorators.push(
      ApiForbiddenResponse({
        type: ErrorResponseDto,
        description: '권한 부족',
      }),
    );
  }

  if (notFound) {
    decorators.push(
      ApiNotFoundResponse({
        type: ErrorResponseDto,
        description: '리소스를 찾을 수 없음',
      }),
    );
  }

  return applyDecorators(...decorators);
}
