// lib/services/auth/auth-service.ts
// Implémentation factice pour permettre la compilation

interface LoginResult {
  success: boolean;
  message: string;
  statusCode: number;
  userId?: string;
  sessionId?: string;
  user?: { email: string };
}

export async function loginUser(email: string, password: string): Promise<LoginResult> {
  if (email === "test@example.com" && password === "password123") {
    return {
      success: true,
      message: "Login successful",
      statusCode: 200,
      userId: "user-123",
      sessionId: "session-abc",
      user: { email: email },
    };
  } else {
    return {
      success: false,
      message: "Invalid credentials",
      statusCode: 401,
    };
  }
}