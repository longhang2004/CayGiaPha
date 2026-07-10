import { api } from "./apiClient";

export interface ProfileUpdateResponse {
  userId: string;
  displayName: string;
}

export function updateMyProfile(displayName: string): Promise<ProfileUpdateResponse> {
  return api.patch<ProfileUpdateResponse>("/me/profile", { displayName });
}
