import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  fetchTransactions,
  fetchBehavioralSessions,
  fetchUsers,
  type DataFetchParams,
  type PaginatedResponse,
  type FilterParams,
  type PaginationParams,
} from '@/actions/data-fetching';

// UI State interfaces
interface UIState {
  isLoading: boolean;
  error: string | null;
}

interface TableState {
  pagination: PaginationParams;
  filters: FilterParams;
  sort: {
    field: string;
    direction: 'asc' | 'desc';
  };
  ui: UIState;
}

// Data cache interface
interface DataCache<T> {
  data: T[];
  lastFetch: number;
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Main store interface
interface DataStore {
  // Table states
  transactions: TableState;
  raw_behavioral_sessions: TableState;
  users: TableState;
  
  // Data caches
  transactionsCache: DataCache<any> | null;
  raw_behavioral_sessionsCache: DataCache<any> | null;
  usersCache: DataCache<any> | null;
  
  // Active tab
  activeTab: 'transactions' | 'raw_behavioral_sessions' | 'users';
  
  // Actions
  setActiveTab: (tab: 'transactions' | 'raw_behavioral_sessions' | 'users') => void;
  
  // Transactions actions
  setTransactionsPagination: (pagination: Partial<PaginationParams>) => void;
  setTransactionsFilters: (filters: Partial<FilterParams>) => void;
  setTransactionsSort: (field: string, direction: 'asc' | 'desc') => void;
  loadTransactions: () => Promise<void>;
  
  // Raw Behavioral Sessions actions
  setRaw_behavioral_sessionsPagination: (pagination: Partial<PaginationParams>) => void;
  setRaw_behavioral_sessionsFilters: (filters: Partial<FilterParams>) => void;
  setRaw_behavioral_sessionsSort: (field: string, direction: 'asc' | 'desc') => void;
  loadRaw_behavioral_sessions: () => Promise<void>;
  
  // Users actions
  setUsersPagination: (pagination: Partial<PaginationParams>) => void;
  setUsersFilters: (filters: Partial<FilterParams>) => void;
  setUsersSort: (field: string, direction: 'asc' | 'desc') => void;
  loadUsers: () => Promise<void>;
  
