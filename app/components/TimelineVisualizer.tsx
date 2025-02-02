interface TimelineVisualizerProps {
  timelines: string[];
}

export default function TimelineVisualizer({
  timelines,
}: TimelineVisualizerProps) {
  return (
    <div className="mt-6">
      <h2 className="text-2xl font-bold mb-4">Generated Timelines</h2>
      {timelines.map((timeline, index) => (
        <div key={index} className="p-4 bg-gray-50 rounded-lg mb-2">
          {timeline}
        </div>
      ))}
    </div>
  );
}
