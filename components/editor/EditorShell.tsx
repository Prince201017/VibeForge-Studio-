'use client';

import React, { useState } from 'react';

export function EditorShell() {
  const [command, setCommand] = useState('');
  const [logs, setLogs] = useState([
    { time: '00:00:00', type: 'info', msg: 'ForgeOS v0.1.0 initialized' },
    { time: '00:00:01', type: 'success', msg: '✓ All 13 systems loaded' },
    { time: '00:00:02', type: 'info', msg: '> Ready for input' },
  ]);

  const handleCommand = (cmd: string) => {
    const newLog = { time: new Date().toLocaleTimeString(), type: 'command', msg: `$ ${cmd}` };
    setLogs([...logs, newLog]);
    setCommand('');

    setTimeout(() => {
      let response = { time: new Date().toLocaleTimeString(), type: 'info', msg: 'unknown command' };
      
      if (cmd.includes('help')) {
        response = { 
          time: new Date().toLocaleTimeString(), 
          type: 'info', 
          msg: 'Commands: new layer | geometry voronoi | animation play | ai generate | export mp4 | help' 
        };
      } else if (cmd.includes('geometry')) {
        response = { time: new Date().toLocaleTimeString(), type: 'success', msg: '✓ Geometry engine ready' };
      } else if (cmd.includes('animation')) {
        response = { time: new Date().toLocaleTimeString(), type: 'success', msg: '✓ Animation timeline active' };
      } else if (cmd.includes('ai')) {
        response = { time: new Date().toLocaleTimeString(), type: 'success', msg: '✓ AI design generation ready' };
      } else if (cmd.includes('clear')) {
        setLogs([]);
        return;
      }
      
      setLogs(prev => [...prev, response]);
    }, 100);
  };

  return (
    <div className="w-screen h-screen bg-black text-green-400 font-mono flex flex-col overflow-hidden border border-green-900">
      <div className="h-8 bg-green-950 border-b border-green-900 flex items-center px-4 text-xs">
        <span className="text-green-500">ForgeOS Terminal</span>
        <span className="ml-auto text-green-600">[Connected] 13/13 Systems Ready</span>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-1 text-sm">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-green-600 min-w-20">{log.time}</span>
            <span className={
              log.type === 'command' ? 'text-green-400' :
              log.type === 'success' ? 'text-green-500 font-bold' :
              log.type === 'error' ? 'text-red-500' :
              'text-green-300'
            }>
              {log.msg}
            </span>
          </div>
        ))}
      </div>

      <div className="h-12 bg-green-950 border-t border-green-900 flex items-center px-4 gap-2">
        <span className="text-green-500">$</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && command.trim()) {
              handleCommand(command.trim());
            }
          }}
          placeholder="Enter command... (type 'help' for options)"
          className="flex-1 bg-transparent outline-none text-green-400 placeholder-green-700"
          autoFocus
        />
      </div>

      <div className="h-6 bg-green-950 border-t border-green-900 flex items-center px-4 text-xs text-green-600 gap-4">
        <span>Systems: 13/13</span>
        <span>Files: 484</span>
        <span>Status: READY</span>
      </div>
    </div>
  );
}
