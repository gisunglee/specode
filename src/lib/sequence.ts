import prisma from "@/lib/prisma";

export async function generateSystemId(prefix: string): Promise<string> {
  const result = await prisma.$transaction(async (tx) => {
    const seq = await tx.sequence.upsert({
      where: { prefix },
      create: { prefix, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });
    return `${prefix}-${String(seq.lastValue).padStart(5, "0")}`;
  });
  return result;
}
