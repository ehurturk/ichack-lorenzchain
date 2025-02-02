import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface Statistics {
  [key: string]: string;
}

type EventType = "positive" | "negative" | "neutral";

interface TimelineEventData {
  title: string;
  date: string;
  description: string;
  type: EventType;
  consequences?: string[];
  statistics?: Statistics;
}

interface LorenzPoint {
  x: number;
  y: number;
  z: number;
}

interface EconomicPrediction {
  gdpChange: number;
  inflation: number;
  gdpGrowthRate: number;
  confidence: number;
}

export interface TimelineData {
  originalEvent: TimelineEventData;
  alternativeEvents: TimelineEventData[];
}

interface TimelineEventProps {
  event: TimelineEventData;
  isLast: boolean;
}

const TimelineEvent: React.FC<TimelineEventProps> = ({ event, isLast }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getEventIcon = (type: EventType) => {
    switch (type) {
      case "positive":
        return <TrendingUp className="text-green-500" />;
      case "negative":
        return <TrendingDown className="text-red-500" />;
      case "neutral":
        return <AlertCircle className="text-blue-500" />;
      default:
        return <ChevronRight />;
    }
  };

  return (
    <div className="relative">
      <div
        className={`flex items-start space-x-4 cursor-pointer p-4 hover:bg-gray-50 rounded-lg transition-colors
          ${isExpanded ? "bg-gray-50" : ""}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="mt-1">{getEventIcon(event.type)}</div>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-400">
              {event.date}
            </span>
            <ArrowRight className="w-4 h-4 text-gray-300" />
            <span className="font-medium">{event.title}</span>
          </div>

          {isExpanded && (
            <div className="mt-2 text-sm text-gray-600 space-y-2">
              <p>{event.description}</p>
              {event.consequences && (
                <div className="mt-3">
                  <div className="font-medium text-sm text-gray-500">
                    Key Effects:
                  </div>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {event.consequences.map((consequence, idx) => (
                      <li key={idx} className="text-gray-600">
                        {consequence}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {event.statistics && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  {Object.entries(event.statistics).map(([key, value]) => (
                    <div key={key} className="bg-gray-100 p-2 rounded">
                      <div className="text-xs text-gray-500">{key}</div>
                      <div className="font-medium">{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!isLast && (
        <div className="absolute left-6 top-8 bottom-0 w-px bg-gray-200" />
      )}
    </div>
  );
};

interface AlternativeTimelineProps {
  timeline?: TimelineData;
}

const AlternativeTimeline: React.FC<AlternativeTimelineProps> = ({
  timeline,
}) => {
  // Example structure for timeline data from Claude:
  const sampleTimeline: TimelineData = {
    originalEvent: {
      title: "2001 Turkish Economic Crisis",
      date: "Feb 2001",
      description:
        "A severe financial crisis triggered by a dispute between President and PM",
      type: "negative",
      statistics: {
        "Exchange Rate": "1.5M TL/USD",
        Inflation: "68.5%",
        "GDP Growth Rate": "-5.7%",
      },
    },
    alternativeEvents: [
      {
        date: "Mar 2001",
        title: "Modified Monetary Policy Response",
        description:
          "In this timeline, the central bank maintains higher interest rates...",
        type: "positive",
        consequences: [
          "Inflation stabilizes at 45% instead of 68.5%",
          "Currency depreciation limited to 25%",
          "Smaller GDP contraction of -3.2%",
        ],
        statistics: {
          "Interest Rate": "70%",
          "Exchange Rate": "1.2M TL/USD",
        },
      },
      {
        date: "Jun 2001",
        title: "Economic Recovery Program",
        description: "Alternative fiscal measures implemented...",
        type: "neutral",
        consequences: [
          "Faster recovery in manufacturing sector",
          "Reduced unemployment impact",
          "Earlier return to growth",
        ],
      },
    ],
  };

  const timelineData = timeline || sampleTimeline;

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-1">Original Event</h3>
          <TimelineEvent event={timelineData.originalEvent} isLast={false} />
        </div>

        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-1">Alternative Timeline</h3>
          <div className="space-y-1">
            {timelineData.alternativeEvents.map((event, idx) => (
              <TimelineEvent
                key={idx}
                event={event}
                isLast={idx === timelineData.alternativeEvents.length - 1}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const generateLorenzTrajectory = (
  parameters: {
    inflationRate: number;
    interestRate: number;
    gdpGrowthRate: number;
  },
  steps: number = 1000
): LorenzPoint[] => {
  const points: LorenzPoint[] = [];

  // Map financial parameters to Lorenz parameters
  const sigma = 10 * (parameters.inflationRate / 50); // Higher inflation = more chaos
  const rho = 28 * (parameters.interestRate / 5); // Interest rate affects overall system energy
  const beta = (8 / 3) * (parameters.gdpGrowthRate / 1.5); // Exchange rate affects system stability

  let x = 0.1;
  let y = 0;
  let z = 0;
  const dt = 0.01;

  for (let i = 0; i < steps; i++) {
    const dx = sigma * (y - x) * dt;
    const dy = (x * (rho - z) - y) * dt;
    const dz = (x * y - beta * z) * dt;

    x += dx;
    y += dy;
    z += dz;

    points.push({ x, y, z });
  }

  return points;
};

const predictEconomicOutcomes = (
  trajectory: LorenzPoint[],
  originalParams: {
    inflationRate: number;
    interestRate: number;
    gdpGrowthRate: number;
  }
): EconomicPrediction[] => {
  // Take samples at different points in the trajectory
  const predictions: EconomicPrediction[] = [];

  // Sample points at 3, 6, and 12 months
  const samplePoints = [
    Math.floor(trajectory.length * 0.25),
    Math.floor(trajectory.length * 0.5),
    Math.floor(trajectory.length * 0.75),
  ];

  samplePoints.forEach((index) => {
    const point = trajectory[index];

    // Map Lorenz coordinates to economic indicators
    // This is a simplified mapping - you might want to make it more sophisticated
    const gdpChange =
      (point.x / 20) * (1 - Math.abs(originalParams.inflationRate - 50) / 100);
    const inflation = originalParams.inflationRate * (1 + point.y / 50);
    const gdpGrowthRate = originalParams.gdpGrowthRate * (1 + point.z / 30);

    // Confidence decreases as we go further in time
    const confidence = 1 - index / trajectory.length;

    predictions.push({
      gdpChange,
      inflation,
      gdpGrowthRate,
      confidence,
    });
  });

  return predictions;
};

const generateAlternativeTimeline = (
  event: string,
  originalParams: {
    inflationRate: number;
    interestRate: number;
    gdpGrowthRate: number;
  },
  modifiedParams: {
    inflationRate: number;
    interestRate: number;
    gdpGrowthRate: number;
  }
): TimelineData => {
  const originalTrajectory = generateLorenzTrajectory(originalParams);
  const alternativeTrajectory = generateLorenzTrajectory(modifiedParams);

  const originalPredictions = predictEconomicOutcomes(
    originalTrajectory,
    originalParams
  );
  const alternativePredictions = predictEconomicOutcomes(
    alternativeTrajectory,
    modifiedParams
  );

  // Generate timeline data
  const timeline: TimelineData = {
    originalEvent: {
      title: event,
      date: "Present",
      description: `Original scenario with Inflation: ${originalParams.inflationRate}%, Interest Rate: ${originalParams.interestRate}%, Exchange Rate: ${originalParams.gdpGrowthRate}`,
      type: "neutral",
      statistics: {
        "Inflation Rate": `${originalParams.inflationRate}%`,
        "Interest Rate": `${originalParams.interestRate}%`,
        "GDP Growth Rate": originalParams.gdpGrowthRate.toFixed(2),
      },
    },
    alternativeEvents: [],
  };

  // Map predictions to timeline events
  const timeframes = ["3 months", "6 months", "12 months"];
  alternativePredictions.forEach((prediction, index) => {
    const originalPrediction = originalPredictions[index];
    const isPositive = prediction.gdpChange > originalPrediction.gdpChange;

    timeline.alternativeEvents.push({
      date: timeframes[index],
      title: `Economic Indicators at ${timeframes[index]}`,
      description: `Predicted state of economy based on modified parameters. Confidence: ${(
        prediction.confidence * 100
      ).toFixed(1)}%`,
      type: isPositive ? "positive" : "negative",
      statistics: {
        "GDP Change": `${prediction.gdpChange.toFixed(1)}%`,
        Inflation: `${prediction.inflation.toFixed(1)}%`,
        "Exchange Rate": prediction.gdpGrowthRate.toFixed(2),
      },
      consequences: [
        `GDP growth ${
          isPositive ? "improves" : "declines"
        } to ${prediction.gdpChange.toFixed(1)}%`,
        `Inflation ${
          prediction.inflation > originalPrediction.inflation
            ? "increases"
            : "decreases"
        } to ${prediction.inflation.toFixed(1)}%`,
        `Exchange rate ${
          prediction.gdpGrowthRate > originalPrediction.gdpGrowthRate
            ? "rises"
            : "falls"
        } to ${prediction.gdpGrowthRate.toFixed(2)}`,
      ],
    });
  });

  return timeline;
};

export { generateAlternativeTimeline, generateLorenzTrajectory };

export default AlternativeTimeline;
