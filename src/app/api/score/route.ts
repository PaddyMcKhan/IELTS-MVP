import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!, // Make sure this is set in Vercel + local
});

// The shape of the response we will return to the frontend
type ScoreResult = {
  taskResponse: number;
  coherence: number;
  lexical: number;
  grammar: number;
  overall: number;
  comments: {
    overview: string;
    taskResponse: string;
    coherence: string;
    lexical: string;
    grammar: string;
    advice: string;
  };
};

export async function POST(req: Request) {
  try {
    const { essay, task, wordCount, question } = await req.json();

    const minWords = task === "task1" ? 150 : 250;

    const prompt = `
You are an official IELTS Writing Examiner.

Evaluate the following Task ${task === "task1" ? "1" : "2"} essay using the 
**IELTS Academic Writing band descriptors**.

Return scores ONLY in band values (0.0 to 9.0). 
Round to the nearest **0.5**.

---

### **Essay Question**
${question}

### **Candidate's Essay**
${essay}

### **Word Count:** ${wordCount}
### **Minimum Required:** ${minWords}

---

### Produce a JSON object with EXACTLY this structure:

{
  "taskResponse": number,
  "coherence": number,
  "lexical": number,
  "grammar": number,
  "overall": number,
  "comments": {
    "overview": string,
    "taskResponse": string,
    "coherence": string,
    "lexical": string,
    "grammar": string,
    "advice": string
  }
}

Only output valid JSON. No explanations. No markdown.
    `;

    const completion = await client.responses.create({
      model: "gpt-4o",
      input: prompt,
      max_output_tokens: 1024,
    });

    const raw = completion.output_text;
    const json = JSON.parse(raw) as ScoreResult;

    return NextResponse.json(json);
  } catch (err: any) {
    console.error("Scoring error:", err);
    return NextResponse.json(
      { error: "Failed to score essay", detail: err?.message },
      { status: 500 }
    );
  }
}
