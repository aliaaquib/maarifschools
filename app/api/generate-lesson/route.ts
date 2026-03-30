import { NextRequest, NextResponse } from "next/server";

function buildFallbackLessonPlan(topic: string) {
  return [
    `Cambridge Lesson Plan`,
    "",
    `Topic: ${topic}`,
    "",
    "Learning objective",
    `Students will understand and explain the key ideas related to ${topic} using subject-specific vocabulary.`,
    "",
    "Success criteria",
    `By the end of the lesson, learners can describe ${topic}, complete a guided task, and respond to an exit reflection.`,
    "",
    "Starter",
    `Activate prior knowledge with a quick think-pair-share on ${topic} and collect key responses.`,
    "",
    "Teaching input",
    `Model the main concept, explain vocabulary clearly, and demonstrate one worked example connected to ${topic}.`,
    "",
    "Guided practice",
    "Support learners through a paired task with questioning, checking for understanding, and live feedback.",
    "",
    "Independent practice",
    "Set a short individual task with scaffolded support for developing learners and extension for confident learners.",
    "",
    "Assessment for learning",
    "Use targeted questioning, mini whiteboards, or quick checks to measure understanding during the lesson.",
    "",
    "Differentiation",
    "Provide vocabulary support, sentence starters, and extension prompts to meet mixed attainment levels.",
    "",
    "Plenary",
    `Close with an exit ticket asking learners to summarise ${topic} and identify one remaining question.`,
  ].join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { topic?: string };
    const topic = body.topic?.trim();

    if (!topic) {
      return NextResponse.json({ error: "Topic is required." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ lessonPlan: buildFallbackLessonPlan(topic), source: "fallback" });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text:
                  "You create Cambridge-style classroom lesson plans for teachers. Return plain text only. Structure the response with these headings: Topic, Learning objective, Success criteria, Starter, Teaching input, Guided practice, Independent practice, Assessment for learning, Differentiation, Plenary, Homework or next step. Keep the plan practical, concise, and classroom-ready.",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Create a Cambridge-style lesson plan from this teacher request: ${topic}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: errorText || "OpenAI request failed.",
        },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as {
      output_text?: string;
    };

    return NextResponse.json({
      lessonPlan: payload.output_text ?? buildFallbackLessonPlan(topic),
      source: "openai",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to generate lesson plan.",
      },
      { status: 500 },
    );
  }
}
