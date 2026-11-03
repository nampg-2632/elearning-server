import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsUUID, ValidateNested } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class SubmitAnswerDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: i18nValidationMessage('validation.IS_UUID') })
  questionId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: i18nValidationMessage('validation.IS_UUID') })
  optionId: string;
}

export class SubmitAttemptDto {
  // Questions left out are blank and count as wrong.
  @ApiProperty({ type: [SubmitAnswerDto] })
  @IsArray({ message: i18nValidationMessage('validation.IS_ARRAY') })
  @ArrayUnique((answer?: SubmitAnswerDto) => answer?.questionId, {
    message: i18nValidationMessage('validation.ARRAY_UNIQUE'),
  })
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers: SubmitAnswerDto[];
}
