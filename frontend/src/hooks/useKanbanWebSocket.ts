import { useEffect } from 'react';
import { useWebSocket } from './useWebSocket';
import { useKanbanStore } from '../store/kanbanStore';
import type { KanbanUpdateMessage } from '../types/kanban.types';

export function useKanbanWebSocket(projectId: number | null) {
  const { connectionState, subscribe } = useWebSocket();
  const handleWsMessage = useKanbanStore((state) => state.handleWsMessage);

  useEffect(() => {
    if (!projectId || connectionState !== 'CONNECTED') return undefined;
    const subscription = subscribe(`/topic/kanban/${projectId}`, (message) => {
      try {
        const body = JSON.parse(message.body) as KanbanUpdateMessage | string;
        handleWsMessage(body);
      } catch {
        handleWsMessage('refresh');
      }
    });
    return () => subscription?.unsubscribe();
  }, [connectionState, handleWsMessage, projectId, subscribe]);

  return connectionState;
}
