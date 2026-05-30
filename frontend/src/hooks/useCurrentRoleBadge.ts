import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchProjectMembers } from '../api/projectsApi';
import { useActiveProjectStore } from '../store/activeProjectStore';

type RoleBadgeColor = 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';

type RoleBadgeInfo = {
  label: string;
  color: RoleBadgeColor;
  title: string;
};

const projectRoleInfo: Record<string, RoleBadgeInfo> = {
  OWNER: { label: 'Proprietaire', color: 'primary', title: 'Role dans ce projet : proprietaire' },
  ADMIN: { label: 'Admin projet', color: 'warning', title: 'Role dans ce projet : administrateur projet' },
  DEVELOPER: { label: 'Developpeur', color: 'info', title: 'Role dans ce projet : developpeur' },
  VIEWER: { label: 'Lecteur', color: 'default', title: 'Role dans ce projet : lecture seule' },
};

export const useCurrentRoleBadge = (): RoleBadgeInfo => {
  const { user } = useAuth();
  const activeProject = useActiveProjectStore((state) => state.activeProject);
  const [projectRole, setProjectRole] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setProjectRole(null);

    if (!user || user.role === 'ROLE_ADMIN' || !activeProject?.id) {
      return undefined;
    }

    if (activeProject.owner) {
      setProjectRole('OWNER');
      return undefined;
    }

    void fetchProjectMembers(activeProject.id)
      .then((members) => {
        if (!active) return;
        const member = members.find((row) => row.userId === user.id);
        setProjectRole(member?.projectRole ?? member?.role ?? null);
      })
      .catch(() => {
        if (active) setProjectRole(null);
      });

    return () => {
      active = false;
    };
  }, [activeProject?.id, activeProject?.owner, user]);

  return useMemo(() => {
    if (user?.role === 'ROLE_ADMIN') {
      return { label: 'Admin plateforme', color: 'error', title: "Role global : administrateur de l'application" };
    }
    if (projectRole && projectRoleInfo[projectRole]) {
      return projectRoleInfo[projectRole];
    }
    return { label: 'Utilisateur', color: 'default', title: "Aucun role projet actif selectionne" };
  }, [projectRole, user?.role]);
};
