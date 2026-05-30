import type { NotificationDTO } from '../api/notificationsApi';

const sanitizeInternalUrl = (value?: string | null) => {
  if (!value || !value.startsWith('/')) return null;
  if (value.startsWith('//')) return null;
  if (value === '/') return null;
  return value;
};

export const getNotificationTargetUrl = (notification: NotificationDTO) => {
  const explicitTarget = sanitizeInternalUrl(notification.targetUrl);
  if (explicitTarget) return explicitTarget;

  const message = notification.message.toLowerCase();

  if (message.includes('projet')) return '/dashboard';
  if (message.includes('diagramme')) return '/diagrams';
  if (message.includes('pull request') || message.includes('github')) return '/development';
  if (message.includes('tache') || message.includes('mention')) return '/planning';
  if (message.includes('chat') || message.includes('contact')) return null;

  return null;
};
