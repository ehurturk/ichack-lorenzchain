import { Tree } from "@/types/types";

interface TreeVisualizerProps {
  tree: Tree;
  onNodeClick: (node: Tree) => void;
}

export default function TreeVisualizer({
  tree,
  onNodeClick,
}: TreeVisualizerProps) {
  const renderTree = (node: Tree) => (
    <div key={node.value} className="ml-4 my-2">
      <div
        className="p-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200"
        onClick={() => onNodeClick(node)}
      >
        {node.value}
      </div>
      {node.trees.map((child) => (child ? renderTree(child) : null))}
    </div>
  );

  return <div>{renderTree(tree)}</div>;
}
