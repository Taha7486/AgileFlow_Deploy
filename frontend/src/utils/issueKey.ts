const DEFAULT_ISSUE_PREFIX = 'KAN';

export const normalizeIssuePrefix = (prefix?: string | null) => {
  const normalized = (prefix ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return normalized || DEFAULT_ISSUE_PREFIX;
};

export const formatIssueKey = (prefix: string | null | undefined, taskId: number | string) =>
  `${normalizeIssuePrefix(prefix)}-${taskId}`;

export const issueKeySearchValues = (prefix: string | null | undefined, taskId: number | string | null | undefined) => {
  if (taskId == null) return [];
  const id = String(taskId);
  return [
    `${normalizeIssuePrefix(prefix)}-${id}`.toLowerCase(),
    `kan-${id}`,
    `agf-${id}`,
    `task/${id}`,
    `#${id}`,
  ];
};
