import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type EssayMode = "academic" | "general";
type EssayTask = "task1" | "task2";

type SaveDraftRequest = {
  userId: string | null;
  questionId: string;
  mode: EssayMode;
  task: EssayTask;
  essay: string;
};

export async function POST(req: Request) {
  try {
    let body: SaveDraftRequest;
    try {
      body = (await req.json()) as SaveDraftRequest;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { userId, questionId, mode, task, essay } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId (must be logged in to autosave)" },
        { status: 400 }
      );
    }

    if (!questionId || !mode || !task) {
      return NextResponse.json(
        { error: "Missing required fields: questionId, mode, task" },
        { status: 400 }
      );
    }

    const rows = await prisma.$queryRaw<{ id: string; updated_at: Date }[]>`
      insert into essay_drafts (user_id, question_id, mode, task, essay_text)
      values (${userId}, ${questionId}, ${mode}, ${task}, ${essay})
      on conflict (user_id, question_id)
      do update set
        essay_text = excluded.essay_text,
        mode       = excluded.mode,
        task       = excluded.task,
        updated_at = now()
      returning id, updated_at
    `;

    const row = rows[0];
    if (!row) {
      return NextResponse.json(
        { error: "Failed to save draft" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: row.id,
      updatedAt: row.updated_at.toISOString(),
    });
  } catch (err) {
    console.error("Unexpected error in POST /api/drafts:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const questionId = url.searchParams.get("questionId");
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId in query string" },
        { status: 400 }
      );
    }

    if (!questionId) {
      return NextResponse.json(
        { error: "Missing questionId in query string" },
        { status: 400 }
      );
    }

    const rows = await prisma.$queryRaw<
      {
        id: string;
        question_id: string;
        mode: string;
        task: string;
        essay_text: string;
        updated_at: Date;
      }[]
    >`
      select id, question_id, mode, task, essay_text, updated_at
      from essay_drafts
      where user_id = ${userId}
        and question_id = ${questionId}
      limit 1
    `;

    const row = rows[0];

    if (!row) {
      return NextResponse.json({ draft: null });
    }

    return NextResponse.json({
      draft: {
        id: row.id,
        questionId: row.question_id,
        mode: row.mode as EssayMode,
        task: row.task as EssayTask,
        essay: row.essay_text,
        updatedAt: row.updated_at.toISOString(),
      },
    });
  } catch (err) {
    console.error("Unexpected error in GET /api/drafts:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
