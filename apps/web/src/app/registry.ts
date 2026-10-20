import { lazy } from 'react';

export const toolPages = {
  'json-formatter': lazy(() => import('../tools/json-formatter/page')),
  'text-diff': lazy(() => import('../tools/text-diff/page')),
  'json-lines': lazy(() => import('../tools/json-lines/page')),
  'text-codec': lazy(() => import('../tools/text-codec/page')),
  'image-editor': lazy(() => import('../tools/image-editor/page')),
  'video-editor': lazy(() => import('../tools/video-editor/page')),
  'audio-editor': lazy(() => import('../tools/audio-editor/page')),
  'media-library': lazy(() => import('../platform/media-jobs')),
  'video-concat': lazy(() => import('../tools/video-concat/page')),
  'speech-transcriber': lazy(() => import('../tools/speech-transcriber/page')),
  'subtitle-speaker': lazy(() => import('../tools/subtitle-speaker/page')),
};
