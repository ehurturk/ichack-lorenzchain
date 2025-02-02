import { useState } from "react";

interface InputFormProps {
  onGenerate: (topic: string) => void;
}

export default function InputForm({ onGenerate }: InputFormProps) {
  const [topic, setTopic] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(topic);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Enter a topic or question"
        className="p-2 border border-gray-300 rounded-lg w-full"
      />
      <button
        type="submit"
        className="mt-2 p-2 bg-blue-500 text-white rounded-lg w-full hover:bg-blue-600"
      >
        Generate Decision Tree
      </button>
    </form>
  );
}
