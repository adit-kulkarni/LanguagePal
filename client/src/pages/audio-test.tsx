import React from 'react';
import { SimpleAudioTest } from '../components/simple-audio-test';

export default function AudioTestPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Audio Testing Page</h1>
      <p className="mb-4">This page contains a simplified audio player for testing and debugging.</p>
      
      <SimpleAudioTest />
    </div>
  );
}