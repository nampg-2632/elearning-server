import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Paginated } from '../common/dto/paginated-response';
import { SWAGGER_BEARER_AUTH } from '../config/swagger';
import { User } from '../users/entities/user.entity';
import { ListWordsQueryDto } from './dto/list-words-query.dto';
import { WordDto, WordPageDto } from './dto/word.dto';
import { WordsService } from './words.service';

@ApiTags('Words')
@ApiBearerAuth(SWAGGER_BEARER_AUTH)
@Controller('words')
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  // Words of lessons in the user's approved courses.
  @Get()
  @ApiOkResponse({ type: WordPageDto })
  list(
    @Query() query: ListWordsQueryDto,
    @CurrentUser() user: User,
  ): Promise<Paginated<WordDto>> {
    return this.wordsService.list(user, query);
  }
}
