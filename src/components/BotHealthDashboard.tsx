import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Zap,
  Cpu,
  Layers,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Play,
  Pause,
  Sliders,
  Terminal,
  ShieldAlert,
  Flame,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Radio,
  Wifi,
  Database,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

interface TelegramClientStatus {
  id: number;
  name: string;
  type: 'bot' | 'user' | 'main';
  dcId: number;
  dcLocation: string;
  status: 'connected' | 'floodwait' | 'reconnecting' | 'standby';
  pingMs: number;
  workload: number; // active streams handled
  maxWorkload: number;
  throughputMbps: number;
  floodwaitRemainingSec: number;
  totalBytesDelivered: number; // in bytes
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'success' | 'debug';
  category: 'MTProto' | 'Prefetcher' | 'HTTP 206' | 'Bot Mode' | 'LoadBalancer';
  message: string;
}

export default function BotHealthDashboard() {
  const [isRunning, setIsRunning] = useState(true);
  const [preset, setPreset] = useState<'healthy' | 'high_load' | 'floodwait' | 'dc_mismatch'>('healthy');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Tunable configuration params
  const [maxClientFetches, setMaxClientFetches] = useState(4);
  const [concurrentFetches, setConcurrentFetches] = useState(3);
  const [prefetchQueueSize, setPrefetchQueueSize] = useState(6);

  // Dynamic Telemetry State
  const [systemUptimeSec, setSystemUptimeSec] = useState(38420);
  const [memoryMb, setMemoryMb] = useState(168);
  const [cpuPercent, setCpuPercent] = useState(14);
  const [totalBandwidthMBs, setTotalBandwidthMBs] = useState(14.8);
  const [activeQueueDepth, setActiveQueueDepth] = useState(4);
  const [queueLatencyMs, setQueueLatencyMs] = useState(12);

  const [clients, setClients] = useState<TelegramClientStatus[]>([
    {
      id: 0,
      name: 'Main Bot (Bot Mode)',
      type: 'main',
      dcId: 4,
      dcLocation: 'Amsterdam (DC4)',
      status: 'connected',
      pingMs: 22,
      workload: 1,
      maxWorkload: 10,
      throughputMbps: 0.8,
      floodwaitRemainingSec: 0,
      totalBytesDelivered: 420000000,
    },
    {
      id: 1,
      name: 'Worker Bot #1',
      type: 'bot',
      dcId: 4,
      dcLocation: 'Amsterdam (DC4)',
      status: 'connected',
      pingMs: 24,
      workload: 3,
      maxWorkload: 4,
      throughputMbps: 6.2,
      floodwaitRemainingSec: 0,
      totalBytesDelivered: 14800000000,
    },
    {
      id: 2,
      name: 'Worker Bot #2',
      type: 'bot',
      dcId: 2,
      dcLocation: 'London (DC2)',
      status: 'connected',
      pingMs: 31,
      workload: 2,
      maxWorkload: 4,
      throughputMbps: 4.9,
      floodwaitRemainingSec: 0,
      totalBytesDelivered: 11200000000,
    },
    {
      id: 3,
      name: 'Worker Bot #3',
      type: 'bot',
      dcId: 4,
      dcLocation: 'Amsterdam (DC4)',
      status: 'connected',
      pingMs: 26,
      workload: 2,
      maxWorkload: 4,
      throughputMbps: 3.7,
      floodwaitRemainingSec: 0,
      totalBytesDelivered: 8900000000,
    },
    {
      id: 4,
      name: 'Premium User Session',
      type: 'user',
      dcId: 5,
      dcLocation: 'Singapore (DC5)',
      status: 'standby',
      pingMs: 65,
      workload: 0,
      maxWorkload: 8,
      throughputMbps: 0,
      floodwaitRemainingSec: 0,
      totalBytesDelivered: 34000000000,
    },
  ]);

  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: '1',
      timestamp: '12:04:18',
      level: 'info',
      category: 'Bot Mode',
      message: 'Incoming message from Telegram user 987654321 processed in 42ms.',
    },
    {
      id: '2',
      timestamp: '12:04:20',
      level: 'success',
      category: 'HTTP 206',
      message: 'GET /stream?path=/Movies/Action/XV7K9M (Range: bytes=0-1048575) status=206 length=1.00MB',
    },
    {
      id: '3',
      timestamp: '12:04:21',
      level: 'debug',
      category: 'Prefetcher',
      message: 'Sliding window buffer primed: 3 chunks (3.0MB) ready in asyncio.Queue.',
    },
    {
      id: '4',
      timestamp: '12:04:23',
      level: 'info',
      category: 'LoadBalancer',
      message: 'Diverted next stream request to Worker Bot #2 (workload=2/4).',
    },
  ]);

  // Periodic Simulation Heartbeat
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSystemUptimeSec((prev) => prev + 2);

      // Fluctuations based on preset
      if (preset === 'healthy') {
        setCpuPercent(12 + Math.floor(Math.random() * 8));
        setMemoryMb(165 + Math.floor(Math.random() * 12));
        setTotalBandwidthMBs(+(12 + Math.random() * 5).toFixed(1));
        setActiveQueueDepth(3 + Math.floor(Math.random() * 3));
        setQueueLatencyMs(8 + Math.floor(Math.random() * 8));

        // Adjust workloads
        setClients((prev) =>
          prev.map((c) => {
            if (c.type === 'main') return c;
            if (c.status === 'floodwait') {
              const remaining = Math.max(0, c.floodwaitRemainingSec - 2);
              return {
                ...c,
                floodwaitRemainingSec: remaining,
                status: remaining === 0 ? 'connected' : 'floodwait',
              };
            }
            return {
              ...c,
              pingMs: c.dcId === 5 ? 64 + Math.floor(Math.random() * 10) : 22 + Math.floor(Math.random() * 6),
              throughputMbps: +(3 + Math.random() * 4).toFixed(1),
            };
          })
        );
      } else if (preset === 'high_load') {
        setCpuPercent(68 + Math.floor(Math.random() * 18));
        setMemoryMb(310 + Math.floor(Math.random() * 40));
        setTotalBandwidthMBs(+(32 + Math.random() * 12).toFixed(1));
        setActiveQueueDepth(prefetchQueueSize);
        setQueueLatencyMs(42 + Math.floor(Math.random() * 25));

        setClients((prev) =>
          prev.map((c) => ({
            ...c,
            workload: Math.min(c.maxWorkload, c.maxWorkload - Math.floor(Math.random() * 2)),
            throughputMbps: +(8 + Math.random() * 6).toFixed(1),
            pingMs: c.pingMs + Math.floor(Math.random() * 15),
          }))
        );
      } else if (preset === 'floodwait') {
        setCpuPercent(28 + Math.floor(Math.random() * 10));
        setMemoryMb(195 + Math.floor(Math.random() * 15));
        setTotalBandwidthMBs(+(7.4 + Math.random() * 3).toFixed(1));

        setClients((prev) =>
          prev.map((c) => {
            if (c.id === 2) {
              const rem = c.floodwaitRemainingSec > 0 ? c.floodwaitRemainingSec - 2 : 18;
              return {
                ...c,
                status: rem > 0 ? 'floodwait' : 'connected',
                floodwaitRemainingSec: rem,
                throughputMbps: 0,
                workload: 0,
              };
            }
            return {
              ...c,
              throughputMbps: +(5 + Math.random() * 3).toFixed(1),
            };
          })
        );
      } else if (preset === 'dc_mismatch') {
        setCpuPercent(18 + Math.floor(Math.random() * 6));
        setMemoryMb(175 + Math.floor(Math.random() * 10));
        setQueueLatencyMs(180 + Math.floor(Math.random() * 90));
        setClients((prev) =>
          prev.map((c) => ({
            ...c,
            pingMs: c.dcId === 5 ? 280 + Math.floor(Math.random() * 50) : 140 + Math.floor(Math.random() * 30),
          }))
        );
      }

      // Generate simulated event log
      const timeStr = new Date().toTimeString().split(' ')[0];
      const sampleEvents: LogEntry[] = [
        {
          id: Math.random().toString(),
          timestamp: timeStr,
          level: 'debug',
          category: 'MTProto',
          message: `GetFile(offset=${Math.floor(Math.random() * 80) * 1048576}, limit=1048576) returned in ${Math.floor(Math.random() * 30 + 35)}ms.`,
        },
        {
          id: Math.random().toString(),
          timestamp: timeStr,
          level: 'info',
          category: 'Prefetcher',
          message: `Chunk delivered to HTTP stream socket. Window advanced by 1 MiB.`,
        },
        {
          id: Math.random().toString(),
          timestamp: timeStr,
          level: 'success',
          category: 'HTTP 206',
          message: `VLC client Range request satisfied without buffer underflow.`,
        },
      ];

      const chosenEvent = sampleEvents[Math.floor(Math.random() * sampleEvents.length)];
      setLogs((prev) => [chosenEvent, ...prev.slice(0, 39)]);
    }, 1800);

    return () => clearInterval(interval);
  }, [isRunning, preset, prefetchQueueSize]);

  // Compute overall health score
  const hasFloodWait = clients.some((c) => c.status === 'floodwait');
  const isHighLoad = cpuPercent > 65 || queueLatencyMs > 60;
  const healthScore = hasFloodWait ? 74 : isHighLoad ? 82 : preset === 'dc_mismatch' ? 88 : 99;

  const totalWorkers = clients.filter((c) => c.type === 'bot').length;
  const activeWorkerThreads = clients
    .filter((c) => c.type === 'bot')
    .reduce((acc, c) => acc + (c.status === 'connected' ? c.workload : 0), 0);
  const maxThreadsAllowed = totalWorkers * maxClientFetches;

  const formatBytes = (bytes: number) => {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(0) + ' MB';
    return (bytes / 1024).toFixed(0) + ' KB';
  };

  const formatUptime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const filteredLogs = logs.filter((log) => {
    if (filterCategory === 'all') return true;
    return log.category.toLowerCase().includes(filterCategory.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Ribbon */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-600 via-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Activity className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Bot Health & Concurrency Monitor</h2>
                <span
                  className={`px-2.5 py-0.5 text-xs font-bold rounded-full flex items-center gap-1 border ${
                    healthScore > 90
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : healthScore > 75
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {healthScore}% {healthScore > 90 ? 'Healthy' : healthScore > 75 ? 'Moderate Load' : 'Throttled'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time MTProto telemetry, sliding-window chunk queue depth, and thread pool load-balancing.
              </p>
            </div>
          </div>

          {/* Simulation Toggle and Scenario Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                isRunning
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5" /> Pause Live Feed
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Resume Feed
                </>
              )}
            </button>

            <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                onClick={() => setPreset('healthy')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition ${
                  preset === 'healthy' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
                }`}
                title="Normal optimal streaming"
              >
                Normal
              </button>
              <button
                onClick={() => setPreset('high_load')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition ${
                  preset === 'high_load' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
                }`}
                title="Simulate high traffic peak"
              >
                Traffic Surge
              </button>
              <button
                onClick={() => setPreset('floodwait')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition ${
                  preset === 'floodwait' ? 'bg-rose-500 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
                }`}
                title="Simulate FloodWait rate limit"
              >
                FloodWait
              </button>
              <button
                onClick={() => setPreset('dc_mismatch')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition ${
                  preset === 'dc_mismatch' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
                }`}
                title="Cross-region latency"
              >
                DC Latency
              </button>
            </div>
          </div>
        </div>

        {/* Global KPIs Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              <span>Active MTProto Sessions</span>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white flex items-baseline gap-1">
              <span>{clients.filter((c) => c.status === 'connected').length}</span>
              <span className="text-xs text-slate-500 font-normal">/ {clients.length} online</span>
            </div>
            <div className="text-[10px] text-emerald-400">1 Main Bot + 3 Workers</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              <span>Worker Threads Pool</span>
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-lg font-bold text-white flex items-baseline gap-1">
              <span>{activeWorkerThreads}</span>
              <span className="text-xs text-slate-500 font-normal">/ {maxThreadsAllowed} slots</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  activeWorkerThreads / maxThreadsAllowed > 0.8 ? 'bg-amber-400' : 'bg-cyan-400'
                }`}
                style={{ width: `${Math.min(100, (activeWorkerThreads / maxThreadsAllowed) * 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              <span>Buffer Queue Depth</span>
              <Layers className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-lg font-bold text-white flex items-baseline gap-1">
              <span>{activeQueueDepth}</span>
              <span className="text-xs text-slate-500 font-normal">/ {prefetchQueueSize} chunks</span>
            </div>
            <div className="text-[10px] text-slate-400">{queueLatencyMs}ms queue latency</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              <span>Streaming Throughput</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-emerald-400 flex items-baseline gap-1">
              <span>{totalBandwidthMBs}</span>
              <span className="text-xs text-slate-400 font-normal">MB/s</span>
            </div>
            <div className="text-[10px] text-slate-500">Max link capacity: 100 MB/s</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              <span>RAM & CPU Load</span>
              <Server className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-lg font-bold text-white flex items-baseline gap-1">
              <span>{memoryMb}</span>
              <span className="text-xs text-slate-400 font-normal">MB</span>
            </div>
            <div className="text-[10px] text-slate-400">CPU: {cpuPercent}% load</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              <span>Process Uptime</span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-sm font-bold text-white mt-1">
              {formatUptime(systemUptimeSec)}
            </div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Auto-pinger Active
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Telegram Clients on Left, Thread & Queue on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Active Telegram Client Connections (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Active Telegram Client Connections ({clients.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Multi-Client Load Balancing</span>
          </div>

          <div className="space-y-3">
            {clients.map((client) => {
              const workloadPct = (client.workload / client.maxWorkload) * 100;
              return (
                <div
                  key={client.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    client.status === 'floodwait'
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : client.status === 'connected'
                      ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/30 border-slate-800/60 opacity-75'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          client.status === 'connected'
                            ? 'bg-emerald-400 animate-pulse'
                            : client.status === 'floodwait'
                            ? 'bg-rose-500 animate-ping'
                            : 'bg-slate-500'
                        }`}
                      />
                      <span className="font-semibold text-sm text-slate-100">{client.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {client.dcLocation}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      {client.status === 'floodwait' ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold text-[11px] border border-rose-500/30 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-rose-400" />
                          FloodWait ({client.floodwaitRemainingSec}s auto-sleep)
                        </span>
                      ) : (
                        <>
                          <span className="text-slate-400 text-[11px] font-mono">
                            Ping: <strong className="text-slate-200">{client.pingMs}ms</strong>
                          </span>
                          <span className="text-emerald-400 text-[11px] font-mono font-semibold">
                            {client.throughputMbps} MB/s
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Workload Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Concurrent Stream Workload</span>
                      <span className="font-mono">
                        {client.workload} / {client.maxWorkload} slots ({workloadPct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          client.status === 'floodwait'
                            ? 'bg-rose-500'
                            : workloadPct > 75
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                        style={{ width: `${workloadPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Total Transferred: <strong className="text-slate-400">{formatBytes(client.totalBytesDelivered)}</strong></span>
                    <span>Role: {client.type === 'main' ? 'Telegram Bot Mode API' : client.type === 'user' ? '4GB Premium MTProto Session' : 'Standard 2GB MTProto Worker'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Notice about Multi-Client Acceleration */}
          <div className="p-3 bg-emerald-950/20 rounded-xl border border-emerald-500/20 flex items-start gap-2.5 text-xs text-emerald-300/90">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Bandwidth Multiplier Tip:</strong> Telegram enforces strict download rate limits (~2-3 MB/s per bot token). Adding multiple tokens in your <code className="text-emerald-200 bg-emerald-950/60 px-1 py-0.5 rounded">BOT_TOKENS=tok1,tok2,tok3</code> config automatically balances video chunks across all tokens, enabling speeds up to <strong>20-30+ MB/s</strong>!
            </div>
          </div>
        </div>

        {/* Right Column: Thread Pool, Queue Status & Bottleneck Diagnoser (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Worker Thread Concurrency Slots */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Worker Thread Allocation</h3>
              </div>
              <span className="text-xs text-cyan-400 font-mono font-semibold">
                {activeWorkerThreads} / {maxThreadsAllowed} Active
              </span>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                Telegram MTProto Semaphore slots (<code className="text-slate-300">_CLIENT_SEMAPHORES</code>):
              </div>
              
              {/* Thread Slot Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {Array.from({ length: maxThreadsAllowed }).map((_, idx) => {
                  const isActive = idx < activeWorkerThreads;
                  const isFloodWait = hasFloodWait && idx >= activeWorkerThreads - 2 && idx < activeWorkerThreads;
                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        isFloodWait
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                          : isActive
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-500/20'
                          : 'bg-slate-950 border-slate-800/80 text-slate-600'
                      }`}
                    >
                      <div className="text-[10px] font-mono text-slate-400">Slot #{idx + 1}</div>
                      <div className="text-xs font-bold mt-0.5">
                        {isFloodWait ? 'Wait' : isActive ? 'BUSY' : 'IDLE'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Concurrency Tuning Sliders */}
              <div className="pt-2 border-t border-slate-800 space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>MAX_CLIENT_FETCHES (Parallel per bot)</span>
                    <span className="font-mono text-cyan-400 font-bold">{maxClientFetches}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="8"
                    value={maxClientFetches}
                    onChange={(e) => setMaxClientFetches(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>2 (Conservative)</span>
                    <span>4 (Default/Optimal)</span>
                    <span>8 (Aggressive)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>CONCURRENT_FETCHES (Sliding Window Chunks)</span>
                    <span className="font-mono text-emerald-400 font-bold">{concurrentFetches}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    value={concurrentFetches}
                    onChange={(e) => setConcurrentFetches(Number(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>1 (Sequential)</span>
                    <span>3 (Balanced 3MB buffer)</span>
                    <span>6 (High speed)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Streaming Queue Pipeline Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Sliding Buffer Queue Status
                </h3>
              </div>
              <span className="text-xs text-purple-400 font-mono font-semibold">
                {activeQueueDepth} / {prefetchQueueSize} Chunks
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>In-Memory Buffer Size</span>
                <span className="font-mono font-bold text-white">{(activeQueueDepth * 1.0).toFixed(1)} MB / {(prefetchQueueSize * 1.0).toFixed(1)} MB</span>
              </div>

              {/* Visual Pipeline Flow */}
              <div className="flex items-center gap-1.5 p-2 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto text-[11px] font-mono">
                <div className="px-2 py-1 bg-slate-800 rounded text-slate-300 shrink-0">MTProto In</div>
                <span className="text-slate-600">→</span>
                <div className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded border border-purple-500/30 shrink-0">
                  Buffer Queue ({activeQueueDepth})
                </div>
                <span className="text-slate-600">→</span>
                <div className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30 shrink-0">
                  HTTP 206 Out
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-slate-500">Buffer Hit Ratio</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">99.8%</div>
                  <div className="text-[10px] text-slate-500">Zero video stutter</div>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-slate-500">Queue Fetch Latency</div>
                  <div className="text-sm font-bold text-white mt-0.5">{queueLatencyMs} ms</div>
                  <div className="text-[10px] text-slate-500">Sub-50ms seek latency</div>
                </div>
              </div>
            </div>
          </div>

          {/* Runtime Bottleneck Diagnoser & Advice Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Runtime Diagnostic Engine
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
              {preset === 'healthy' && (
                <div className="space-y-1 text-slate-300">
                  <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All Runtime Subsystems Optimal
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Telegram MTProto response times are sub-35ms across DC4 and DC2. Chunks are pre-buffered ahead of browser requests. No FloodWait throttling detected.
                  </p>
                </div>
              )}

              {preset === 'high_load' && (
                <div className="space-y-1 text-slate-300">
                  <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> High Traffic Detected (Thread Utilization 85%)
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    <strong>Recommendation:</strong> Add 2 additional bot tokens to <code className="text-amber-300">BOT_TOKENS</code> in your <code className="text-amber-300">.env</code> file. Telegram limits individual bot tokens to ~20 requests/sec. Adding more tokens distributes workload without raising rate limits.
                  </p>
                </div>
              )}

              {preset === 'floodwait' && (
                <div className="space-y-1 text-slate-300">
                  <div className="font-semibold text-rose-400 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" /> Telegram FloodWait on Worker #2 (Auto-Protected)
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    <strong>Fixed Behavior in Action:</strong> The updated <code className="text-slate-200">custom_dl.py</code> caught the FloodWait exception and paused Worker #2 for 18 seconds without dropping active user video streams. Active connections were diverted to Worker #1 and Worker #3!
                  </p>
                </div>
              )}

              {preset === 'dc_mismatch' && (
                <div className="space-y-1 text-slate-300">
                  <div className="font-semibold text-cyan-400 flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5" /> Cross-DC Route Latency Notice
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Telegram storage channel media is hosted on DC4 (Amsterdam). When server hosts in Singapore or US, cross-region MTProto transfer adds ~150-250ms latency per chunk. Deploying on a European host (e.g. Frankfurt, Amsterdam) minimizes latency to &lt;20ms.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Live Telegram Socket & Chunk Streaming Event Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              Live MTProto & Stream Event Feed
            </h3>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
              Real-time
            </span>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1 text-xs">
            {(['all', 'MTProto', 'Prefetcher', 'HTTP 206', 'Bot Mode'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition ${
                  filterCategory === cat
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white bg-slate-900/60'
                }`}
              >
                {cat}
              </button>
            ))}
            <button
              onClick={() => setLogs([])}
              className="ml-2 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-300 bg-slate-950 border border-slate-800 rounded-lg"
              title="Clear logs"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Terminal Window */}
        <div className="p-4 bg-slate-950 font-mono text-xs max-h-72 overflow-y-auto space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-500 text-center py-6">No events matching selected filter.</div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2.5 leading-relaxed">
                <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] shrink-0 font-bold uppercase ${
                    log.category === 'MTProto'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : log.category === 'Prefetcher'
                      ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      : log.category === 'HTTP 206'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {log.category}
                </span>
                <span
                  className={`${
                    log.level === 'warn'
                      ? 'text-amber-300'
                      : log.level === 'success'
                      ? 'text-emerald-300'
                      : 'text-slate-300'
                  }`}
                >
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
