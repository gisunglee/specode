import prisma from "@/lib/prisma";

export async function generateSystemId(prefix: string): Promise<string> {
  const result = await prisma.$transaction(async (tx) => {
    const seq = await tx.sequence.update({
      where: { prefix },
      data: { lastValue: { increment: 1 } },
    });
    return `${prefix}-${String(seq.lastValue).padStart(5, "0")}`;
  });
  return result;
}
