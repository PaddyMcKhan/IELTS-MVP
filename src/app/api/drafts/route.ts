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
    const body = await req.json();
    const { userId, questionId, mode, task, essay } = body;

    if (!userId || typeof questionId === "undefined") {
      return NextResponse.json(
        { message: "Missing userId or questionId" },
        { status: 400 }
      );
    }

    const qid = parseInt(String(questionId), 10);
    if (Number.isNaN(qid)) {
      return NextResponse.json(
        { message: "Invalid questionId" },
        { status: 400 }
      );
    }

    const rows = await prisma.$queryRaw<{ id: string; updated_at: Date }[]>`
      insert into essay_drafts (user_id, question_id, mode, task, essay_text)
      values (${userId}::uuid, ${qid}::int, ${mode}, ${task}, ${essay})
      on conflict (user_id, question_id) do update
      set essay_text = excluded.essay_text,
          mode = excluded.mode,
          task = excluded.task,
          updated_at = now()
      returning id, updated_at;
    `;

    const [row] = rows;

    return NextResponse.json({
      id: row.id,
      updatedAt: row.updated_at.toISOString(),
    });
  } catch (error: any) {
    console.error("Unexpected error in POST /api/drafts:", error);
    return NextResponse.json(
      { message: "Unexpected error", details: String(error?.message ?? error) },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const questionIdRaw = searchParams.get("questionId");

    if (!userId || !questionIdRaw) {
      return NextResponse.json(
        { message: "Missing userId or questionId" },
        { status: 400 }
      );
    }

    const questionId = parseInt(questionIdRaw, 10);
    if (Number.isNaN(questionId)) {
      return NextResponse.json(
        { message: "Invalid questionId" },
        { status: 400 }
      );
    }

    const rows = await prisma.$queryRaw<
      {
        id: string;
        question_id: number;
        essay_text: string;
        updated_at: Date;
      }[]
    >`
      select id, question_id, essay_text, updated_at
      from essay_drafts
      where user_id = ${userId}::uuid
        and question_id = ${questionId}::int
      order by updated_at desc
      limit 1;
    `;

    if (!rows.length) {
      return NextResponse.json({ draft: null });
    }

    const [row] = rows;

    return NextResponse.json({
      draft: {
        id: row.id,
        questionId: row.question_id,
        essay: row.essay_text,
        updatedAt: row.updated_at.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Unexpected error in GET /api/drafts:", error);
    return NextResponse.json(
      { message: "Unexpected error", details: String(error?.message ?? error) },
      { status: 500 }
    );
  }
}

