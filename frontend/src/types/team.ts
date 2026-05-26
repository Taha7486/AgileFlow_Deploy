export type MemberRole = 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER';
export type MemberStatus = 'ACTIVE' | 'INVITED' | 'DISABLED';

export interface TeamMember {
  id: number;
  userId: number | null;
  email: string;
  nom: string | null;
  prenom: string | null;
  avatarUrl: string | null;
  role: MemberRole;
  status: MemberStatus;
  tasksCount: number;
  lastActivity: string | null;
  invitedAt: string | null;
}

export interface TeamStats {
  activeMembers: number;
  pendingInvitations: number;
  assignedTasks: number;
  completionRate: number;
}

export interface InviteMemberPayload {
  email?: string;
  userId?: number;
  role: MemberRole;
}
