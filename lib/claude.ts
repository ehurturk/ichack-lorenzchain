"use server";

import { MarkerData } from "@/app/components/ButterflyEffect";
import Anthropic from "@anthropic-ai/sdk";

export async function generateNarrative({
  markerState,
}: {
  markerState: MarkerData[];
}) {
  const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  markerState = markerState.filter((k, v) => k !== undefined);

  const prompt = `Given this sequence of economic changes over time:
  ${markerState
    .map(
      (data) => `
    Month ${data.timepoint}:
    - Inflation Rate: ${data.statistics["Inflation Rate"]}
    - Interest Rate: ${data.statistics["Interest Rate"]}
    - GDP Growth Rate: ${data.statistics["GDP Growth Rate"]}
  `
    )
    .join("\n")}

  Please generate a narrative chain of events for EACH MONTH that:
  1. Explains each major economic transition
  2. Describes the chain of cause and effect
  3. Analyzes potential market reactions
  4. Suggests policy implications
  5. Identifies butterfly effect moments where small changes led to significant outcomes
  
  Format each event point as JSON of:
  - Event: [what happened]
  - Impact: [immediate effect]
  - Chain Reaction: [how it led to next events]
  - System Effects: [broader economic implications]
  - Key Insight: [butterfly effect observation]

  output ONLY JSON, nothing else.
  if there is error, output empty JSON object.
  `;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2, // Lower temperature for more consistent outputs
    });
    // Get the text from the first content block
    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || !("text" in textContent)) {
      throw new Error("No text content found in response");
    }
    // Parse and validate the response
    const analysis = JSON.parse(textContent.text);

    return analysis;
  } catch (error) {
    console.error("Error generating economic narrative:", error);
    throw error;
  }
}
