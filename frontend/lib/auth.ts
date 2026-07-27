"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "./api/client";
import type { StaffIdentity } from "./api/types";

export function useCurrentStaff() {
  return useQuery({
    queryKey: ["staff-me"],
    queryFn: () => apiRequest<StaffIdentity>("/api/v1/auth/me"),
    retry: false,
  });
}
