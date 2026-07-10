import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/Icon';
import { useNavigate } from 'react-router-dom';
import { useClinic } from '../../context/ClinicContext';
import { BrandLogo } from '../../components/BrandLogo';
import { socket } from '../../services/socketClient';

export const QueueTracking: React.FC = () => {
  const { queue, refreshAllData } = useClinic();
  const navigate = useNavigate();

  // State thông báo khi có bệnh nhân mới check-in (flash animation)
  const [newCheckinAlert, setNewCheckinAlert] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Kết nối WebSocket nếu chưa kết nối
    if (!socket.connected) {
      socket.connect();
    }

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    // Khi có bệnh nhân mới check-in → hiện alert blink
    const handleCheckin = (payload: any) => {
      setNewCheckinAlert(payload?.data?.patientName || 'Bệnh nhân mới');
      setTimeout(() => setNewCheckinAlert(null), 4000);
    };

    // Khi trạng thái thay đổi → refresh ngay
    const handleStatusChange = () => {
      // Queue data được cập nhật tự động từ ClinicContext
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('queue:checkin', handleCheckin);
    socket.on('queue:status_changed', handleStatusChange);

    // Đặt trạng thái kết nối ban đầu
    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('queue:checkin', handleCheckin);
      socket.off('queue:status_changed', handleStatusChange);
    };
  }, []);

  // Categories
  const activeQueue = queue.filter(q => q.status !== 'Completed');
  const inChair = activeQueue.filter(q => q.status === 'In Chair');
  const waiting = activeQueue.filter(q => q.status === 'Waiting');
  
  // Highlight next patient
  const nextPatient = waiting[0];
  const subsequentWaiting = waiting.slice(1);

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen flex flex-col justify-between p-6 animate-in fade-in duration-200 select-none">
      
      {/* New Check-in Flash Alert */}
      {newCheckinAlert && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl shadow-emerald-500/40 flex items-center gap-3 animate-bounce">
          <Icon name="person_add" className="text-2xl" />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">Bệnh nhân mới check-in</p>
            <p className="text-lg font-black">{newCheckinAlert}</p>
          </div>
        </div>
      )}

      {/* Screen Header */}
      <header className="flex justify-between items-center border-b border-slate-800 pb-4 shrink-0">
        <div className="flex items-center gap-4">
          <BrandLogo size="md" variant="white" />
          <div className="border-l border-slate-700 pl-4">
            <h1 className="text-xl font-bold font-headline-md text-white">Bảng Theo Dõi Hàng Chờ Tự Động</h1>
            <p className="text-[10px] uppercase font-bold text-slate-400">Hệ Thống Nha Khoa GoodSmile</p>
          </div>
        </div>

        {/* Live Status + Connect indicator */}
        <div className="flex items-center gap-6">
          <div className="bg-slate-800 px-4 py-1.5 rounded-full border border-slate-700 text-xs font-bold flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-ping' : 'bg-amber-400 animate-pulse'}`}></span>
            <span className={isConnected ? 'text-green-400' : 'text-amber-400'}>
              {isConnected ? 'Real-time: Đang kết nối' : 'Đang kết nối lại...'}
            </span>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold transition-all cursor-pointer text-slate-300"
          >
            Quay lại cổng
          </button>
        </div>
      </header>

      {/* Main Grid: Active Treatment vs Waiting Queue */}
      <main className="flex-1 grid grid-cols-12 gap-6 py-6 overflow-hidden">
        
        {/* Left Row: In chair treatment rooms (8 columns) */}
        <section className="col-span-12 lg:col-span-8 flex flex-col space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Icon name="dentistry" className="text-secondary" />
            Phòng khám đang điều trị
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 overflow-y-auto custom-scrollbar">
            {inChair.length > 0 ? (
              inChair.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-800 border-l-8 border-l-secondary rounded-xl p-6 flex flex-col justify-between shadow-xl border border-slate-700 animate-pulse duration-[3000ms]"
                >
                  <div className="flex justify-between items-start">
                    <span className="bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-xs font-bold font-data-mono">
                      {item.room}
                    </span>
                    <span className="text-xs text-secondary font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-secondary"></span>
                      Đang thực hiện
                    </span>
                  </div>
                  
                  <div className="space-y-1 my-4">
                    <p className="text-2xl font-bold text-white tracking-wide">{item.patientName}</p>
                    <p className="text-xs text-slate-400 font-medium">{item.dentistName}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-700/50 flex justify-between text-xs text-slate-400 font-bold">
                    <span>Thời gian khám</span>
                    <span className="text-white font-data-mono">{item.elapsedTimeMin || 0} phút</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 bg-slate-800/50 border border-dashed border-slate-700 rounded-xl flex flex-col justify-center items-center text-center p-8">
                <Icon name="block" className="text-5xl mb-2 text-slate-600" />
                <p className="text-sm font-bold text-slate-400">Không có phòng khám nào đang điều trị</p>
                <p className="text-xs text-slate-500 max-w-xs mt-1">Hệ thống sẽ cập nhật tự động khi bác sĩ bắt đầu phiên làm việc.</p>
              </div>
            )}
          </div>
        </section>

        {/* Right Row: Waiting lines list (4 columns) */}
        <section className="col-span-12 lg:col-span-4 flex flex-col space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Icon name="groups" className="text-primary" />
            Hàng chờ đón tiếp
          </h2>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex-1 flex flex-col justify-between overflow-hidden shadow-2xl">
            <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1">
              
              {/* Highlight NEXT patient */}
              {nextPatient && (
                <div className="bg-gradient-to-r from-blue-900/50 to-slate-800 border border-blue-500 rounded-lg p-4 space-y-3 animate-bounce duration-[2000ms]">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-blue-400 uppercase">BỆNH NHÂN TIẾP THEO</span>
                    <span className="bg-blue-500 text-white px-2 py-0.5 rounded">CHUẨN BỊ</span>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white leading-tight">{nextPatient.patientName}</p>
                    <p className="text-xs text-slate-400">{nextPatient.room} • {nextPatient.dentistName}</p>
                  </div>
                </div>
              )}

              {/* Sub-sequent patients */}
              {subsequentWaiting.length > 0 ? (
                <div className="space-y-2 pt-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Danh sách chờ khám</p>
                  {subsequentWaiting.map((item, idx) => (
                    <div key={item.id} className="bg-slate-900/50 border border-slate-700/30 rounded p-3 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center font-bold text-[10px] text-white">
                          {idx + 2}
                        </span>
                        <div>
                          <p className="font-bold text-slate-200">{item.patientName}</p>
                          <p className="text-[10px] text-slate-500">{item.room} • {item.dentistName}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">ĐANG ĐỢI</span>
                    </div>
                  ))}
                </div>
              ) : (
                !nextPatient && (
                  <div className="h-full flex flex-col justify-center items-center text-slate-500 text-center py-12">
                    <Icon name="group" className="text-4xl mb-2 text-slate-600" />
                    <p className="text-xs font-bold">Không có bệnh nhân chờ khám</p>
                  </div>
                )
              )}

            </div>

            {/* Screen Ticker */}
            <div className="pt-4 border-t border-slate-700/50 mt-4 text-center text-[10px] text-slate-500 font-semibold leading-tight">
              Quý khách vui lòng theo dõi bảng màn hình và chuẩn bị khi tên mình được nháy sáng trên khu vực BỆNH NHÂN TIẾP THEO.
            </div>
          </div>
        </section>

      </main>

      {/* Screen Footer */}
      <footer className="border-t border-slate-800 pt-4 flex justify-between items-center text-xs text-slate-500 shrink-0">
        <p>Hệ thống real-time GoodSmile — Cập nhật tức thì qua WebSocket</p>
        <p>Hotline khẩn cấp phòng khám: <strong>1900 6789</strong></p>
      </footer>
    </div>
  );
};
