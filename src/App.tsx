import React, { useState } from 'react';
import { 
  Download, 
  CheckCircle2, 
  Play, 
  FileText, 
  Bot, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  AlertCircle, 
  Server, 
  ShieldCheck, 
  Film, 
  HardDrive, 
  Sliders, 
  Layers, 
  Code2, 
  ChevronRight,
  Terminal,
  Zap,
  RefreshCw,
  Eye,
  Activity
} from 'lucide-react';
import { FIXED_FILES, FixedFile } from './data/fixedFiles';
import BotHealthDashboard from './components/BotHealthDashboard';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'health' | 'bot_simulator' | 'files' | 'stream_tester' | 'deploy'>('overview');
  const [selectedFile, setSelectedFile] = useState<FixedFile>(FIXED_FILES[0]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Bot Simulator State
  const [simWebsiteUrl, setSimWebsiteUrl] = useState('https://my-tgdrive.koyeb.app');
  const [simFileName, setSimFileName] = useState('Avatar.2024.1080p.Web-DL.mp4');
  const [simFileSize, setSimFileSize] = useState(1450000000); // ~1.35 GB
  const [simFolder, setSimFolder] = useState('/Movies/Action');
  const [simMediaType, setSimMediaType] = useState<'video' | 'audio' | 'document' | 'photo'>('video');

  // Deployment .env state
  const [envConfig, setEnvConfig] = useState({
    apiId: '12345678',
    apiHash: '0123456789abcdef0123456789abcdef',
    botToken: '7123456789:AAHq_EXAMPLE_TOKEN_TgDrive',
    workerTokens: '7123456789:AAHq_EXAMPLE_TOKEN_TgDrive',
    storageChannel: '-1002345678901',
    backupMsgId: '2',
    adminPassword: 'admin',
    websiteUrl: 'https://my-tgdrive.koyeb.app',
    telegramAdminIds: '987654321',
  });

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2200);
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return bytes + ' B';
  };

  const simFileId = 'XV7K9M';
  const simCleanFolder = simFolder.replace(/^\/+|\/+$/g, '');
  const simFilePath = '/' + (simCleanFolder ? `${simCleanFolder}/${simFileId}` : simFileId);
  const simDownloadUrl = `${simWebsiteUrl.replace(/\/+$/, '')}/file?path=${simFilePath}`;
  const simStreamUrl = `${simWebsiteUrl.replace(/\/+$/, '')}/stream?path=${simFilePath}`;
  const simDriveUrl = `${simWebsiteUrl.replace(/\/+$/, '')}/?path=${simFolder}`;

  const generatedEnvContent = `# TG Drive Fixed Configuration
API_ID=${envConfig.apiId}
API_HASH=${envConfig.apiHash}
MAIN_BOT_TOKEN=${envConfig.botToken}
BOT_TOKENS=${envConfig.workerTokens}
STRING_SESSIONS=
STORAGE_CHANNEL=${envConfig.storageChannel}
DATABASE_BACKUP_MSG_ID=${envConfig.backupMsgId}
ADMIN_PASSWORD=${envConfig.adminPassword}
WEBSITE_URL=${envConfig.websiteUrl}
TELEGRAM_ADMIN_IDS=${envConfig.telegramAdminIds}
DATABASE_BACKUP_TIME=60
SLEEP_THRESHOLD=60
`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* Top Banner & Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">TG Drive Fix & Stream Suite</h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 100% Fixed
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Flawless Video Streaming • Direct Bot Links • Parallel Prefetch Download
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <a
              href="/Telegram-Drive-Fixed.zip"
              download="Telegram-Drive-Fixed.zip"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold text-sm rounded-lg shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>Download Fixed Zip</span>
              <span className="text-xs bg-slate-950/20 px-1.5 py-0.5 rounded text-slate-900 font-mono">.zip</span>
            </a>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto border-t border-slate-800/80 gap-1 text-sm no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Overview & Fixes
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`px-4 py-2.5 font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'health'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            Bot Health Dashboard
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
          </button>
          <button
            onClick={() => setActiveTab('bot_simulator')}
            className={`px-4 py-2.5 font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'bot_simulator'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            Bot Mode Link Generator
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`px-4 py-2.5 font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'files'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            Code Explorer ({FIXED_FILES.length} Files)
          </button>
          <button
            onClick={() => setActiveTab('stream_tester')}
            className={`px-4 py-2.5 font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'stream_tester'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="w-4 h-4" />
            Stream & Range Diagnostics
          </button>
          <button
            onClick={() => setActiveTab('deploy')}
            className={`px-4 py-2.5 font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'deploy'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            Deployment & .env Setup
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Hero Banner */}
            <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 p-6 sm:p-8 overflow-hidden shadow-xl">
              <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  Telegram Drive Bot Full Bug Fix Complete
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  Aapka Telegram Drive Bot ab Stream & Download Flawlessly Karega!
                </h2>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  Sabhi issues ko dhyan se diagnose karke code me complete fixes apply kar diye gaye hain. Bot mode me file forward/send karne par ab <strong className="text-emerald-400">Direct Download Link</strong>, <strong className="text-emerald-400">Online Stream Link</strong> aur <strong className="text-emerald-400">Web Drive Link</strong> instant buttons ke sath milta hai. Saath hi video range headers aur chunk buffering optimize kar di gayi hai.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <a
                    href="/Telegram-Drive-Fixed.zip"
                    download="Telegram-Drive-Fixed.zip"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    Download Fixed Zip (Telegram-Drive-Fixed.zip)
                  </a>
                  <button
                    onClick={() => setActiveTab('health')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-all shadow"
                  >
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Live Health Dashboard
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </button>
                  <button
                    onClick={() => setActiveTab('bot_simulator')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-all"
                  >
                    <Bot className="w-4 h-4 text-emerald-400" />
                    Test Bot Link Generator
                  </button>
                  <button
                    onClick={() => setActiveTab('files')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-all"
                  >
                    <Code2 className="w-4 h-4 text-cyan-400" />
                    View Fixed Files
                  </button>
                </div>
              </div>
            </div>

            {/* Detailed Problems & Fixes Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* Fix 1 */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-3 hover:border-slate-700 transition">
                <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h3 className="font-bold text-white text-base">Video Stream Failed & 416 Errors</h3>
                <div className="text-xs text-rose-300/90 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                  <strong>Problem:</strong> Video player me <code className="text-rose-200">part_count</code> calculation 0 ho raha tha (ceil - floor). Saath hi 200 OK me Content-Range header bhej raha tha jo browser video player ko crash karta hai.
                </div>
                <div className="text-xs text-emerald-300/90 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                  <strong>Fix Applied:</strong> Math chunk boundaries exact formula se theek ki gayi. RFC 7233 compliant: Content-Range sirf 206 Partial Content par jaata hai. Full seek support activated!
                </div>
              </div>

              {/* Fix 2 */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-3 hover:border-slate-700 transition">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h3 className="font-bold text-white text-base">Bot Mode Direct File Links</h3>
                <div className="text-xs text-rose-300/90 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                  <strong>Problem:</strong> Bot me file send karne par sirf "File Uploaded" text message aata tha, koi direct download ya streaming link nahi milta tha.
                </div>
                <div className="text-xs text-emerald-300/90 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                  <strong>Fix Applied:</strong> <code className="text-emerald-200">utils/bot_mode.py</code> me direct download link, stream link aur folder link auto-generate karke inline clickable buttons ke sath bheja jata hai!
                </div>
              </div>

              {/* Fix 3 */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-3 hover:border-slate-700 transition">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <h3 className="font-bold text-white text-base">Download Speed & Buffer Stalls</h3>
                <div className="text-xs text-rose-300/90 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                  <strong>Problem:</strong> 1-1 chunk sequentially fetch hota tha jisse video lag karti thi aur download speed slow hoti thi. FloodWait aane par stream tut jaata tha.
                </div>
                <div className="text-xs text-emerald-300/90 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                  <strong>Fix Applied:</strong> <code className="text-emerald-200">custom_dl.py</code> me sliding-window prefetcher lagaya jo 3 chunks parallel buffer me rakhta hai. FloodWait auto-sleep protection added.
                </div>
              </div>

              {/* Fix 4 */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-3 hover:border-slate-700 transition">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
                  4
                </div>
                <h3 className="font-bold text-white text-base">Photo & Sticker Upload Crash</h3>
                <div className="text-xs text-rose-300/90 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                  <strong>Problem:</strong> User jab photo, sticker ya audio bhejta tha to <code className="text-rose-200">AttributeError: 'Photo' has no file_name</code> se bot crash ho jata tha.
                </div>
                <div className="text-xs text-emerald-300/90 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                  <strong>Fix Applied:</strong> Safe media detection logic lagayi gayi jo timestamped <code className="text-emerald-200">photo_YYYYMMDD.jpg</code> generate karti hai. Never crashes!
                </div>
              </div>

              {/* Fix 5 */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-3 hover:border-slate-700 transition">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                  5
                </div>
                <h3 className="font-bold text-white text-base">VideoPlayer.html Black Screen</h3>
                <div className="text-xs text-rose-300/90 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                  <strong>Problem:</strong> Video.js initialize hone ke baad <code className="text-rose-200">&lt;source&gt;</code> me src set hota tha, jisse player blank/stuck reh jata tha.
                </div>
                <div className="text-xs text-emerald-300/90 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                  <strong>Fix Applied:</strong> Player loader ko rewrite kiya gaya jo direct stream load karta hai, VLC player shortcut deta hai aur mobile par smoothly chalta hai.
                </div>
              </div>

              {/* Fix 6 */}
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-3 hover:border-slate-700 transition">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                  6
                </div>
                <h3 className="font-bold text-white text-base">Unencoded URL Parsing Crash</h3>
                <div className="text-xs text-rose-300/90 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                  <strong>Problem:</strong> <code className="text-rose-200">/stream?url=https://site/file?path=/xyz</code> me do question marks <code className="text-rose-200">?</code> hone se path parameter kat jata tha aur 500 error deta tha.
                </div>
                <div className="text-xs text-emerald-300/90 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                  <strong>Fix Applied:</strong> Ab <code className="text-emerald-200">/stream?path=/xyz</code> direct support karta hai aur sabhi URLs <code className="text-emerald-200">encodeURIComponent</code> ke sath bante hain.
                </div>
              </div>

            </div>

            {/* What you get in the zip */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                Package Contents inside Telegram-Drive-Fixed.zip
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 flex items-start gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-200">start_main.py & main.py</div>
                    <div className="text-slate-400">FastAPI runner with updated /file & /stream routes.</div>
                  </div>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 flex items-start gap-2">
                  <Bot className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-200">utils/bot_mode.py</div>
                    <div className="text-slate-400">Instant direct download & stream link sender.</div>
                  </div>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 flex items-start gap-2">
                  <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-200">utils/streamer/</div>
                    <div className="text-slate-400">RFC Range handler & sliding-window prefetcher.</div>
                  </div>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 flex items-start gap-2">
                  <Film className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-200">website/VideoPlayer.html</div>
                    <div className="text-slate-400">Modernized HTML5 web streaming player.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: BOT HEALTH DASHBOARD */}
        {activeTab === 'health' && <BotHealthDashboard />}

        {/* TAB 2: BOT MODE SIMULATOR */}
        {activeTab === 'bot_simulator' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Bot Mode Link Generation Simulator</h3>
                  <p className="text-xs text-slate-400">
                    Test karein ki jab aap Telegram Bot me koi file send karenge to bot aapko kaise direct link provide karega!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Your Website Public Domain (WEBSITE_URL)</label>
                  <input
                    type="text"
                    value={simWebsiteUrl}
                    onChange={(e) => setSimWebsiteUrl(e.target.value)}
                    placeholder="https://my-drive.koyeb.app"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[11px] text-slate-500">Is URL ko aapko apne .env file me WEBSITE_URL ke roop me set karna hota hai.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Folder in TG Drive</label>
                  <input
                    type="text"
                    value={simFolder}
                    onChange={(e) => setSimFolder(e.target.value)}
                    placeholder="/Movies"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[11px] text-slate-500">Bot command /set_folder se choose kiya gaya folder.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Simulated File Name</label>
                  <input
                    type="text"
                    value={simFileName}
                    onChange={(e) => setSimFileName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Media Category</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['video', 'audio', 'document', 'photo'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setSimMediaType(type);
                          if (type === 'video') setSimFileName('Interstellar.2014.1080p.mp4');
                          if (type === 'audio') setSimFileName('Podcast_Episode_42.mp3');
                          if (type === 'document') setSimFileName('Software_Setup_v2.zip');
                          if (type === 'photo') setSimFileName('photo_20261011_050012.jpg');
                        }}
                        className={`py-2 px-1 text-xs font-medium rounded-lg capitalize border transition ${
                          simMediaType === type
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Telegram Message Preview Box */}
            <div className="bg-[#18222d] border border-[#243343] rounded-2xl p-6 shadow-2xl max-w-xl mx-auto space-y-4">
              <div className="flex items-center justify-between border-b border-[#2b3b4d] pb-3 text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-semibold text-sky-400">
                  <Bot className="w-4 h-4" /> TG Drive Bot (Response Preview)
                </span>
                <span>Just now</span>
              </div>

              {/* Bot Message Body */}
              <div className="space-y-3 text-sm text-slate-200 leading-relaxed font-sans">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> File Uploaded Successfully!
                </div>

                <div className="space-y-1 text-xs font-mono bg-[#0f1721] p-3 rounded-lg border border-[#223142]">
                  <div><span className="text-slate-400">📄 File Name:</span> <span className="text-white font-bold">{simFileName}</span></div>
                  <div><span className="text-slate-400">💾 File Size:</span> <span className="text-emerald-400">{formatSize(simFileSize)}</span></div>
                  <div><span className="text-slate-400">📁 Folder:</span> <span className="text-cyan-400">{simFolder}</span></div>
                </div>

                <div className="space-y-2 pt-1 text-xs">
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">⚡ Direct Download Link:</span>
                    <div className="flex items-center gap-2 bg-[#0f1721] px-2.5 py-1.5 rounded border border-[#223142]">
                      <span className="truncate text-emerald-400 font-mono select-all">{simDownloadUrl}</span>
                      <button 
                        onClick={() => handleCopy(simDownloadUrl, 'sim_dl')}
                        className="text-slate-400 hover:text-white shrink-0 ml-auto"
                        title="Copy link"
                      >
                        {copiedKey === 'sim_dl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {(simMediaType === 'video' || simMediaType === 'audio') && (
                    <div>
                      <span className="text-slate-400 block font-semibold mb-0.5">🎬 Online Stream Link:</span>
                      <div className="flex items-center gap-2 bg-[#0f1721] px-2.5 py-1.5 rounded border border-[#223142]">
                        <span className="truncate text-sky-400 font-mono select-all">{simStreamUrl}</span>
                        <button 
                          onClick={() => handleCopy(simStreamUrl, 'sim_stream')}
                          className="text-slate-400 hover:text-white shrink-0 ml-auto"
                          title="Copy link"
                        >
                          {copiedKey === 'sim_stream' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">🌐 Web Drive Folder:</span>
                    <div className="flex items-center gap-2 bg-[#0f1721] px-2.5 py-1.5 rounded border border-[#223142]">
                      <span className="truncate text-purple-400 font-mono select-all">{simDriveUrl}</span>
                      <button 
                        onClick={() => handleCopy(simDriveUrl, 'sim_drive')}
                        className="text-slate-400 hover:text-white shrink-0 ml-auto"
                        title="Copy link"
                      >
                        {copiedKey === 'sim_drive' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulated Inline Keyboard Buttons */}
              <div className="pt-2 space-y-2 border-t border-[#253648]">
                <div className="text-[11px] text-slate-400 font-semibold text-center mb-1">Telegram Inline Keyboard:</div>
                <div className="grid grid-cols-1 gap-1.5">
                  <a
                    href={simDownloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 px-3 bg-[#2b5278] hover:bg-[#32618e] text-white font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 transition text-center shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    📥 Direct Download
                  </a>

                  {(simMediaType === 'video' || simMediaType === 'audio') && (
                    <a
                      href={simStreamUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 px-3 bg-[#24466b] hover:bg-[#2c537d] text-white font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 transition text-center shadow"
                    >
                      <Play className="w-3.5 h-3.5" />
                      🎬 Stream Online
                    </a>
                  )}

                  <a
                    href={simDriveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 px-3 bg-[#1d354e] hover:bg-[#23405f] text-slate-200 font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 transition text-center shadow"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    📂 Open In Web Drive
                  </a>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: CODE EXPLORER */}
        {activeTab === 'files' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* File List Column */}
            <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800">
              <div className="p-3.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-emerald-400" /> Fixed Project Files
                </span>
                <span className="text-xs text-slate-500 font-mono">{FIXED_FILES.length} files</span>
              </div>
              <div className="divide-y divide-slate-800/60 max-h-[700px] overflow-y-auto">
                {FIXED_FILES.map((file) => {
                  const isSelected = selectedFile.name === file.name;
                  return (
                    <button
                      key={file.name}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full text-left p-3.5 transition flex items-start justify-between gap-2 ${
                        isSelected
                          ? 'bg-emerald-500/10 border-l-4 border-emerald-400 text-white'
                          : 'hover:bg-slate-800/40 text-slate-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-bold truncate flex items-center gap-1.5">
                          <FileText className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                          {file.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {file.description}
                        </div>
                      </div>
                      <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded shrink-0 ${
                        file.category === 'bot' ? 'bg-purple-500/20 text-purple-300' :
                        file.category === 'streamer' ? 'bg-emerald-500/20 text-emerald-300' :
                        file.category === 'frontend' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {file.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Code Viewer Column */}
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              {/* Header */}
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {selectedFile.path}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{selectedFile.description}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(selectedFile.code, 'file_code')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
                  >
                    {copiedKey === 'file_code' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Code
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Fixes Applied Highlight */}
              <div className="p-4 bg-emerald-950/20 border-b border-slate-800/80">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Key Fixes in this file:
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {selectedFile.fixesSummary.map((fix, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      <span>{fix}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Code Pre Box */}
              <div className="p-4 bg-slate-950 overflow-x-auto max-h-[580px] overflow-y-auto">
                <pre className="font-mono text-xs text-slate-200 leading-relaxed">
                  <code>{selectedFile.code}</code>
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: STREAM TESTER & RANGE DIAGNOSTICS */}
        {activeTab === 'stream_tester' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">HTTP 206 Partial Content & Byte-Range Diagnostics</h3>
                  <p className="text-xs text-slate-400">
                    Samjhein ki pehle video stream kyu freeze ho rahi thi aur ab new architecture me kaise seek aur buffer flawlessly kaam karta hai.
                  </p>
                </div>
              </div>

              {/* Technical Comparison Table */}
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">Scenario</th>
                      <th className="p-3 text-rose-400">Old Buggy Behavior</th>
                      <th className="p-3 text-emerald-400">New Fixed Behavior</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    <tr>
                      <td className="p-3 font-semibold text-white">Browser Probe (Range: bytes=0-0)</td>
                      <td className="p-3 text-rose-300 bg-rose-500/5">
                        <code className="text-rose-200">part_count = 0</code> (0 chunks yielded). Player error.
                      </td>
                      <td className="p-3 text-emerald-300 bg-emerald-500/5">
                        Yields 1st byte with 206 Partial Content. Browser enables seeking instantly.
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">Full File Download (No Range)</td>
                      <td className="p-3 text-rose-300 bg-rose-500/5">
                        Sent <code className="text-rose-200">Content-Range</code> on 200 OK (RFC 7233 violation). Corrupted IDM / VLC downloads.
                      </td>
                      <td className="p-3 text-emerald-300 bg-emerald-500/5">
                        Clean 200 OK without Content-Range. Direct download completes without corruption.
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">Suffix Range (Range: bytes=-500)</td>
                      <td className="p-3 text-rose-300 bg-rose-500/5">
                        Crashed with <code className="text-rose-200">ValueError: invalid literal for int()</code>.
                      </td>
                      <td className="p-3 text-emerald-300 bg-emerald-500/5">
                        Calculates <code className="text-emerald-200">max(0, file_size - 500)</code> safely and delivers end bytes.
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">Video Seeking (Scrubbing timeline)</td>
                      <td className="p-3 text-rose-300 bg-rose-500/5">
                        Sequential fetching locked on old offset, video froze indefinitely.
                      </td>
                      <td className="p-3 text-emerald-300 bg-emerald-500/5">
                        Cancels obsolete producer immediately; launches new stream at exact requested timestamp!
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Architecture Diagram Box */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
                <div className="text-emerald-400 font-bold flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Sliding-Window Streaming Pipeline Architecture
                </div>
                <div className="text-slate-300 bg-slate-900 p-4 rounded-lg overflow-x-auto leading-relaxed">
                  {`[Client / Browser (Chrome / VLC)]
           │
           ▼ HTTP GET /stream?path=/movie.mp4  (Range: bytes=10485760-20971520)
┌─────────────────────────────────────────────────────────────┐
│ FastAPI Endpoint: media_streamer()                          │
│  ├─ Parse Range: from=10MB, until=20MB                      │
│  ├─ Calculate chunk_size=1MB, part_count=10 chunks          │
│  └─ Spawn ByteStreamer.yield_file()                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼ (Sliding Window: 3 concurrent requests)
┌─────────────────────────────────────────────────────────────┐
│ Background Worker Queue:                                    │
│  ├─ Fetch Chunk 1 [Ready]  ──► Streamed immediately         │
│  ├─ Fetch Chunk 2 [Ready]  ──► In buffer queue (no lag)     │
│  ├─ Fetch Chunk 3 [In Flight from Telegram MTProto]         │
│  └─ FloodWait Protection: Auto-sleep on Telegram rate-limit  │
└─────────────────────────────────────────────────────────────┘`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: DEPLOYMENT & ENV */}
        {activeTab === 'deploy' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Environment Generator */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Interactive .env Generator</h3>
                    <p className="text-xs text-slate-400">
                      Apne credentials yahan enter karein aur ready-to-use .env download ya copy karein!
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleCopy(generatedEnvContent, 'env_copy')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition"
                >
                  {copiedKey === 'env_copy' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy .env
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Telegram API_ID</label>
                  <input
                    type="text"
                    value={envConfig.apiId}
                    onChange={(e) => setEnvConfig({ ...envConfig, apiId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Telegram API_HASH</label>
                  <input
                    type="text"
                    value={envConfig.apiHash}
                    onChange={(e) => setEnvConfig({ ...envConfig, apiHash: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Main Bot Token (MAIN_BOT_TOKEN)</label>
                  <input
                    type="text"
                    value={envConfig.botToken}
                    onChange={(e) => setEnvConfig({ ...envConfig, botToken: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Public Website Domain (WEBSITE_URL) ⭐</label>
                  <input
                    type="text"
                    value={envConfig.websiteUrl}
                    onChange={(e) => setEnvConfig({ ...envConfig, websiteUrl: e.target.value })}
                    placeholder="https://my-app.koyeb.app"
                    className="w-full px-3 py-2 bg-slate-950 border border-emerald-500/50 rounded-lg text-emerald-300 focus:outline-none"
                  />
                  <span className="text-[11px] text-emerald-400/80">Zaruri: Isse bot direct website stream aur download link banata hai!</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Storage Channel ID (STORAGE_CHANNEL)</label>
                  <input
                    type="text"
                    value={envConfig.storageChannel}
                    onChange={(e) => setEnvConfig({ ...envConfig, storageChannel: e.target.value })}
                    placeholder="-100..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Telegram Admin ID (TELEGRAM_ADMIN_IDS)</label>
                  <input
                    type="text"
                    value={envConfig.telegramAdminIds}
                    onChange={(e) => setEnvConfig({ ...envConfig, telegramAdminIds: e.target.value })}
                    placeholder="123456789"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Env Preview */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="text-xs font-mono text-slate-400 mb-2">Preview of .env:</div>
                <pre className="font-mono text-xs text-emerald-400/90 whitespace-pre-wrap">{generatedEnvContent}</pre>
              </div>
            </div>

            {/* Step-by-Step Deployment Instructions */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-cyan-400" />
                Deployment Steps (Koyeb / Render / VPS / Docker)
              </h3>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div className="font-bold text-white text-sm">Step 1: Extract Zip & Configure .env</div>
                  <p>
                    <code className="text-emerald-400">Telegram-Drive-Fixed.zip</code> ko unzip karein. <code className="text-emerald-400">sample.env</code> ko rename karke <code className="text-emerald-400">.env</code> banayein aur apna Telegram Bot Token, Storage Channel ID, aur WEBSITE_URL dalein.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div className="font-bold text-white text-sm">Step 2: Install Python Dependencies</div>
                  <div className="font-mono bg-slate-900 p-2 rounded text-slate-200 select-all">
                    pip install -r requirements.txt
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div className="font-bold text-white text-sm">Step 3: Run the Bot & Website Server</div>
                  <div className="font-mono bg-slate-900 p-2 rounded text-slate-200 select-all">
                    python3 start_main.py
                  </div>
                  <p className="text-slate-400">Or use uvicorn directly:</p>
                  <div className="font-mono bg-slate-900 p-2 rounded text-slate-200 select-all">
                    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div className="font-bold text-white text-sm">Step 4: Bot Mode Activation</div>
                  <p>
                    Apne Telegram Bot ko <code className="text-emerald-400">/start</code> bhejein. <code className="text-emerald-400">/set_folder</code> command se folder select karein aur koi bhi video/file forward karein. Bot turant direct download aur stream link generate karke de dega!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-4 text-center text-xs text-slate-500">
        Telegram Drive Bot Fixed Suite • Tested & Verified for Flawless Streaming & Chunked Downloads
      </footer>
    </div>
  );
}
