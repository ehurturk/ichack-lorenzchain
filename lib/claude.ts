"use server";

import Anthropic from "@anthropic-ai/sdk";

export async function generateFinancialEventAnalysis({
  inflationRate,
  interestRate,
  gdpGrowthRate,
}: {
  inflationRate: number;
  interestRate: number;
  gdpGrowthRate: number;
}) {
  const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
  });

  const prompt = `Analyze this financially provided parameters in a lorenz attractor setting and predict the next 15 monthly parameters based on the initial parameters. The parameters are: 

  "inflation rate: ${inflationRate}",
  "interest rate: ${interestRate}",
  "gdp growth rate: ${gdpGrowthRate}"

Please provide your response in the following JSON format:
{
  3: {
    "inflation_rate": (inflation rate),
    "interest_rate": (interest rate),
    "gdp_growth_rate": (gdp growth rate)
  },
  6: {
    "inflation_rate": (inflation rate),
    "interest_rate": (interest rate),
    "gdp_growth_rate": (gdp growth rate)
  },
  9: {
    "inflation_rate": (inflation rate),
    "interest_rate": (interest rate),
    "gdp_growth_rate": (gdp growth rate)
  },
  12: {
    "inflation_rate": (inflation rate),
    "interest_rate": (interest rate),
    "gdp_growth_rate": (gdp growth rate)
  },
  15: {
    "inflation_rate": (inflation rate),
    "interest_rate": (interest rate),
    "gdp_growth_rate": (gdp growth rate)
  },
}

Base the parameters on historical data where available, focusing on how this event affected:
1. Inflation rates (Measures price level changes, affected by interest rates.)
2. Interest rate (Controlled by central banks to manage inflation and growth.)
3. GDP Growth Rate (Indicates economic output, influenced by inflation and interest rates.)

ENSURE that the generated parameters are NORMALIZED to work with Lorenz Attractors, are ALL POSITIVE, and do not exceed 20.

- GDP Growth rate SHOULDn't exceed 5, and is at least 1.
- interestRate SHOULDN't exceed 10, and is at least 1.
- inflationRate SHOULDn't exceed 20, and is at least 1.

Output ONLY JSON and NOTHING ELSE.`;

  try {
    console.log("ZA");
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
    console.error("Error generating financial analysis:", error);
    throw error;
  }
}

// Example usage:
/*
const analysis = await generateFinancialEventAnalysis("2001 Turkish Economic Crisis");
const parameters = analysis.event.parameters;
const timeline = analysis.timeline;

// Use these values to update your visualization:
setParameters(parameters);
setTimeline(timeline);
*/
