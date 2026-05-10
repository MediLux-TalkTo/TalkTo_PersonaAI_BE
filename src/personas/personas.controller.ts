import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { success } from '../common/utils/api-response';
import { UpdatePersonaDto } from './dto/update-persona.dto';
import { PersonaResponseDto } from './dto/persona-response.dto';
import { PersonasService } from './personas.service';

@ApiTags('Persona')
@Controller()
export class PersonasController {
  constructor(private readonly personasService: PersonasService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('personas/active')
  @ApiOperation({
    summary: '활성 페르소나 조회',
    description: '대화 시작 전 프론트가 표시할 현재 활성 페르소나 정보를 반환합니다.',
  })
  @ApiOkResponse({ type: PersonaResponseDto })
  async getActive() {
    const persona = await this.personasService.getActivePersona();
    return success(persona);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/personas/:personaId')
  @ApiOperation({
    summary: '페르소나 메타데이터 수정',
    description: '관리자 전용. 프론트 관리자 화면에서 페르소나 속성을 수정할 때 사용합니다.',
  })
  @ApiBody({ type: UpdatePersonaDto })
  @ApiOkResponse({ type: PersonaResponseDto })
  async update(@Param('personaId') personaId: string, @Body() dto: UpdatePersonaDto) {
    const persona = await this.personasService.updatePersona(personaId, dto);
    return success(persona);
  }
}
