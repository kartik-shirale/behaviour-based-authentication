import { create } from "zustand";
import { User, UserBehavioralProfile, BehavioralSession, Transaction } from "../../data-testing";

interface AppState {
  users: User[];
  userBehavioralProfiles: UserBehavioralProfile[];
  behavioralSessions: BehavioralSession[];
  transactions: Transaction[];
  loading: boolean;
  error: string | null;

  // Actions
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  setUserBehavioralProfiles: (profiles: UserBehavioralProfile[]) => void;
  addUserBehavioralProfile: (profile: UserBehavioralProfile) => void;
  updateUserBehavioralProfile: (
    profileId: string,
    profile: Partial<UserBehavioralProfile>
  ) => void;
  setBehavioralSessions: (sessions: BehavioralSession[]) => void;
  addBehavioralSession: (session: BehavioralSession) => void;
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useStore = create<AppState>((set) => ({
  users: [],
  userBehavioralProfiles: [],
  behavioralSessions: [],
  transactions: [],
  loading: false,
  error: null,

  setUsers: (users) => set({ users }),
  addUser: (user) => set((state) => ({ users: [...state.users, user] })),
  setUserBehavioralProfiles: (profiles) =>
    set({ userBehavioralProfiles: profiles }),
  addUserBehavioralProfile: (profile) =>
    set((state) => ({
      userBehavioralProfiles: [...state.userBehavioralProfiles, profile],
    })),
  updateUserBehavioralProfile: (profileId, updatedProfile) =>
    set((state) => ({
      userBehavioralProfiles: state.userBehavioralProfiles.map((profile) =>
        profile.userId === profileId
          ? { ...profile, ...updatedProfile }
          : profile
      ),
    })),
  setBehavioralSessions: (sessions) => set({ behavioralSessions: sessions }),
  addBehavioralSession: (session) =>
    set((state) => ({
      behavioralSessions: [...state.behavioralSessions, session],
    })),
  setTransactions: (transactions) => set({ transactions }),
  addTransaction: (transaction) =>
    set((state) => ({
      transactions: [...state.transactions, transaction],
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
