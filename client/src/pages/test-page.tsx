import React from 'react';

const TestPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <h1 className="text-2xl font-bold mb-4">Test Page</h1>
      <p className="text-muted-foreground mb-4">This is a simple test page to verify rendering.</p>
      <div className="p-4 border rounded bg-card">
        <p>If you can see this, the basic rendering system is working.</p>
      </div>
    </div>
  );
};

export default TestPage;