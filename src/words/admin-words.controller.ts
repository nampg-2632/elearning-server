import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Paginated } from '../common/dto/paginated-response';
import { UserRole } from '../common/enums/user-role.enum';
import { SWAGGER_BEARER_AUTH } from '../config/swagger';
import { AdminWordsService } from './admin-words.service';
import {
  AdminWordDetailDto,
  AdminWordDto,
  AdminWordPageDto,
} from './dto/admin-word.dto';
import { CreateWordDto } from './dto/create-word.dto';
import { ListAdminWordsQueryDto } from './dto/list-admin-words-query.dto';
import { UpdateWordDto } from './dto/update-word.dto';

@ApiTags('Admin – Words')
@ApiBearerAuth(SWAGGER_BEARER_AUTH)
@Roles(UserRole.Admin)
@Controller('admin/words')
export class AdminWordsController {
  constructor(private readonly wordsService: AdminWordsService) {}

  // Also the word picker on the lesson form.
  @Get()
  @ApiOkResponse({ type: AdminWordPageDto })
  list(
    @Query() query: ListAdminWordsQueryDto,
  ): Promise<Paginated<AdminWordDto>> {
    return this.wordsService.list(query);
  }

  @Post()
  @ApiCreatedResponse({ type: AdminWordDetailDto })
  create(@Body() dto: CreateWordDto): Promise<AdminWordDetailDto> {
    return this.wordsService.create(dto);
  }

  @Get(':wordId')
  @ApiOkResponse({ type: AdminWordDetailDto })
  findOne(
    @Param('wordId', ParseUUIDPipe) wordId: string,
  ): Promise<AdminWordDetailDto> {
    return this.wordsService.findOne(wordId);
  }

  @Patch(':wordId')
  @ApiOkResponse({ type: AdminWordDetailDto })
  update(
    @Param('wordId', ParseUUIDPipe) wordId: string,
    @Body() dto: UpdateWordDto,
  ): Promise<AdminWordDetailDto> {
    return this.wordsService.update(wordId, dto);
  }

  @Delete(':wordId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(@Param('wordId', ParseUUIDPipe) wordId: string): Promise<void> {
    return this.wordsService.remove(wordId);
  }
}
