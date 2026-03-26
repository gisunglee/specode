import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { generateSystemId } from "@/lib/sequence";
import { apiSuccess, apiError } from "@/lib/utils";

// ─── GET: 과업 → JSON 내보내기 ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");
  const mode   = searchParams.get("mode"); // "requirements" → taskSystemId 포맷으로 반환

  if (!taskId) return apiError("VALIDATION_ERROR", "taskId가 필요합니다.");

  const task = await prisma.task.findUnique({
    where: { taskId: parseInt(taskId) },
    include: {
      requirements: {
        orderBy: { requirementId: "asc" },
        include: { userStories: { orderBy: { userStoryId: "asc" } } },
      },
    },
  });

  if (!task) return apiError("NOT_FOUND", "과업을 찾을 수 없습니다.", 404);

  const requirementList = task.requirements.map((r) => ({
    systemId: r.systemId,
    name: r.name,
    originalContent: r.originalContent ?? "",
    currentContent: r.currentContent ?? "",
    detailSpec: r.detailSpec ?? "",
    discussionMd: r.discussionMd ?? "",
    priority: r.priority ?? "MEDIUM",
    source: r.source ?? "RFP",
    userStories: r.userStories.map((u) => ({
      systemId: u.systemId,
      name: u.name,
      persona: u.persona ?? "",
      scenario: u.scenario ?? "",
      acceptanceCriteria: (u.acceptanceCriteria as { text: string }[] | null) ?? [],
    })),
  }));

  // mode=requirements → taskSystemId 포맷 (요구사항만 수정할 때)
  if (mode === "requirements") {
    return apiSuccess({
      taskSystemId: task.systemId,
      requirements: requirementList,
    });
  }

  // 기본: tasks 중첩 구조 (과업 + 요구사항 전체)
  return apiSuccess({
    tasks: [{
      systemId: task.systemId,
      name: task.name,
      category: task.category ?? "",
      definition: task.definition ?? "",
      outputInfo: task.outputInfo ?? "",
      requirements: requirementList,
    }],
  });
}

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

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
  discussionMd?: string;
  priority?: string;
  source?: string;
  userStories?: UserStoryInput[];
}

interface TaskInput {
  systemId?: string;
  name: string;
  category?: string;
  definition?: string;
  outputInfo?: string;
  content?: string;
  requirements?: RequirementInput[];
}

interface ImportPayload {
  // ① 중첩 구조: tasks 배열 안에 requirements 포함 (Claude 기본 출력 / 다중 과업 지원)
  tasks?: TaskInput[];
  // ② 평탄 구조: task + requirements 분리 (하위 호환)
  task?: Omit<TaskInput, "requirements">;
  requirements?: RequirementInput[];
  // ③ 요구사항 단위: 기존 과업 ID만 지정 + requirements (과업 정보 없이 요구사항만 등록)
  taskSystemId?: string;
}

// ─── 내부 헬퍼: 단일 과업 처리 ───────────────────────────────────────────────

async function processTask(taskInput: TaskInput) {
  let taskId: number;
  let taskSystemId: string;
  let isTaskNew = false;

  if (taskInput.systemId) {
    const existing = await prisma.task.findUnique({
      where: { systemId: taskInput.systemId },
      select: { taskId: true },
    });
    if (!existing) throw new Error(`과업 ${taskInput.systemId}를 찾을 수 없습니다.`);
    taskId = existing.taskId;
    taskSystemId = taskInput.systemId;
    await prisma.task.update({
      where: { taskId },
      data: {
        name: taskInput.name.trim(),
        category: taskInput.category || null,
        definition: taskInput.definition || null,
        outputInfo: taskInput.outputInfo || null,
        content: taskInput.content || null,
      },
    });
  } else {
    taskSystemId = await generateSystemId("T");
    const created = await prisma.task.create({
      data: {
        systemId: taskSystemId,
        name: taskInput.name.trim(),
        category: taskInput.category || null,
        definition: taskInput.definition || null,
        outputInfo: taskInput.outputInfo || null,
        content: taskInput.content || null,
      },
      select: { taskId: true },
    });
    taskId = created.taskId;
    isTaskNew = true;
  }

  let newReqs = 0, updReqs = 0, newStories = 0, updStories = 0;
  const resultRequirements: object[] = [];

  for (const reqData of taskInput.requirements ?? []) {
    if (!reqData.name?.trim()) continue;

    let reqId: number;
    let reqSystemId: string;

    if (reqData.systemId) {
      const existing = await prisma.requirement.findUnique({
        where: { systemId: reqData.systemId },
        select: { requirementId: true },
      });
      if (!existing) throw new Error(`요구사항 ${reqData.systemId}를 찾을 수 없습니다.`);
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
          discussionMd: reqData.discussionMd || null,
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
          discussionMd: reqData.discussionMd || null,
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
        if (!existing) throw new Error(`사용자스토리 ${storyData.systemId}를 찾을 수 없습니다.`);
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

  return {
    task: { systemId: taskSystemId, name: taskInput.name.trim(), taskId, isNew: isTaskNew },
    requirements: resultRequirements,
    counts: { newReqs, updReqs, newStories, updStories },
  };
}

// ─── POST: JSON 가져오기 ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data }: { data: ImportPayload } = body;

    // 세 포맷을 tasks 배열로 정규화
    // ① tasks[] 중첩 구조 (Claude 기본 출력, 다중 과업)
    // ② task + requirements 분리 (하위 호환)
    // ③ taskSystemId + requirements (요구사항 단위 — 기존 과업에만 붙이기)
    let tasksToProcess: TaskInput[];

    if (data?.tasks && data.tasks.length > 0) {
      tasksToProcess = data.tasks;
    } else if (data?.task?.name?.trim()) {
      tasksToProcess = [{ ...data.task, requirements: data.requirements ?? [] }];
    } else if (data?.taskSystemId) {
      // ③ 요구사항 단위: 기존 과업을 DB에서 조회해서 name/systemId 채우기
      const existingTask = await prisma.task.findUnique({
        where: { systemId: data.taskSystemId },
        select: { taskId: true, name: true, systemId: true },
      });
      if (!existingTask) {
        return apiError("NOT_FOUND", `과업 ${data.taskSystemId}를 찾을 수 없습니다.`);
      }
      tasksToProcess = [{
        systemId: existingTask.systemId,
        name: existingTask.name,
        requirements: data.requirements ?? [],
      }];
    } else {
      return apiError("VALIDATION_ERROR", "tasks 배열, task 객체, 또는 taskSystemId 중 하나가 필요합니다.");
    }

    const results = [];
    let totalNewReqs = 0, totalUpdReqs = 0, totalNewStories = 0, totalUpdStories = 0;
    let newTasks = 0, updTasks = 0;

    for (const taskInput of tasksToProcess) {
      if (!taskInput.name?.trim()) continue;
      const result = await processTask(taskInput);
      results.push(result.task);
      totalNewReqs    += result.counts.newReqs;
      totalUpdReqs    += result.counts.updReqs;
      totalNewStories += result.counts.newStories;
      totalUpdStories += result.counts.updStories;
      result.task.isNew ? newTasks++ : updTasks++;
    }

    return apiSuccess({
      results,
      summary: {
        new:     { tasks: newTasks,  requirements: totalNewReqs, userStories: totalNewStories },
        updated: { tasks: updTasks,  requirements: totalUpdReqs, userStories: totalUpdStories },
      },
    });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : "가져오기 중 오류가 발생했습니다.";
    return apiError("SERVER_ERROR", msg, 500);
  }
}
