import { PrismaClient } from "@prisma/client";

const isDev = process.env.NODE_ENV !== "production";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma 클라이언트 싱글턴
 *
 * 📌 개발 환경에서 query / warn / error 로그를 터미널에 출력합니다.
 *    → SQL 쿼리, 실행 시간을 확인할 수 있습니다.
 *    → 운영 환경에서는 error만 출력합니다.
 */
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDev
      ? [
          { level: "query", emit: "stdout" },
          { level: "warn", emit: "stdout" },
          { level: "error", emit: "stdout" },
        ]
      : ["error"],
  });

if (isDev) globalForPrisma.prisma = prisma;

export default prisma;
