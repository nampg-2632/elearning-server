import { WordSort } from './enums/word-sort.enum';

// Matches words.content.
export const WORD_CONTENT_MAX_LENGTH = 255;

// Matches words.content; meaning is text, so no tighter limit applies.
export const WORD_KEYWORD_MAX_LENGTH = WORD_CONTENT_MAX_LENGTH;

// Case-insensitive content order. The `|| ''` keeps Postgres off
// idx_words_content_lower: walking that index with LIMIT reads the whole
// words table when the user's scope is small (4s at 1M words vs 0.2ms).
const CONTENT_ORDER = "LOWER(word.content) || ''";

// Query builder ORDER BY for each `sort` value of GET /words and
// GET /admin/words.
export const WORD_SORT_ORDER: Record<
  WordSort,
  [column: string, direction: 'ASC' | 'DESC']
> = {
  [WordSort.ContentAsc]: [CONTENT_ORDER, 'ASC'],
  [WordSort.ContentDesc]: [CONTENT_ORDER, 'DESC'],
  [WordSort.CreatedAtAsc]: ['word.createdAt', 'ASC'],
  [WordSort.CreatedAtDesc]: ['word.createdAt', 'DESC'],
};