  // Utility actions
  clearCache: (table?: 'transactions' | 'raw_behavioral_sessions' | 'users') => void;
  resetFilters: (table: 'transactions' | 'raw_behavioral_sessions' | 'users') => void;
}

// Default table state
const createDefaultTableState = (): TableState => ({
  pagination: {
    page: 1,
    pageSize: 10,
  },
  filters: {},
  sort: {
    field: 'createdAt',
    direction: 'desc',
  },
  ui: {
    isLoading: false,
    error: null,
  },
});

// Cache timeout (5 minutes)
const CACHE_TIMEOUT = 5 * 60 * 1000;

// Helper function to check if cache is valid
const isCacheValid = (cache: DataCache<any> | null): boolean => {
  if (!cache) return false;
  return Date.now() - cache.lastFetch < CACHE_TIMEOUT;
};

export const useDataStore = create<DataStore>()(devtools(
  (set, get) => ({
    // Initial state
    transactions: createDefaultTableState(),
    raw_behavioral_sessions: createDefaultTableState(),
    users: createDefaultTableState(),
    
    transactionsCache: null,
    raw_behavioral_sessionsCache: null,
    usersCache: null,
    
    activeTab: 'transactions',
    
    // Tab management
    setActiveTab: (tab) => {
      set({ activeTab: tab });
    },
    
    // Transactions actions
    setTransactionsPagination: (pagination) => {
      set((state) => ({
        transactions: {
          ...state.transactions,
          pagination: { ...state.transactions.pagination, ...pagination },
        },
        transactionsCache: null, // Clear cache to force reload
      }));
      // Auto-load data when pagination changes
      get().loadTransactions();
    },
    
    setTransactionsFilters: (filters) => {
      set((state) => ({
        transactions: {
          ...state.transactions,
          filters: { ...state.transactions.filters, ...filters },
          pagination: { ...state.transactions.pagination, page: 1 }, // Reset to first page
        },
        transactionsCache: null, // Clear cache to force reload
      }));
      // Auto-load data when filters change
      get().loadTransactions();
    },
    
    setTransactionsSort: (field, direction) => {
      set((state) => ({
        transactions: {
          ...state.transactions,
          sort: { field, direction },
        },
        transactionsCache: null, // Clear cache to force reload
      }));
      // Auto-load data when sort changes
      get().loadTransactions();
    },
    
    loadTransactions: async () => {
      const state = get();
      const { transactions } = state;
      
      // Check cache first
      if (isCacheValid(state.transactionsCache)) {
        return;
      }
      
      // Set loading state
      set((state) => ({
        transactions: {
          ...state.transactions,
          ui: { isLoading: true, error: null },
        },
      }));
      
      try {
        const params: DataFetchParams = {
          pagination: transactions.pagination,
          filters: transactions.filters,
          sort: transactions.sort,
        };
        
        const result = await fetchTransactions(params);
        
        // Update cache and clear loading state
        set((state) => ({
          transactions: {
            ...state.transactions,
            ui: { isLoading: false, error: null },
          },
          transactionsCache: {
            data: result.data,
            pagination: result.pagination,
            lastFetch: Date.now(),
          },
        }));
      } catch (error) {
        set((state) => ({
          transactions: {
            ...state.transactions,
            ui: {
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to load transactions',
            },
          },
        }));
      }
    },
    
    // Raw Behavioral Sessions actions
    setRaw_behavioral_sessionsPagination: (pagination) => {
      set((state) => ({
        raw_behavioral_sessions: {
          ...state.raw_behavioral_sessions,
          pagination: { ...state.raw_behavioral_sessions.pagination, ...pagination },
        },
        raw_behavioral_sessionsCache: null, // Clear cache to force reload
      }));
      get().loadRaw_behavioral_sessions();
    },
    
    setRaw_behavioral_sessionsFilters: (filters) => {
      set((state) => ({
        raw_behavioral_sessions: {
          ...state.raw_behavioral_sessions,
          filters: { ...state.raw_behavioral_sessions.filters, ...filters },
          pagination: { ...state.raw_behavioral_sessions.pagination, page: 1 },
        },
        raw_behavioral_sessionsCache: null, // Clear cache to force reload
      }));
      get().loadRaw_behavioral_sessions();
    },
    
    setRaw_behavioral_sessionsSort: (field, direction) => {
      set((state) => ({
        raw_behavioral_sessions: {
          ...state.raw_behavioral_sessions,
          sort: { field, direction },
        },
        raw_behavioral_sessionsCache: null, // Clear cache to force reload
      }));
      get().loadRaw_behavioral_sessions();
    },
    
    loadRaw_behavioral_sessions: async () => {
      const state = get();
      const { raw_behavioral_sessions } = state;
      
      if (isCacheValid(state.raw_behavioral_sessionsCache)) {
        return;
      }
      
      set((state) => ({
        raw_behavioral_sessions: {
          ...state.raw_behavioral_sessions,
          ui: { isLoading: true, error: null },
        },
      }));
      
      try {
        const params: DataFetchParams = {
          pagination: raw_behavioral_sessions.pagination,
          filters: raw_behavioral_sessions.filters,
          sort: raw_behavioral_sessions.sort,
        };
        
        const result = await fetchBehavioralSessions(params);
        
        set((state) => ({
          raw_behavioral_sessions: {
            ...state.raw_behavioral_sessions,
            ui: { isLoading: false, error: null },
          },
          raw_behavioral_sessionsCache: {
            data: result.data,
            pagination: result.pagination,
            lastFetch: Date.now(),
          },
        }));
      } catch (error) {
        set((state) => ({
          raw_behavioral_sessions: {
            ...state.raw_behavioral_sessions,
            ui: {
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to load behavioral sessions',
            },
          },
        }));
      }
    },
    
    // Users actions
    setUsersPagination: (pagination) => {
      set((state) => ({
        users: {
          ...state.users,
          pagination: { ...state.users.pagination, ...pagination },
        },
        usersCache: null, // Clear cache to force reload
      }));
      get().loadUsers();
    },
    
    setUsersFilters: (filters) => {
      set((state) => ({
        users: {
          ...state.users,
          filters: { ...state.users.filters, ...filters },
          pagination: { ...state.users.pagination, page: 1 },
        },
        usersCache: null, // Clear cache to force reload
      }));
      get().loadUsers();
    },
    
    setUsersSort: (field, direction) => {
      set((state) => ({
        users: {
          ...state.users,
          sort: { field, direction },
        },
        usersCache: null, // Clear cache to force reload
      }));
      get().loadUsers();
    },
    
    loadUsers: async () => {
      const state = get();
      const { users } = state;
      
      if (isCacheValid(state.usersCache)) {
        return;
      }
      
      set((state) => ({
        users: {
          ...state.users,
          ui: { isLoading: true, error: null },
        },
      }));
      
      try {
        const params: DataFetchParams = {
          pagination: users.pagination,
          filters: users.filters,
          sort: users.sort,
        };
        
        const result = await fetchUsers(params);
        
        set((state) => ({
          users: {
            ...state.users,
            ui: { isLoading: false, error: null },
          },
          usersCache: {
            data: result.data,
            pagination: result.pagination,
            lastFetch: Date.now(),
          },
        }));
      } catch (error) {
        set((state) => ({
          users: {
            ...state.users,
            ui: {
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to load users',
            },
          },
        }));
      }
    },
    
    // Utility actions
    clearCache: (table) => {
      if (table) {
        if (table === 'raw_behavioral_sessions') {
          set({ raw_behavioral_sessionsCache: null });
        } else {
          set((state) => ({
            [`${table}Cache`]: null,
          }));
        }
      } else {
        set({
          transactionsCache: null,
          raw_behavioral_sessionsCache: null,
          usersCache: null,
        });
      }
    },
    
    resetFilters: (table) => {
      set((state) => ({
        [table]: {
          ...state[table],
          filters: {},
          pagination: { ...state[table].pagination, page: 1 },
        },
      }));
      // Auto-load data after resetting filters
      if (table === 'transactions') get().loadTransactions();
      else if (table === 'raw_behavioral_sessions') get().loadRaw_behavioral_sessions();
      else if (table === 'users') get().loadUsers();
    },
  }),
  {
    name: 'data-store',
  }
));