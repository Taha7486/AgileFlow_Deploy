import axiosInstance from './axiosInstance';

export type ChatContactRelationshipStatus =
  | 'NONE'
  | 'CONTACT'
  | 'PENDING_SENT'
  | 'PENDING_RECEIVED';

export interface ChatContact {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string | null;
  invitationId: number;
}

export interface ChatContactInvitation {
  id: number;
  requesterId: number;
  requesterFirstName: string;
  requesterLastName: string;
  requesterEmail: string;
  requesterAvatarUrl?: string | null;
  recipientId: number;
  recipientFirstName: string;
  recipientLastName: string;
  recipientEmail: string;
  recipientAvatarUrl?: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  respondedAt: string | null;
}

export interface ChatUserSearchResult {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string | null;
  relationshipStatus: ChatContactRelationshipStatus;
}

interface PageEnvelope<T> {
  content?: T[];
}

const asArray = <T,>(value: T[] | PageEnvelope<T> | unknown): T[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Array.isArray((value as PageEnvelope<T>).content)) {
    return (value as PageEnvelope<T>).content ?? [];
  }
  return [];
};

export const fetchChatContacts = async () => {
  const { data } = await axiosInstance.get<ChatContact[] | PageEnvelope<ChatContact>>('/chat/contacts');
  return asArray<ChatContact>(data);
};

export const searchChatUsers = async (q: string) => {
  const { data } = await axiosInstance.get<ChatUserSearchResult[] | PageEnvelope<ChatUserSearchResult>>('/chat/contacts/search', { params: { q } });
  return asArray<ChatUserSearchResult>(data);
};

export const fetchPendingReceivedInvitations = async () => {
  const { data } = await axiosInstance.get<ChatContactInvitation[] | PageEnvelope<ChatContactInvitation>>('/chat/contacts/invitations/received');
  return asArray<ChatContactInvitation>(data);
};

export const fetchPendingSentInvitations = async () => {
  const { data } = await axiosInstance.get<ChatContactInvitation[] | PageEnvelope<ChatContactInvitation>>('/chat/contacts/invitations/sent');
  return asArray<ChatContactInvitation>(data);
};

export const sendChatContactInvitation = async (recipientId: number) => {
  const { data } = await axiosInstance.post<ChatContactInvitation>('/chat/contacts/invitations', { recipientId });
  return data;
};

export const acceptChatContactInvitation = async (invitationId: number) => {
  const { data } = await axiosInstance.post<ChatContactInvitation>(`/chat/contacts/invitations/${invitationId}/accept`);
  return data;
};

export const rejectChatContactInvitation = async (invitationId: number) => {
  const { data } = await axiosInstance.post<ChatContactInvitation>(`/chat/contacts/invitations/${invitationId}/reject`);
  return data;
};
