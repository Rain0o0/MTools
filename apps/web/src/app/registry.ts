import { lazy } from 'react';

export const toolPages = {
  'json-formatter': lazy(() => import('../tools/json-formatter/page')),
  'text-diff': lazy(() => import('../tools/text-diff/page')),
  'json-lines': lazy(() => import('../tools/json-lines/page')),
  'text-codec': lazy(() => import('../tools/text-codec/page')),
};
