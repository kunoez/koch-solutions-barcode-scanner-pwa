import { AuthResponse, LoginCredentials, OfflineData, Project, User } from "@/types";

const API_BASE_URL = "https://barcode-api.koch-solutions.com";

class ApiClient {
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {};

    // Copy existing headers
    if (options.headers) {
      const existingHeaders = options.headers as Record<string, string>;
      Object.keys(existingHeaders).forEach((key) => {
        headers[key] = existingHeaders[key];
      });
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/";
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  async login(credentials: LoginCredentials): Promise<string> {
    const response = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    return response.access_token;
  }

  async getProfile(): Promise<User> {
    return this.request<User>("/auth/profile");
  }

  async getProjects(): Promise<Project[]> {
    return this.request<Project[]>("/projects");
  }

  async getOfflineData(): Promise<OfflineData> {
    return this.request<OfflineData>("/data/offline-data");
  }

  async createScan(formData: FormData): Promise<void> {
    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/scans`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to create scan");
    }
  }
}

export const api = new ApiClient();
