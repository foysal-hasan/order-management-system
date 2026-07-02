declare namespace Express {
  export interface Request {
    user?: { id: string; userId: string; email: string, sessionId: string, type: string  };
    rawBody: any;
  }
}
