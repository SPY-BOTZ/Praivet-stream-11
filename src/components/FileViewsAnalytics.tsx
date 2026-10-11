import React, { useState } from 'react';
import {
  Eye,
  Download,
  Users,
  Film,
  TrendingUp,
  Clock,
  Globe,
  Smartphone,
  Laptop,
  CheckCircle2,
  Copy,
  Check,
  Play,
  Bot,
  Filter,
  Search,
  Sparkles,
  BarChart3
} from 'lucide-react';

interface TrackedFileItem {
  id: string;
  name: string;
  folder: string;
  size: number;
  type: 'video' | 'audio' | 'document';
  views: number;
  downloads: number;
  lastViewed: string;
}

interface MemberViewLog {
  id: string;
  fileName: string;
  action: 'stream' | 'download';
  ip: string;
  location: string;
  device: string;
  time: string;
}

export default function FileViewsAnalytics() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'video' | 'audio' | 'document'>('all');

  const [files, setFiles] = useState<TrackedFileItem[]>([
    {
      id: 'XV7K9M',
      name: 'Deadpool.and.Wolverine.2024.1080p.mp4',
      folder: '/Movies/Action',
      size: 2147483648,
      type: 'video',
      views: 342,
      downloads: 128,
      lastViewed: 'Just now',
    },
    {
      id: 'PL9B2Q',
      name: 'Interstellar.IMAX.2160p.Web-DL.mkv',
      folder: '/Movies/Sci-Fi',
      size: 3865470566,
      type: 'video',
      views: 289,
      downloads: 94,
      lastViewed: '4 mins ago',
    },
    {
      id: 'KJ8A1L',
      name: 'Rockstar_Complete_Album_320kbps.zip',
      folder: '/Music/Hindi',
      size: 145000000,
      type: 'audio',
      views: 184,
      downloads: 112,
      lastViewed: '12 mins ago',
    },
    {
      id: 'ZZ4M7N',
      name: 'Python_Telegram_Bot_Course_Guide.pdf',
      folder: '/Documents/Study',
      size: 42000000,
      type: 'document',
      views: 95,
      downloads: 68,
      lastViewed: '25 mins ago',
    },
    {
      id: 'BC1D9X',
      name: 'Stranger.Things.S04E09.720p.mkv',
      folder: '/Series/Stranger Things',
      size: 890000000,
      type: 'video',
      views: 247,
      downloads: 83,
      lastViewed: '40 mins ago',
    },
  ]);

  const [logs, setLogs] = useState<MemberViewLog[]>([
    {
      id: '1',
      fileName: 'Deadpool.and.Wolverine.2024.1080p.mp4',
      action: 'stream',
      ip: '103.21.***.45',
      location: 'India (Mumbai)',
      device: 'Chrome Mobile / Android',
      time: '12:42:15',
    },
    {
      id: '2',
      fileName: 'Deadpool.and.Wolverine.2024.1080p.mp4',
      action: 'download',
      ip: '45.112.***.89',
      location: 'Pakistan (Karachi)',
      device: 'IDM Download Manager',
      time: '12:40:02',
    },
    {
      id: '3',
      fileName: 'Interstellar.IMAX.2160p.Web-DL.mkv',
      action: 'stream',
      ip: '152.58.***.112',
      location: 'India (Delhi)',
      device: 'VLC Media Player',
      time: '12:38:44',
    },
    {
      id: '4',
      fileName: 'Rockstar_Complete_Album_320kbps.zip',
      action: 'download',
      ip: '182.74.***.61',
      location: 'India (Bangalore)',
      device: 'Safari / iPhone iOS 17',
      time: '12:35:10',
    },
    {
      id: '5',
      fileName: 'Stranger.Things.S04E09.720p.mkv',
      action: 'stream',
      ip: '106.210.***.14',
      location: 'Bangladesh (Dhaka)',
      device: 'Firefox / Windows 11',
      time: '12:31:55',
    },
  ]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSimulateView = (fileId: string, action: 'stream' | 'download') => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === fileId) {
          return {
            ...f,
            views: f.views + 1,
            downloads: action === 'download' ? f.downloads + 1 : f.downloads,
            lastViewed: 'Just now',
          };
        }
        return f;
      })
    );

    const targetFile = files.find((f) => f.id === fileId);
    if (targetFile) {
      const timeStr = new Date().toTimeString().split(' ')[0];
      const newLog: MemberViewLog = {
        id: Math.random().toString(),
        fileName: targetFile.name,
        action: action,
        ip: `152.${Math.floor(Math.random() * 80 + 20)}.***.${Math.floor(Math.random() * 200 + 10)}`,
        location: 'India / User Device',
        device: action === 'stream' ? 'HTML5 Video Player (Mobile)' : 'Direct HTTP Browser Download',
        time: timeStr,
      };
      setLogs((prev) => [newLog, ...prev.slice(0, 19)]);
    }
  };

  const totalViews = files.reduce((acc, f) => acc + f.views, 0);
  const totalDownloads = files.reduce((acc, f) => acc + f.downloads, 0);
  const totalFiles = files.length;
  const estimatedMembers = Math.round(totalViews * 0.65);

  const formatSize = (bytes: number) => {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
    return (bytes / 1024).toFixed(2) + ' KB';
  };

  const filteredFiles = files.filter((f) => {
    if (selectedFilter !== 'all' && f.type !== selectedFilter) return false;
    if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Member Views & File Analytics</h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Real-time Tracking
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Track karein konsa member konsi video/file kitni baar dekh raha hai ya download kar raha hai.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-400" />
              <span>Telegram Command: <strong>/stats</strong></span>
            </div>
          </div>
        </div>

        {/* Global Counters Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              <span>Total Video Views & Streams</span>
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">{totalViews.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500">+18% this week</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              <span>Total File Downloads</span>
              <Download className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-cyan-400 font-mono">{totalDownloads.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500">Direct HTTP downloads</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              <span>Estimated Unique Members</span>
              <Users className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-400 font-mono">{estimatedMembers.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500">Distinct IP / Device sessions</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
              <span>Indexed Files</span>
              <Film className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">{totalFiles}</div>
            <div className="text-[10px] text-slate-500">In TG Drive storage</div>
          </div>
        </div>
      </div>

      {/* Main Content: Files Table & Telegram Bot Stats Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Tracked Files List (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Files Popularity & View Counter
              </h3>
            </div>

            {/* Filter and Search */}
            <div className="flex items-center gap-2 text-xs">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search file name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-2.5 py-1.5 pl-7 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2" />
              </div>

              <div className="flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
                {(['all', 'video', 'audio', 'document'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedFilter(cat)}
                    className={`px-2 py-1 rounded text-[11px] font-medium capitalize transition ${
                      selectedFilter === cat
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Files List */}
          <div className="space-y-3">
            {filteredFiles.map((file) => {
              const maxViewsInList = Math.max(...files.map((f) => f.views));
              const popularityPct = (file.views / maxViewsInList) * 100;

              return (
                <div
                  key={file.id}
                  className="p-3.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl space-y-2.5 transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs">
                        {file.type === 'video' ? '🎬' : file.type === 'audio' ? '🎵' : '📄'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate max-w-sm sm:max-w-md">
                          {file.name}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>{file.folder}</span>
                          <span>•</span>
                          <span className="font-mono">{formatSize(file.size)}</span>
                          <span>•</span>
                          <span>Last viewed: <strong className="text-slate-300">{file.lastViewed}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* View Metrics */}
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      <div className="text-right">
                        <div className="text-emerald-400 font-bold font-mono text-sm flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> {file.views} views
                        </div>
                        <div className="text-slate-500 text-[10px]">
                          {file.downloads} downloads
                        </div>
                      </div>

                      {/* Simulation Action Buttons */}
                      <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
                        <button
                          onClick={() => handleSimulateView(file.id, 'stream')}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1"
                          title="Simulate someone watching this video"
                        >
                          <Play className="w-3 h-3 text-emerald-400" /> +1 View
                        </button>
                        <button
                          onClick={() => handleSimulateView(file.id, 'download')}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1"
                          title="Simulate someone downloading this file"
                        >
                          <Download className="w-3 h-3 text-cyan-400" /> +1 DL
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Relative Popularity Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-800/60 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                        style={{ width: `${popularityPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Telegram Bot /stats Message Preview (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Telegram /stats Response Simulation */}
          <div className="bg-[#18222d] border border-[#243343] rounded-2xl p-5 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#2b3b4d] pb-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-bold text-sky-400">
                <Bot className="w-4 h-4" /> Telegram Bot: /stats Command
              </span>
              <span>Command</span>
            </div>

            <div className="text-xs text-slate-200 space-y-2 font-mono leading-relaxed bg-[#0f1721] p-3.5 rounded-xl border border-[#223142]">
              <div className="font-bold text-emerald-400 font-sans text-sm">
                📊 TG Drive File Views & Analytics
              </div>
              <div className="pt-1">📁 <strong>Total Files:</strong> {totalFiles}</div>
              <div>👁 <strong>Total Views / Streams:</strong> {totalViews}</div>
              <div>📥 <strong>Total Downloads:</strong> {totalDownloads}</div>
              
              <div className="pt-2 text-amber-300 font-bold font-sans">
                🔥 Top Most Viewed Files:
              </div>
              {files.slice(0, 3).map((f, i) => (
                <div key={f.id} className="text-[11px] text-slate-300">
                  {i + 1}. <strong>{f.name.substring(0, 22)}...</strong>
                  <br />
                  <span className="text-slate-500 pl-3">👁 {f.views} views • 📥 {f.downloads} dl</span>
                </div>
              ))}
            </div>

            <div className="text-[11px] text-slate-400 leading-normal bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              💡 <strong>Telegram Bot Me Kaise Dekhein:</strong> Apne bot ko private chat me <code className="text-emerald-400 font-mono">/stats</code> ya <code className="text-emerald-400 font-mono">/views</code> bhejein. Bot upar diye format me live views send kar dega!
            </div>
          </div>

          {/* Quick API Endpoint Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl text-xs">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-cyan-400" />
              Website Analytics Endpoints
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Updated backend me yeh 2 endpoints add kar diye gaye hain jise aap browser ya website me call kar sakte hain:
            </p>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="p-2 bg-slate-950 rounded border border-slate-800 text-emerald-400">
                GET /api/analytics
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800 text-sky-400">
                GET /api/fileStats?path=/Movies/Action/XV7K9M
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Section: Recent Member Access & Visitor Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Recent Member Access & Device History (Konsa Member Kahan Se Dekh Raha Hai)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">Last 30 Access Logs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Action</th>
                <th className="p-3">File Name</th>
                <th className="p-3">Member IP / Region</th>
                <th className="p-3">Device / Client App</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 font-mono text-xs">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition">
                  <td className="p-3 text-slate-400">{log.time}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.action === 'stream'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      }`}
                    >
                      {log.action === 'stream' ? '🎬 Stream' : '📥 Download'}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-white font-sans truncate max-w-xs">
                    {log.fileName}
                  </td>
                  <td className="p-3 text-slate-300">
                    <div>{log.ip}</div>
                    <div className="text-[10px] text-slate-500 font-sans">{log.location}</div>
                  </td>
                  <td className="p-3 text-slate-400 font-sans text-xs">
                    {log.device}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
