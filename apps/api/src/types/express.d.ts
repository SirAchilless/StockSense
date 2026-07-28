import type { User as PrismaUser } from '@prisma/client';

declare global {
  namespace Express {
    // Augment User to carry the fields we need from both Prisma and JWT.
    // The passport Google strategy serialises a full Prisma User; our JWT
    // middleware only sets { id, email }. Both are assignable to this shape.
    interface User {
      id: string;
      email: string;
      name?: string | null;
      avatar?: string | null;
      googleId?: string | null;
      passwordHash?: string | null;
    }

    interface Request {
      user?: User;
    }
  }
}

export type { PrismaUser };
export {};
