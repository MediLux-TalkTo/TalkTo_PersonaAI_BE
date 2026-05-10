import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { success } from '../common/utils/api-response';
import { UpdatePersonaDto } from './dto/update-persona.dto';
import { PersonasService } from './personas.service';

@ApiTags('Persona')
@Controller()
export class PersonasController {
  constructor(private readonly personasService: PersonasService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('personas/active')
  async getActive() {
    const persona = await this.personasService.getActivePersona();
    return success(persona);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/personas/:personaId')
  async update(@Param('personaId') personaId: string, @Body() dto: UpdatePersonaDto) {
    const persona = await this.personasService.updatePersona(personaId, dto);
    return success(persona);
  }
}
