import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminWordsController } from './admin-words.controller';
import { AdminWordsService } from './admin-words.service';
import { LessonWord } from './entities/lesson-word.entity';
import { Word } from './entities/word.entity';
import { WordsController } from './words.controller';
import { WordsService } from './words.service';

@Module({
  imports: [TypeOrmModule.forFeature([Word, LessonWord])],
  controllers: [AdminWordsController, WordsController],
  providers: [WordsService, AdminWordsService],
  exports: [TypeOrmModule],
})
export class WordsModule {}
