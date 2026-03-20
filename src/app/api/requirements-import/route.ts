import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { generateSystemId } from "@/lib/sequence";
import { apiSuccess, apiError } from "@/lib/utils";

// ─── GET: 과업 → JSON 내보내기 ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) return apiError("VALIDATION_ERROR", "taskId가 필요합니다.");

  const task = await prisma.task.findUnique({
    where: { taskId: parseInt(taskId) },
    include: {
      requirements: {
        orderBy: { requirementId: "asc" },
        include: {
          userStories: { orderBy: { userStoryId: "asc" } },
        },
      },
    },
  });

  if (!task) return apiError("NOT_FOUND", "과업을 찾을 수 없습니다.", 404);

  return apiSuccess({
    task: {
      systemId: task.systemId,
      name: task.name,
      category: task.category ?? "",
      definition: task.definition ?? "",
      outputInfo: task.outputInfo ?? "",
    },
    requirements: task.requirements.map((r) => ({
      systemId: r.systemId,
      name: r.name,
      originalContent: r.originalContent ?? "",
      currentContent: r.currentContent ?? "",
      detailSpec: r.detailSpec ?? "",
      priority: r.priority ?? "MEDIUM",
      source: r.source ?? "RFP",
      userStories: r.userStories.map((u) => ({
        systemId: u.systemId,
        name: u.name,
        persona: u.persona ?? "",
        scenario: u.scenario ?? "",
        acceptanceCriteria: (u.acceptanceCriteria as { text: string }[] | null) ?? [],
      })),
    })),
  });
}

// ─── POST: JSON 가져오기 (신규 등록 + 수정 upsert) ────────────────────────────

interface UserStoryInput {
  systemId?: string;
  name: string;
  persona?: string;
  scenario?: string;
  acceptanceCriteria?: { text: string }[];
}

interface RequirementInput {
  systemId?: string;
  name: string;
  originalContent?: string;
  currentContent?: string;
  detailSpec?: string;
  priority?: string;
  source?: string;
  userStories?: UserStoryInput[];
}

interface ImportPayload {
  task: {
    systemId?: string;
    name: string;
    category?: string;
    definition?: string;
    outputInfo?: string;
  };
  requirements?: RequirementInput[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data }: { data: ImportPayload } = body;

    if (!data?.task?.name?.trim()) {
      return apiError("VALIDATION_ERROR", "과업명은 필수입니다.");
    }

    // ── 과업: 수정 또는 신규 ────────────────────────────────
    let taskId: number;
    let taskSystemId: string;
    let isTaskNew = false;

    if (data.task.systemId) {
      const existing = await prisma.task.findUnique({
        where: { systemId: data.task.systemId },
        select: { taskId: true },
      });
      if (!existing) {
        return apiError("NOT_FOUND", `과업 ${data.task.systemId}를 찾을 수 없습니다.`);
      }
      taskId = existing.taskId;
      taskSystemId = data.task.systemId;
      await prisma.task.update({
        where: { taskId },
        data: {
          name: data.task.name.trim(),
          category: data.task.category || null,
          definition: data.task.definition || null,
          outputInfo: data.task.outputInfo || null,
        },
      });
    } else {
      taskSystemId = await generateSystemId("T");
      const created = await prisma.task.create({
        data: {
          systemId: taskSystemId,
          name: data.task.name.trim(),
          category: data.task.category || null,
          definition: data.task.definition || null,
          outputInfo: data.task.outputInfo || null,
        },
        select: { taskId: true },
      });
      taskId = created.taskId;
      isTaskNew = true;
    }

    // ── 요구사항 → 사용자스토리 upsert ────────────────────────
    let newReqs = 0, updReqs = 0, newStories = 0, updStories = 0;
    const resultRequirements: object[] = [];

    for (const reqData of data.requirements ?? []) {
      if (!reqData.name?.trim()) continue;

      let reqId: number;
      let reqSystemId: string;

      if (reqData.systemId) {
        const existing = await prisma.requirement.findUnique({
          where: { systemId: reqData.systemId },
          select: { requirementId: true },
        });
        if (!existing) {
          return apiError("NOT_FOUND", `요구사항 ${reqData.systemId}를 찾을 수 없습니다.`);
        }
        reqId = existing.requirementId;
        reqSystemId = reqData.systemId;
        await prisma.requirement.update({
          where: { requirementId: reqId },
          data: {
            name: reqData.name.trim(),
            taskId,
            originalContent: reqData.originalContent || null,
            currentContent: reqData.currentContent || null,
            detailSpec: reqData.detailSpec || null,
            priority: reqData.priority || null,
            source: reqData.source || "RFP",
          },
        });
        updReqs++;
      } else {
        reqSystemId = await generateSystemId("RQ");
        const created = await prisma.requirement.create({
          data: {
            systemId: reqSystemId,
            name: reqData.name.trim(),
            taskId,
            originalContent: reqData.originalContent || null,
            currentContent: reqData.currentContent || null,
            detailSpec: reqData.detailSpec || null,
            priority: reqData.priority || null,
            source: reqData.source || "RFP",
          },
          select: { requirementId: true },
        });
        reqId = created.requirementId;
        newReqs++;
      }

      const resultStories: object[] = [];

      for (const storyData of reqData.userStories ?? []) {
        if (!storyData.name?.trim()) continue;

        let storySystemId: string;

        if (storyData.systemId) {
          const existing = await prisma.userStory.findUnique({
            where: { systemId: storyData.systemId },
            select: { userStoryId: true },
          });
          if (!existing) {
            return apiError("NOT_FOUND", `사용자스토리 ${storyData.systemId}를 찾을 수 없습니다.`);
          }
          storySystemId = storyData.systemId;
          await prisma.userStory.update({
            where: { userStoryId: existing.userStoryId },
            data: {
              name: storyData.name.trim(),
              requirementId: reqId,
              persona: storyData.persona || null,
              scenario: storyData.scenario || null,
              acceptanceCriteria: storyData.acceptanceCriteria ?? [],
            },
          });
          updStories++;
        } else {
          storySystemId = await generateSystemId("US");
          await prisma.userStory.create({
            data: {
              systemId: storySystemId,
              name: storyData.name.trim(),
              requirementId: reqId,
              persona: storyData.persona || null,
              scenario: storyData.scenario || null,
              acceptanceCriteria: storyData.acceptanceCriteria ?? [],
            },
          });
          newStories++;
        }

        resultStories.push({ systemId: storySystemId, name: storyData.name.trim() });
      }

      resultRequirements.push({ systemId: reqSystemId, name: reqData.name.trim(), userStories: resultStories });
    }

    return apiSuccess({
      task: { systemId: taskSystemId, name: data.task.name.trim(), taskId, isNew: isTaskNew },
      requirements: resultRequirements,
      summary: {
        requirements: resultRequirements.length,
        userStories: newStories + updStories,
        new: { task: isTaskNew ? 1 : 0, requirements: newReqs, userStories: newStories },
        updated: { task: isTaskNew ? 0 : 1, requirements: updReqs, userStories: updStories },
      },
    });
  } catch (error) {
    console.error(error);
    return apiError("SERVER_ERROR", "가져오기 중 오류가 발생했습니다.", 500);
  }
}
