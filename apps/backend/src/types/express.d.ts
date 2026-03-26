declare global {
  namespace Express {
    interface Request {
      /** Set by SupabaseGuard after JWT validation */
      userId?: string;
    }
  }
}

export {};
