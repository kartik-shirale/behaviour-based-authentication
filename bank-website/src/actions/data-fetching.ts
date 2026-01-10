"use server";

import { revalidatePath } from "next/cache";

// Types for our data fetching
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface FilterParams {
  search?: string;
  status?: string;
  type?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  amountRange?: {
    min: number;
    max: number;
  };
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

export interface DataFetchParams {
  pagination: PaginationParams;
  filters?: FilterParams;
  sort?: SortParams;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  filters?: Record<string, any>;
}

// Transaction-related server actions
export async function fetchTransactions(
  params: DataFetchParams
): Promise<PaginatedResponse<any>> {
  try {
    // Import the existing function
    const { getPaginatedTransactions } = await import("./admin");
    
    // Convert our params to the format expected by the existing function
    const result = await getPaginatedTransactions(
      params.pagination.page,
      params.pagination.pageSize,
      {
        search: params.filters?.search,
        status: params.filters?.status,
        type: params.filters?.type,
        category: params.filters?.type, // Map type to category if needed
      }
    );

    return {
      data: result.data,
      pagination: {
        currentPage: result.pagination.currentPage,
        pageSize: result.pagination.pageSize,
        totalItems: result.pagination.totalItems,
        totalPages: result.pagination.totalPages,
        hasNextPage: result.pagination.hasNextPage,
        hasPreviousPage: result.pagination.hasPreviousPage,
      },
    };
  } catch (error) {
    console.error("Error fetching transactions:", error);
    throw new Error("Failed to fetch transactions");
  }
}

// Behavioral Sessions server actions
export async function fetchBehavioralSessions(
  params: DataFetchParams
): Promise<PaginatedResponse<any>> {
  try {
    const { getPaginatedBehavioralSessions } = await import("./admin");
    
    const result = await getPaginatedBehavioralSessions(
      params.pagination.page,
      params.pagination.pageSize,
      {
        search: params.filters?.search,
        behaviorFilter: params.filters?.status, // Map status to behaviorFilter
      }
    );

    return {
      data: result.data,
      pagination: {
        currentPage: result.pagination.currentPage,
        pageSize: result.pagination.pageSize,
        totalItems: result.pagination.totalItems,
        totalPages: result.pagination.totalPages,
        hasNextPage: result.pagination.hasNextPage,
        hasPreviousPage: result.pagination.hasPreviousPage,
      },
    };
  } catch (error) {
    console.error("Error fetching behavioral sessions:", error);
    throw new Error("Failed to fetch behavioral sessions");
  }
}

// Users server actions
export async function fetchUsers(
  params: DataFetchParams
): Promise<PaginatedResponse<any>> {
  try {
    const { getPaginatedUsers } = await import("./admin");
    
    const result = await getPaginatedUsers(
      params.pagination.page,
      params.pagination.pageSize,
      {
        search: params.filters?.search,
        statusFilter: params.filters?.status, // Map status to statusFilter
        verificationFilter: params.filters?.type, // Map type to verificationFilter
      }
    );

    return {
      data: result.data,
      pagination: {
        currentPage: result.pagination.currentPage,
        pageSize: result.pagination.pageSize,
        totalItems: result.pagination.totalItems,
        totalPages: result.pagination.totalPages,
        hasNextPage: result.pagination.hasNextPage,
        hasPreviousPage: result.pagination.hasPreviousPage,
      },
    };
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to fetch users");
  }
}

// Revalidation helpers
export async function revalidateTransactions() {
  revalidatePath("/admin/transactions");
}

export async function revalidateBehavioralSessions() {
  revalidatePath("/admin/behavioral-sessions");
}

export async function revalidateUsers() {
  revalidatePath("/admin/users");
}