import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorText = res.statusText;
    
    try {
      // Attempt to get detailed error message
      const text = await res.text();
      if (text) {
        // Try to parse as JSON first
        try {
          const errorJson = JSON.parse(text);
          errorText = errorJson.error || errorJson.message || text;
        } catch (e) {
          // If not JSON, use the text directly
          errorText = text;
        }
      }
    } catch (e) {
      console.error("Error parsing response:", e);
    }
    
    throw new Error(`${res.status}: ${errorText}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`Making ${method} request to ${url}`, data);
  
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
    
    console.log(`Response status: ${res.status}`);
    
    // Clone the response so we can log it while still returning original
    const clonedRes = res.clone();
    
    try {
      const textData = await clonedRes.text();
      console.log(`Response body: ${textData.substring(0, 200)}${textData.length > 200 ? '...' : ''}`);
    } catch (err) {
      console.error("Failed to read response body:", err);
    }
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API request failed for ${method} ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
