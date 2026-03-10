import { describe, it, expect, vi, beforeEach } from "vitest";
import { onTaskComplete } from "@/app/api/ai/_lib/onTaskComplete";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    function: {
      update: vi.fn().mockResolvedValue({}),
    },
    standardGuide: {
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

import prisma from "@/lib/prisma";

const base = {
  aiTaskId: 1,
  refPkId: 10,
  feedback: "AI 결과",
  resultFiles: null,
};

describe("onTaskComplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("FAILED 상태이면 아무것도 업데이트하지 않는다", async () => {
    await onTaskComplete({ ...base, refTableName: "tb_function", taskType: "DESIGN", taskStatus: "FAILED" });
    expect(prisma.function.update).not.toHaveBeenCalled();
  });

  it("WARNING 상태이면 아무것도 업데이트하지 않는다", async () => {
    await onTaskComplete({ ...base, refTableName: "tb_function", taskType: "DESIGN", taskStatus: "WARNING" });
    expect(prisma.function.update).not.toHaveBeenCalled();
  });

  describe("tb_function", () => {
    it("DESIGN 태스크 성공 시 aiDesignContent + status=DESIGN_DONE 업데이트", async () => {
      await onTaskComplete({ ...base, refTableName: "tb_function", taskType: "DESIGN", taskStatus: "SUCCESS" });
      expect(prisma.function.update).toHaveBeenCalledWith({
        where: { functionId: 10 },
        data: { aiDesignContent: "AI 결과", status: "DESIGN_DONE" },
      });
    });

    it("INSPECT 태스크 성공 시 aiInspFeedback + status=REVIEW_DONE 업데이트", async () => {
      await onTaskComplete({ ...base, refTableName: "tb_function", taskType: "INSPECT", taskStatus: "SUCCESS" });
      expect(prisma.function.update).toHaveBeenCalledWith({
        where: { functionId: 10 },
        data: { aiInspFeedback: "AI 결과", status: "REVIEW_DONE" },
      });
    });

    it("IMPLEMENT 태스크 AUTO_FIXED 시 aiImplFeedback + status=IMPL_DONE 업데이트", async () => {
      await onTaskComplete({
        ...base,
        refTableName: "tb_function",
        taskType: "IMPLEMENT",
        taskStatus: "AUTO_FIXED",
        resultFiles: "src/foo.ts\nsrc/bar.ts",
      });
      expect(prisma.function.update).toHaveBeenCalledWith({
        where: { functionId: 10 },
        data: { aiImplFeedback: "AI 결과", status: "IMPL_DONE" },
      });
    });

    it("알 수 없는 taskType이면 function.update를 호출하지 않는다", async () => {
      await onTaskComplete({ ...base, refTableName: "tb_function", taskType: "UNKNOWN", taskStatus: "SUCCESS" });
      expect(prisma.function.update).not.toHaveBeenCalled();
    });
  });

  describe("tb_standard_guide", () => {
    it("INSPECT 태스크 성공 시 aiFeedbackContent + status=REVIEW_DONE 업데이트", async () => {
      await onTaskComplete({ ...base, refTableName: "tb_standard_guide", taskType: "INSPECT", taskStatus: "SUCCESS" });
      expect(prisma.standardGuide.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { guideId: 10 },
          data: expect.objectContaining({
            aiFeedbackContent: "AI 결과",
            status: "REVIEW_DONE",
          }),
        })
      );
    });

    it("INSPECT 외 taskType이면 아무것도 업데이트하지 않는다", async () => {
      await onTaskComplete({ ...base, refTableName: "tb_standard_guide", taskType: "OTHER", taskStatus: "SUCCESS" });
      expect(prisma.standardGuide.update).not.toHaveBeenCalled();
    });
  });

  it("알 수 없는 refTableName이면 아무것도 업데이트하지 않는다", async () => {
    await onTaskComplete({ ...base, refTableName: "tb_unknown", taskType: "DESIGN", taskStatus: "SUCCESS" });
    expect(prisma.function.update).not.toHaveBeenCalled();
    expect(prisma.standardGuide.update).not.toHaveBeenCalled();
  });
});
