import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const API_KEY =
  "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";
const SYSTEM_PROMPT = `You are an intelligent decision-making assistant that helps users explore potential futures based on their decisions. Your role in this application has two main functions:

1. Clarifying Questions:
   - If you see a numbered list, follow scenario generation below.
   - When you receive an initial scenario (for example, "Studying CS"), generate 2-3 concise, insightful clarifying questions.
   - Only output the questions in a JSON format.
   - These questions should uncover the user's preferences, priorities, and underlying motivations related to the scenario.
   - The questions should be clear, engaging, and designed to help the user articulate what matters most to them.

2. Scenario Generation:
   - When you receive the user's answers to your clarifying questions, generate several (e.g., 3-5) possible future scenarios branching from the original scenario.
   - For each generated scenario, include the following:
       a. A title or label summarizing the scenario.
       b. A detailed description outlining what the scenario entails.
       c. An estimated probability or likelihood of the scenario occurring.
   - Ensure that these scenarios are structured clearly so that they can be easily parsed and visualized in a decision tree.

Note: The process is recursive. After presenting you with a scenario, you ask clarifying questions, then upon receiving the answers, you generate further scenarios. This cycle may repeat indefinitely as the user explores deeper branches.

Please process the current input according to these rules.`;

const anthropic = new Anthropic({
  apiKey: API_KEY,
});

// Define the TypeScript interface for the request body
interface History {
  name: string;
  questions: string[] | null;
  answer: string[] | null;
}

// Generic function to call Claude API
async function callClaude(input: History[], type: "questions" | "options") {
  try {
    const prompt =
      type === "questions"
        ? `You are a career advisor. Given the following input: "${JSON.stringify(
            input
          )}", which is JSON of previous career choices history, generate 3 follow-up questions to help the user explore their career options. Return the questions as a JSON array.`
        : `You are a career advisor. Given the following input: "${JSON.stringify(
            input
          )}", which is JSON of previous career choices history, generate 3 options that could be used as potential answers to help the user choose as an option for career. Return the options as a JSON array.`;

    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    return { result: msg.content[0] };
  } catch (error) {
    console.error("Error calling Claude API:", error);
    return { error: "Failed to generate response", status: 500 };
  }
}

// Handle POST requests
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      input: History[];
      type: "questions" | "options";
    };
    const { input, type } = body;

    if (!input || !type || !["questions", "options"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const response = await callClaude(input, type);
    return NextResponse.json(response);
  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
