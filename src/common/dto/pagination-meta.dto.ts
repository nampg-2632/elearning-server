import { ApiProperty } from '@nestjs/swagger';
import type { PaginationMeta } from './paginated-response';

// Swagger shape of PaginationMeta, used by the *PageDto response classes.
export class PaginationMetaDto implements PaginationMeta {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 57 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}
