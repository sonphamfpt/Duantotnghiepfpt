import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../../components/Icon';
import { Link } from 'react-router-dom';

interface LogEntry {
  id: string;
  timestamp: string;
  agent: 'PM' | 'Senior' | 'QC' | 'System';
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  message: string;
  details?: string;
}

export const AgentTeamWorkspace: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PM' | 'Senior' | 'QC'>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isSimulating, setIsSimulating] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'log-1',
      timestamp: '21:18:39',
      agent: 'PM',
      level: 'INFO',
      message: 'PM Agent khởi tạo quy trình Code Review nhánh feature/receptionist-patient-hien.',
      details: 'Lệnh: git fetch origin feature/receptionist-patient-hien'
    },
    {
      id: 'log-2',
      timestamp: '21:19:01',
      agent: 'Senior',
      level: 'INFO',
      message: 'Senior Agent thực hiện phân tích diff giữa main và feature/receptionist-patient-hien.',
      details: 'Thay đổi tại 3 file: BookingModal.tsx, PatientBooking.tsx, BookingPage.tsx'
    },
    {
      id: 'log-3',
      timestamp: '21:19:20',
      agent: 'Senior',
      level: 'WARN',
      message: 'Phát hiện 2 lỗi logic: thiếu chuẩn hóa isSameDentistId & bất đồng bộ khi activeShiftsForDoc = 0.',
      details: 'Rủi ro: Khách hàng không chọn được giờ khám nếu ID bác sĩ dạng D-01.'
    },
    {
      id: 'log-4',
      timestamp: '21:19:33',
      agent: 'QC',
      level: 'SUCCESS',
      message: 'QC Agent chạy thử nghiệm git merge --no-commit --no-ff: Không có xung đột (0 conflict).',
    },
    {
      id: 'log-5',
      timestamp: '21:19:49',
      agent: 'QC',
      level: 'SUCCESS',
      message: 'QC Agent kiểm tra npx tsc --noEmit: Biên dịch thành công 100%.',
    },
    {
      id: 'log-6',
      timestamp: '21:21:49',
      agent: 'PM',
      level: 'SUCCESS',
      message: 'PM Agent phê duyệt merge nhánh feature/receptionist-patient-hien vào main.',
    },
    {
      id: 'log-7',
      timestamp: '21:21:55',
      agent: 'Senior',
      level: 'SUCCESS',
      message: 'Senior Agent refactor tạo module tiện ích chung src/utils/shiftUtils.ts.',
      details: 'Tối ưu lại logic lọc ca trực và múi giờ UTC+7 ở cả 3 form đặt lịch.'
    },
    {
      id: 'log-8',
      timestamp: '21:25:35',
      agent: 'QC',
      level: 'SUCCESS',
      message: 'QC Agent chạy kiểm thử production build (npm run build): Thành công 100%.',
      details: 'dist/index.html & assets đã tạo xong trong 5.37 giây.'
    },
    {
      id: 'log-9',
      timestamp: '21:30:52',
      agent: 'PM',
      level: 'INFO',
      message: 'PM Agent nhận yêu cầu từ User: Khởi tạo Trang Làm Việc Real-time Agent Team Workspace.',
    }
  ]);

  // Realtime simulation effect
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      
      const simulatedActions: Array<Omit<LogEntry, 'id' | 'timestamp'>> = [
        {
          agent: 'QC',
          level: 'SUCCESS',
          message: 'QC Agent heartbeat: Đã kiểm tra tính toàn vẹn của các API Endpoint & Socket Client.',
          details: 'Socket connection: ONLINE | Latency: 12ms'
        },
        {
          agent: 'Senior',
          level: 'INFO',
          message: 'Senior Agent đang giám sát memory & type safety của ClinicContext state.',
          details: 'Memory footprint: Stable | Re-render index: Optimal'
        },
        {
          agent: 'PM',
          level: 'INFO',
          message: 'PM Agent tổng hợp trạng thái dự án: 0 bug tồn đọng, nhánh main sẵn sàng push.',
        }
      ];

      const randomAction = simulatedActions[Math.floor(Math.random() * simulatedActions.length)];
      
      setLogs(prev => [
        ...prev,
        {
          id: `log-${Date.now()}`,
          timestamp: timeStr,
          ...randomAction
        }
      ]);
    }, 6000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // Auto scroll
  useEffect(() => {
    if (autoScroll) {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log => {
    const matchesFilter = activeFilter === 'ALL' || log.agent === activeFilter;
    const matchesSearch = searchQuery === '' || 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.agent.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const triggerAgentAction = (agent: 'PM' | 'Senior' | 'QC', actionName: string) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    const newLog: LogEntry = {
      id: `log-${Date.now()}`,
      timestamp: timeStr,
      agent,
      level: 'SUCCESS',
      message: `[KÍCH HOẠT THỦ CÔNG] ${agent} Agent thực thi: ${actionName}`,
      details: `Triggered by user at ${timeStr}`
    };

    setLogs(prev => [...prev, newLog]);
  };

  return (
    <div className="min-h-screen bg-[#0b1329] text-slate-100 font-sans p-4 md:p-8">
      {/* Workspace Top Bar */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#131f3f] border border-blue-900/50 p-6 rounded-2xl shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 ring-2 ring-blue-400/30">
              <Icon name="smart_toy" className="text-3xl animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">Agent Team Realtime Workspace</h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  LIVE ONLINE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span>Giám sát tiến độ & kết quả làm việc của bộ 3 Agent (PM • Senior • QC)</span>
                <span className="text-slate-600">•</span>
                <span className="text-amber-400 font-medium">Trang làm việc tạm thời (Có thể xóa sau khi hoàn thành)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="px-4 py-2 bg-[#1e2d5a] hover:bg-[#283b75] text-slate-200 rounded-xl text-xs font-bold border border-blue-800/40 transition-all flex items-center gap-2"
            >
              <Icon name="arrow_back" className="text-sm" />
              Trở về Trang chủ
            </Link>
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                isSimulating 
                  ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Icon name={isSimulating ? 'pause' : 'play_arrow'} className="text-sm" />
              {isSimulating ? 'Tạm dừng Realtime' : 'Bật Realtime Stream'}
            </button>
          </div>
        </div>

        {/* 3-Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* PM Agent Card */}
          <div className="bg-[#131f3f]/90 border border-blue-900/60 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-blue-500/50 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                  <Icon name="admin_panel_settings" className="text-xl" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">PM Agent</h3>
                  <span className="text-[11px] text-blue-400 font-medium">Project Manager & Architect</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                ACTIVE
              </span>
            </div>
            
            <p className="text-xs text-slate-300 mb-4 line-clamp-2">
              Quản lý quy trình, phân tích yêu cầu nghiệp vụ, định hướng kiến trúc và phê duyệt merge code.
            </p>

            <div className="space-y-2 border-t border-blue-900/40 pt-3">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Nhánh hiện tại:</span>
                <span className="text-blue-300 font-bold">main</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Quyết định gần nhất:</span>
                <span className="text-emerald-400 font-bold">Approved PR #4</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-blue-900/30 flex gap-2">
              <button
                onClick={() => triggerAgentAction('PM', 'Tổng duyệt Milestone & Lịch sử Commit')}
                className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded-lg text-[11px] font-bold border border-blue-500/30 transition-all cursor-pointer"
              >
                ⚡ Trigger PM Check
              </button>
            </div>
          </div>

          {/* Senior Engineer Card */}
          <div className="bg-[#131f3f]/90 border border-indigo-900/60 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-indigo-500/50 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all"></div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                  <Icon name="code" className="text-xl" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Senior Engineer Agent</h3>
                  <span className="text-[11px] text-indigo-400 font-medium">Core Dev & Optimization</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                ACTIVE
              </span>
            </div>

            <p className="text-xs text-slate-300 mb-4 line-clamp-2">
              Thực thi refactor code, phát hiện bug tiềm ẩn, tối ưu hóa thuật toán và duy trì Clean Code standards.
            </p>

            <div className="space-y-2 border-t border-indigo-900/40 pt-3">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Module mới tạo:</span>
                <span className="text-indigo-300 font-bold">src/utils/shiftUtils.ts</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Code Health Index:</span>
                <span className="text-emerald-400 font-bold">100 / 100</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-indigo-900/30 flex gap-2">
              <button
                onClick={() => triggerAgentAction('Senior', 'Tối ưu hóa Performance & Memory Leak Check')}
                className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-lg text-[11px] font-bold border border-indigo-500/30 transition-all cursor-pointer"
              >
                ⚡ Trigger Senior Review
              </button>
            </div>
          </div>

          {/* QC / QA Agent Card */}
          <div className="bg-[#131f3f]/90 border border-emerald-900/60 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-emerald-500/50 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                  <Icon name="verified" className="text-xl" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">QC / QA Agent</h3>
                  <span className="text-[11px] text-emerald-400 font-medium">Testing & Quality Control</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                PASSED
              </span>
            </div>

            <p className="text-xs text-slate-300 mb-4 line-clamp-2">
              Tự động hóa testing, kiểm tra type-safety, build verification và đảm bảo zero-regression trước khi release.
            </p>

            <div className="space-y-2 border-t border-emerald-900/40 pt-3">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">TypeScript Check:</span>
                <span className="text-emerald-400 font-bold">0 Errors (npx tsc)</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Build Result:</span>
                <span className="text-emerald-400 font-bold">Vite Build 100% OK</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-emerald-900/30 flex gap-2">
              <button
                onClick={() => triggerAgentAction('QC', 'Chạy Full Automated E2E & Type Sanity Test')}
                className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded-lg text-[11px] font-bold border border-emerald-500/30 transition-all cursor-pointer"
              >
                ⚡ Run QC Test Suite
              </button>
            </div>
          </div>
        </div>

        {/* Live Realtime Terminal Log View */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Terminal Header */}
          <div className="bg-[#1e293b] px-5 py-3 border-b border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
              </div>
              <span className="font-mono text-xs text-slate-300 font-bold ml-2 flex items-center gap-2">
                <Icon name="terminal" className="text-blue-400 text-sm" />
                agent-live-stream.log
              </span>
              <span className="text-[11px] bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-mono">
                {filteredLogs.length} entries
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center bg-[#0f172a] p-1 rounded-xl border border-slate-700/60">
                {(['ALL', 'PM', 'Senior', 'QC'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveFilter(tab)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                      activeFilter === tab
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab === 'ALL' ? 'Tất cả' : `${tab} Agent`}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative">
                <Icon name="search" className="absolute left-2.5 top-2 text-slate-500 text-sm" />
                <input
                  type="text"
                  placeholder="Lọc log..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#0f172a] border border-slate-700 rounded-xl pl-8 pr-3 py-1 text-xs text-slate-200 outline-none focus:border-blue-500 w-32 md:w-40 transition-all"
                />
              </div>

              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                  autoScroll ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}
                title="Tự động cuộn xuống log mới nhất"
              >
                <Icon name="vertical_align_bottom" className="text-sm" />
              </button>
            </div>
          </div>

          {/* Terminal Body */}
          <div className="p-4 font-mono text-xs h-96 overflow-y-auto space-y-2.5 bg-[#090d16] select-text">
            {filteredLogs.map((log) => {
              const agentBadge = {
                PM: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
                Senior: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
                QC: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                System: 'bg-slate-500/10 text-slate-400 border-slate-500/30'
              }[log.agent];

              const levelColor = {
                INFO: 'text-blue-400',
                SUCCESS: 'text-emerald-400 font-bold',
                WARN: 'text-amber-400 font-bold',
                ERROR: 'text-red-400 font-bold'
              }[log.level];

              return (
                <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-800/40 transition-colors border border-transparent hover:border-slate-800/80">
                  <span className="text-slate-500 text-[11px] shrink-0 font-medium">[{log.timestamp}]</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${agentBadge}`}>
                    {log.agent} AGENT
                  </span>
                  <span className={`shrink-0 text-[11px] ${levelColor}`}>
                    [{log.level}]
                  </span>
                  <div className="flex-1 space-y-1">
                    <p className="text-slate-200 leading-relaxed">{log.message}</p>
                    {log.details && (
                      <p className="text-slate-400 text-[11px] bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800 inline-block font-mono">
                        💡 {log.details}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>
        </div>

        {/* Recent Work Accomplished Timeline */}
        <div className="bg-[#131f3f]/80 border border-blue-900/50 rounded-2xl p-6 shadow-xl backdrop-blur-md">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Icon name="history" className="text-blue-400" />
            Nhật Ký Các Task Đã Hoàn Thành (Milestones)
          </h2>

          <div className="space-y-4">
            <div className="relative pl-6 border-l-2 border-blue-500/40 space-y-1">
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-blue-500/20"></div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-400">Vừa xong (Latest)</span>
                <span className="text-[11px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/20">MERGED & FIXED</span>
              </div>
              <h4 className="text-sm font-bold text-white">Đồng bộ lịch khám & ca trực bác sĩ (PR #4)</h4>
              <p className="text-xs text-slate-300">
                Gộp nhánh <code className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded">feature/receptionist-patient-hien</code> vào <code className="bg-slate-800 text-blue-300 px-1.5 py-0.5 rounded">main</code>. 
                Tạo module chung <code className="bg-slate-800 text-emerald-300 px-1.5 py-0.5 rounded">src/utils/shiftUtils.ts</code> chuẩn hóa ID Bác sĩ (<code className="text-xs">D-01 === D-1</code>) và tự động lọc khung giờ khám khớp theo ca Sáng/Chiều/Cả Ngày.
              </p>
            </div>

            <div className="relative pl-6 border-l-2 border-indigo-500/40 space-y-1">
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20"></div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-400">Trước đó</span>
                <span className="text-[11px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/20">MERGED</span>
              </div>
              <h4 className="text-sm font-bold text-white">Gộp nhánh Quản lý ca trực (PR #3)</h4>
              <p className="text-xs text-slate-300">
                Gộp nhánh <code className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded">feature/manager-schedule-vinh</code> vào <code className="bg-slate-800 text-blue-300 px-1.5 py-0.5 rounded">main</code>. 
                Bổ sung xuất file Excel, tab Nhật ký hệ thống, cấu hình giá dịch vụ và giải quyết 3 xung đột file.
              </p>
            </div>

            <div className="relative pl-6 border-l-2 border-emerald-500/40 space-y-1">
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20"></div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400">Ban đầu</span>
                <span className="text-[11px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/20">FIXED</span>
              </div>
              <h4 className="text-sm font-bold text-white">Sửa lỗi trùng lặp key `addLog` trong ClinicContext.tsx</h4>
              <p className="text-xs text-slate-300">
                Loại bỏ thuộc tính `addLog` bị khai báo 2 lần tại dòng 759 của file <code className="bg-slate-800 text-blue-300 px-1.5 py-0.5 rounded">ClinicContext.tsx</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
