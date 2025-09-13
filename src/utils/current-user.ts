import 'server-only';

import { cache } from 'react';

import { getUserFromSession } from './session';

export const getCurrentUser = cache(getUserFromSession);
