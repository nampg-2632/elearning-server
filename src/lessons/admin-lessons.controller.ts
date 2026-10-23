import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Paginated } from '../common/dto/paginated-response';
import { UserRole } from '../common/enums/user-role.enum';
import { SWAGGER_BEARER_AUTH } from '../config/swagger';
import { ListLessonsQueryDto } from './dto/list-lessons-query.dto';
import {
  LessonSummaryDto,
  LessonSummaryPageDto,
} from './dto/lesson-summary.dto';
import { LessonsService } from './lessons.service';

@ApiTags('Admin – Lessons')
@ApiBearerAuth(SWAGGER_BEARER_AUTH)
@Roles(UserRole.Admin)
@Controller('admin/lessons')
export class AdminLessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  // Compact list for the lesson picker on the course form.
  @Get()
  @ApiOkResponse({ type: LessonSummaryPageDto })
  list(
    @Query() query: ListLessonsQueryDto,
  ): Promise<Paginated<LessonSummaryDto>> {
    return this.lessonsService.listSummaries(query);
  }
}
