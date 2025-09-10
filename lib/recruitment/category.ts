import { JobCategory } from '@/lib/types/enums';

const jpToEnum: Record<string, JobCategory> = {
  'SNS運用': JobCategory.SNS_OPERATION,
  '動画編集': JobCategory.VIDEO_CREATOR,
  'AIライター': JobCategory.AI_WRITER,
  'ライター': JobCategory.AI_WRITER,
  '撮影スタッフ': JobCategory.PHOTOGRAPHY_STAFF,
};

const slugToEnum: Record<string, JobCategory> = {
  'sns': JobCategory.SNS_OPERATION,
  'sns_operation': JobCategory.SNS_OPERATION,
  'video': JobCategory.VIDEO_CREATOR,
  'video_creator': JobCategory.VIDEO_CREATOR,
  'ai-writer': JobCategory.AI_WRITER,
  'ai_writer': JobCategory.AI_WRITER,
  'photographer': JobCategory.PHOTOGRAPHY_STAFF,
  'photography_staff': JobCategory.PHOTOGRAPHY_STAFF,
};

export function normalizeJobCategory(input?: string | JobCategory | null): JobCategory | undefined {
  if (!input) return undefined;
  if (Object.values(JobCategory).includes(input as JobCategory)) return input as JobCategory;
  const s = String(input).trim();
  if (jpToEnum[s]) return jpToEnum[s];
  const key = s.toLowerCase();
  if (slugToEnum[key]) return slugToEnum[key];
  return undefined;
}





