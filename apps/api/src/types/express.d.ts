declare global {
  namespace Express {
    // Augment Express.User so passport's req.user carries our auth payload.
    interface User {
      id: string;
      email: string;
      name?: string | null;
      avatar?: string | null;
      createdAt?: Date;
    }
  }
}
export {};
