import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SystemNode {
  id: string;
  name: string;
  status: 'online' | 'offline';
  details: string;
  children?: SystemNode[];
}

const initialData: SystemNode = {
  id: 'root',
  name: 'Core System',
  status: 'online',
  details: 'Main system controller',
  children: [
    {
      id: 'sub1',
      name: 'Subsystem A',
      status: 'online',
      details: 'Handles data processing',
    },
    {
      id: 'sub2',
      name: 'Subsystem B',
      status: 'offline',
      details: 'Handles network communication',
    }
  ]
};

export const SystemStatusMindMap: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<SystemNode | null>(null);

  const renderNode = (node: SystemNode) => (
    <div key={node.id} className="flex flex-col items-center">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setSelectedNode(node)}
        className={`w-24 h-24 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 ${
          node.status === 'online' ? 'bg-green-500/20 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'bg-red-500/20 border-red-500'
        }`}
      >
        {node.name}
      </motion.button>
      {node.children && (
        <div className="flex gap-4 mt-4">
          {node.children.map(renderNode)}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-8 bg-space-900 text-white rounded-lg shadow-xl">
      <h2 className="text-xl font-bold mb-8">System Status Mind Map</h2>
      {renderNode(initialData)}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-8 p-4 bg-space-800 rounded-lg border border-white/10"
          >
            <h3 className="font-bold">{selectedNode.name}</h3>
            <p className="text-sm text-gray-400">{selectedNode.details}</p>
            <p className="text-sm mt-2">Status: <span className={selectedNode.status === 'online' ? 'text-green-500' : 'text-red-500'}>{selectedNode.status}</span></p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
