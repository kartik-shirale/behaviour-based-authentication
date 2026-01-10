import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface TableData {
  transactions: any[];
  behavioralSessions: any[];
  users: any[];
  filteredTransactions: any[];
  filteredBehavioralSessions: any[];
  filteredUsers: any[];
}

export interface ApiFilters {
  search: string;
  status?: string;
  type?: string;
  category?: string;
  behaviorFilter?: string;
  statusFilter?: string;
  verificationFilter?: string;
  userId?: string;
}

export interface LoadingState {
  transactions: boolean;
  behavioralSessions: boolean;
  users: boolean;
}

export interface ErrorState {
  transactions: string | null;
  behavioralSessions: string | null;
  users: string | null;
}

export interface PaginationStore {
  // Pagination state
  transactionsPagination: PaginationState;
  behavioralSessionsPagination: PaginationState;
  usersPagination: PaginationState;

  // Table data
  tableData: TableData;

  // Loading and error states
  loading: LoadingState;
  errors: ErrorState;

  // Filters
  transactionsFilters: ApiFilters;
  behavioralSessionsFilters: ApiFilters;
  usersFilters: ApiFilters;

  // Active tab
  activeTab: "transactions" | "raw_behavioral_sessions" | "users";

  // Actions
  setActiveTab: (
    tab: "transactions" | "raw_behavioral_sessions" | "users"
  ) => void;

  // Server-side pagination actions
  fetchTransactions: (
    page?: number,
    pageSize?: number,
    filters?: Partial<ApiFilters>
  ) => Promise<void>;
  fetchBehavioralSessions: (
    page?: number,
    pageSize?: number,
    filters?: Partial<ApiFilters>
  ) => Promise<void>;
  fetchUsers: (
    page?: number,
    pageSize?: number,
    filters?: Partial<ApiFilters>
  ) => Promise<void>;

  // Legacy client-side actions (for backward compatibility)
  setTransactionsPage: (page: number) => void;
  setBehavioralSessionsPage: (page: number) => void;
  setUsersPage: (page: number) => void;
  setTransactionsPageSize: (size: number) => void;
  setBehavioralSessionsPageSize: (size: number) => void;
  setUsersPageSize: (size: number) => void;
  setTransactionsFilters: (filters: Partial<ApiFilters>) => void;
  setBehavioralSessionsFilters: (filters: Partial<ApiFilters>) => void;
  setUsersFilters: (filters: Partial<ApiFilters>) => void;
  setTableData: (data: Partial<TableData>) => void;
  updateTransactionsPagination: (pagination: Partial<PaginationState>) => void;
  updateBehavioralSessionsPagination: (
    pagination: Partial<PaginationState>
  ) => void;
  updateUsersPagination: (pagination: Partial<PaginationState>) => void;

  // Computed getters
  getCurrentPageData: () => any[];
  getCurrentPagination: () => PaginationState;
  getCurrentFilters: () => ApiFilters;
  getCurrentLoading: () => boolean;
  getCurrentError: () => string | null;
}

