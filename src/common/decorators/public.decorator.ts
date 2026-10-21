import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marks a route as reachable without a JWT once the global auth guard is on.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
