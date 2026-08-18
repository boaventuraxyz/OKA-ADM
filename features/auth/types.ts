export const APP_ROLES = ["master", "admin", "editor"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type AuthUser = {
  id: string;
  email: string | null;
  passwordChangeRequired: boolean;
  phone: string | null;
};

/** Authorization data persisted in public.profiles, never in user_metadata. */
export type AuthProfile = {
  id: string;
  email: string | null;
  displayName: string | null;
  role: AppRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AuthContext = {
  user: AuthUser;
  profile: AuthProfile | null;
};

export type ActiveAuthContext = AuthContext & {
  profile: AuthProfile;
};