const initialPaginationState: PaginationState = {
  currentPage: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

const initialTableData: TableData = {
  transactions: [],
  behavioralSessions: [],
  users: [],
  filteredTransactions: [],
  filteredBehavioralSessions: [],
  filteredUsers: [],
};

const initialLoadingState: LoadingState = {
  transactions: false,
  behavioralSessions: false,
  users: false,
};

const initialErrorState: ErrorState = {
  transactions: null,
  behavioralSessions: null,
  users: null,
};

const initialFilters: ApiFilters = {
  search: "",
  status: "all",
  type: "all",
  category: "all",
  behaviorFilter: "all",
  statusFilter: "all",
  verificationFilter: "all",
  userId: "",
};

export const usePaginationStore = create<PaginationStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      transactionsPagination: initialPaginationState,
      behavioralSessionsPagination: initialPaginationState,
      usersPagination: initialPaginationState,
      tableData: initialTableData,
      loading: initialLoadingState,
      errors: initialErrorState,
      transactionsFilters: initialFilters,
      behavioralSessionsFilters: initialFilters,
      usersFilters: initialFilters,
      activeTab: "transactions",

      // Actions
      setActiveTab: (tab) => {
        set({ activeTab: tab }, false, "setActiveTab");
      },

      // Server-side pagination actions
      fetchTransactions: async (page = 1, pageSize = 10, filters = {}) => {
        const state = get();
        const currentFilters = { ...state.transactionsFilters, ...filters };

        set(
          (state) => ({
            loading: { ...state.loading, transactions: true },
            errors: { ...state.errors, transactions: null },
            transactionsFilters: currentFilters,
          }),
          false,
          "fetchTransactions:start"
        );

        try {
          // Import server action dynamically to avoid SSR issues
          const { getPaginatedTransactions } = await import("../actions/admin");

          const result = await getPaginatedTransactions(
            page,
            pageSize,
            currentFilters
          );

          set(
            (state) => ({
              tableData: {
                ...state.tableData,
                transactions: result.data,
                filteredTransactions: result.data,
              },
              transactionsPagination: {
                currentPage: result.pagination.currentPage,
                pageSize: result.pagination.pageSize,
                totalItems: result.pagination.totalItems,
                totalPages: result.pagination.totalPages,
                hasNextPage: result.pagination.hasNextPage,
                hasPreviousPage: result.pagination.hasPreviousPage,
              },
              loading: { ...state.loading, transactions: false },
            }),
            false,
            "fetchTransactions:success"
          );
        } catch (error) {
          set(
            (state) => ({
              loading: { ...state.loading, transactions: false },
              errors: {
                ...state.errors,
                transactions:
                  error instanceof Error
                    ? error.message
                    : "Failed to fetch transactions",
              },
            }),
            false,
            "fetchTransactions:error"
          );
        }
      },

      fetchBehavioralSessions: async (
        page = 1,
        pageSize = 10,
        filters = {}
      ) => {
        const state = get();
        const currentFilters = {
          ...state.behavioralSessionsFilters,
          ...filters,
        };

        set(
          (state) => ({
            loading: { ...state.loading, behavioralSessions: true },
            errors: { ...state.errors, behavioralSessions: null },
            behavioralSessionsFilters: currentFilters,
          }),
          false,
          "fetchBehavioralSessions:start"
        );

        try {
          // Import server action dynamically to avoid SSR issues
          const { getPaginatedBehavioralSessions } = await import(
            "../actions/admin"
          );

          const result = await getPaginatedBehavioralSessions(
            page,
            pageSize,
            currentFilters
          );

          set(
            (state) => ({
              tableData: {
                ...state.tableData,
                behavioralSessions: result.data,
                filteredBehavioralSessions: result.data,
              },
              behavioralSessionsPagination: {
                currentPage: result.pagination.currentPage,
                pageSize: result.pagination.pageSize,
                totalItems: result.pagination.totalItems,
                totalPages: result.pagination.totalPages,
                hasNextPage: result.pagination.hasNextPage,
                hasPreviousPage: result.pagination.hasPreviousPage,
              },
              loading: { ...state.loading, behavioralSessions: false },
            }),
            false,
            "fetchBehavioralSessions:success"
          );
        } catch (error) {
          set(
            (state) => ({
              loading: { ...state.loading, behavioralSessions: false },
              errors: {
                ...state.errors,
                behavioralSessions:
                  error instanceof Error
                    ? error.message
                    : "Failed to fetch behavioral sessions",
              },
            }),
            false,
            "fetchBehavioralSessions:error"
          );
        }
      },

      fetchUsers: async (page = 1, pageSize = 10, filters = {}) => {
        const state = get();
        const currentFilters = { ...state.usersFilters, ...filters };

        set(
          (state) => ({
            loading: { ...state.loading, users: true },
            errors: { ...state.errors, users: null },
            usersFilters: currentFilters,
          }),
          false,
          "fetchUsers:start"
        );

        try {
          // Import server action dynamically to avoid SSR issues
          const { getPaginatedUsers } = await import("../actions/admin");

          const result = await getPaginatedUsers(
            page,
            pageSize,
            currentFilters
          );

          set(
            (state) => ({
              tableData: {
                ...state.tableData,
                users: result.data,
                filteredUsers: result.data,
              },
              usersPagination: {
                currentPage: result.pagination.currentPage,
                pageSize: result.pagination.pageSize,
                totalItems: result.pagination.totalItems,
                totalPages: result.pagination.totalPages,
                hasNextPage: result.pagination.hasNextPage,
                hasPreviousPage: result.pagination.hasPreviousPage,
              },
              loading: { ...state.loading, users: false },
            }),
            false,
            "fetchUsers:success"
          );
        } catch (error) {
          set(
            (state) => ({
              loading: { ...state.loading, users: false },
              errors: {
                ...state.errors,
                users:
                  error instanceof Error
                    ? error.message
                    : "Failed to fetch users",
              },
            }),
            false,
            "fetchUsers:error"
          );
        }
      },

      setTransactionsPage: (page) => {
        const state = get();
        set(
          (state) => ({
            transactionsPagination: {
              ...state.transactionsPagination,
              currentPage: page,
            },
          }),
          false,
          "setTransactionsPage"
        );
        // Automatically fetch data for the new page
        get().fetchTransactions(
          page,
          state.transactionsPagination.pageSize,
          state.transactionsFilters
        );
      },

      setBehavioralSessionsPage: (page) => {
        const state = get();
        set(
          (state) => ({
            behavioralSessionsPagination: {
              ...state.behavioralSessionsPagination,
              currentPage: page,
            },
          }),
          false,
          "setBehavioralSessionsPage"
        );
        // Automatically fetch data for the new page
        get().fetchBehavioralSessions(
          page,
          state.behavioralSessionsPagination.pageSize,
          state.behavioralSessionsFilters
        );
      },

      setTransactionsPageSize: (size) => {
        const state = get();
        set(
          (state) => ({
            transactionsPagination: {
              ...state.transactionsPagination,
              pageSize: size,
              currentPage: 1, // Reset to first page when changing page size
            },
          }),
          false,
          "setTransactionsPageSize"
        );
        // Automatically fetch data with new page size
        get().fetchTransactions(
          1,
          size,
          state.transactionsFilters
        );
      },

      setBehavioralSessionsPageSize: (size) => {
        const state = get();
        set(
          (state) => ({
            behavioralSessionsPagination: {
              ...state.behavioralSessionsPagination,
              pageSize: size,
              currentPage: 1, // Reset to first page when changing page size
            },
          }),
          false,
          "setBehavioralSessionsPageSize"
        );
        // Automatically fetch data with new page size
        get().fetchBehavioralSessions(
          1,
          size,
          state.behavioralSessionsFilters
        );
      },

      setUsersPage: (page) => {
        const state = get();
        set(
          (state) => ({
            usersPagination: {
              ...state.usersPagination,
              currentPage: page,
            },
          }),
          false,
          "setUsersPage"
        );
        // Automatically fetch data for the new page
        get().fetchUsers(
          page,
          state.usersPagination.pageSize,
          state.usersFilters
        );
      },

      setUsersPageSize: (size) => {
        const state = get();
        set(
          (state) => ({
            usersPagination: {
              ...state.usersPagination,
              pageSize: size,
              currentPage: 1, // Reset to first page when changing page size
            },
          }),
          false,
          "setUsersPageSize"
        );
        // Automatically fetch data with new page size
        get().fetchUsers(
          1,
          size,
          state.usersFilters
        );
      },

      setTransactionsFilters: (filters) => {
        set(
          (state) => ({
            transactionsFilters: {
              ...state.transactionsFilters,
              ...filters,
            },
          }),
          false,
          "setTransactionsFilters"
        );
      },

      setBehavioralSessionsFilters: (filters) => {
        set(
          (state) => ({
            behavioralSessionsFilters: {
              ...state.behavioralSessionsFilters,
              ...filters,
            },
          }),
          false,
          "setBehavioralSessionsFilters"
        );
      },

      setUsersFilters: (filters) => {
        set(
          (state) => ({
            usersFilters: {
              ...state.usersFilters,
              ...filters,
            },
          }),
          false,
          "setUsersFilters"
        );
      },

      setTableData: (data) => {
        const state = get();
        const newTableData = { ...state.tableData, ...data };

        // Update pagination totals
        const transactionsTotalPages = Math.ceil(
          newTableData.filteredTransactions.length /
            state.transactionsPagination.pageSize
        );
        const behavioralSessionsTotalPages = Math.ceil(
          newTableData.filteredBehavioralSessions.length /
            state.behavioralSessionsPagination.pageSize
        );

        set(
          {
            tableData: newTableData,
            transactionsPagination: {
              ...state.transactionsPagination,
              totalItems: newTableData.filteredTransactions.length,
              totalPages: transactionsTotalPages,
              currentPage: Math.min(
                state.transactionsPagination.currentPage,
                transactionsTotalPages || 1
              ),
            },
            behavioralSessionsPagination: {
              ...state.behavioralSessionsPagination,
              totalItems: newTableData.filteredBehavioralSessions.length,
              totalPages: behavioralSessionsTotalPages,
              currentPage: Math.min(
                state.behavioralSessionsPagination.currentPage,
                behavioralSessionsTotalPages || 1
              ),
            },
            usersPagination: {
              ...state.usersPagination,
              totalItems: newTableData.filteredUsers.length,
              totalPages: Math.ceil(
                newTableData.filteredUsers.length /
                  state.usersPagination.pageSize
              ),
              currentPage: Math.min(
                state.usersPagination.currentPage,
                Math.ceil(
                  newTableData.filteredUsers.length /
                    state.usersPagination.pageSize
                ) || 1
              ),
            },
          },
          false,
          "setTableData"
        );
      },

      updateTransactionsPagination: (pagination) => {
        set(
          (state) => ({
            transactionsPagination: {
              ...state.transactionsPagination,
              ...pagination,
            },
          }),
          false,
          "updateTransactionsPagination"
        );
      },

      updateBehavioralSessionsPagination: (pagination) => {
        set(
          (state) => ({
            behavioralSessionsPagination: {
              ...state.behavioralSessionsPagination,
              ...pagination,
            },
          }),
          false,
          "updateBehavioralSessionsPagination"
        );
      },

      updateUsersPagination: (pagination) => {
        set(
          (state) => ({
            usersPagination: {
              ...state.usersPagination,
              ...pagination,
            },
          }),
          false,
          "updateUsersPagination"
        );
      },

      // Computed getters
      getCurrentPageData: () => {
        const state = get();
        let data: any[];
        let pagination: PaginationState;

        switch (state.activeTab) {
          case "transactions":
            data = state.tableData.filteredTransactions;
            pagination = state.transactionsPagination;
            break;
          case "raw_behavioral_sessions":
            data = state.tableData.filteredBehavioralSessions;
            pagination = state.behavioralSessionsPagination;
            break;
          case "users":
            data = state.tableData.filteredUsers;
            pagination = state.usersPagination;
            break;
          default:
            data = [];
            pagination = initialPaginationState;
        }

        const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
        const endIndex = startIndex + pagination.pageSize;

        return data.slice(startIndex, endIndex);
      },

      getCurrentPagination: () => {
        const state = get();
        switch (state.activeTab) {
          case "transactions":
            return state.transactionsPagination;
          case "raw_behavioral_sessions":
            return state.behavioralSessionsPagination;
          case "users":
            return state.usersPagination;
          default:
            return initialPaginationState;
        }
      },

      getCurrentFilters: () => {
        const state = get();
        switch (state.activeTab) {
          case "transactions":
            return state.transactionsFilters;
          case "raw_behavioral_sessions":
            return state.behavioralSessionsFilters;
          case "users":
            return state.usersFilters;
          default:
            return initialFilters;
        }
      },

      getCurrentLoading: () => {
        const state = get();
        switch (state.activeTab) {
          case "transactions":
            return state.loading.transactions;
          case "raw_behavioral_sessions":
            return state.loading.behavioralSessions;
          case "users":
            return state.loading.users;
          default:
            return false;
        }
      },

      getCurrentError: () => {
        const state = get();
        switch (state.activeTab) {
          case "transactions":
            return state.errors.transactions;
          case "raw_behavioral_sessions":
            return state.errors.behavioralSessions;
          case "users":
            return state.errors.users;
          default:
            return null;
        }
      },
    }),
    {
      name: "pagination-store",
    }
  )
);
