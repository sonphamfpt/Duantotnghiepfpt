import React, { useEffect, useState } from 'react';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';
import { useAuth } from '../../../context/AuthContext';

// Helper to mask name for privacy: "Nguyễn Văn A" -> "Nguyễn V*** A***"
const maskName = (name: string) => {
  const parts = name.split(' ');
  if (parts.length <= 1) return name;
  return parts.map((part, index) => {
    if (index === 0) return part; // Keep first name/surname
    return part.charAt(0) + '***';
  }).join(' ');
};

export const PatientQueue: React.FC = () => {
  const { queue, dentists } = useClinic();
  const { user } = useAuth();
  const patientId = user?.id || '';
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // BUG-L01: Guard — patientId rỗng (chưa login) không được match bất kỳ queue item nào
  const myQueueItem = patientId
    ? queue.find(q => q.patientId === patientId && q.status !== 'Completed')
    : undefined;
  const myDentistId = myQueueItem?.dentistId;
  const myDentistName = myQueueItem?.dentistName;
  
  // Filter lists to only show patients assigned to the same doctor (if the user has an assigned doctor)
  const inChairPatients = queue.filter(q => q.status === 'In Chair' && (myDentistId ? q.dentistId === myDentistId : true));
  const waitingPatients = queue.filter(q => q.status === 'Waiting' && (myDentistId ? q.dentistId === myDentistId : true));
  
  const myPosition = myQueueItem && myQueueItem.status === 'Waiting' 
    ? waitingPatients.findIndex(q => q.id === myQueueItem.id) + 1 
    : null;

  const estimatedWaitMinutes = myQueueItem?.status === 'Waiting'
    ? (myQueueItem.waitTimeMin || 0)
    : 0;

  // Timeline Progress Component
  const renderTimeline = (status: string) => {
    const steps = [
      { key: 'checkin', label: 'Check-in', icon: 'how_to_reg' },
      { key: 'waiting', label: 'Đang chờ', icon: 'hourglass_top' },
      { key: 'inchair', label: 'Khám', icon: 'medical_services' },
      { key: 'done', label: 'Hoàn tất', icon: 'check_circle' }
    ];

    let currentStepIdx = 0;
    if (status === 'Waiting') currentStepIdx = 1;
    if (status === 'In Chair') currentStepIdx = 2;
    if (status === 'Completed') currentStepIdx = 3;

    return (
      <div className="flex items-center justify-between w-full max-w-md mx-auto mt-4 mb-2 relative">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/20 -translate-y-1/2 rounded-full z-0"></div>
        <div 
          className="absolute top-1/2 left-0 h-1 bg-white -translate-y-1/2 rounded-full z-0 transition-all duration-500" 
          style={{ width: `${(currentStepIdx / (steps.length - 1)) * 100}%` }}
        ></div>
        
        {steps.map((step, idx) => {
          const isActive = idx <= currentStepIdx;
          const isCurrent = idx === currentStepIdx;
          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isCurrent ? 'bg-white text-primary ring-4 ring-white/30 scale-110 shadow-lg' : 
                isActive ? 'bg-white text-primary' : 'bg-primary-container/50 text-white/50 border border-white/20'
              }`}>
                <Icon name={step.icon} className="text-[16px]" />
              </div>
              <span className={`text-[10px] font-bold ${isActive ? 'text-white' : 'text-white/50'}`}>{step.label}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-stack-lg max-w-[1000px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start flex-wrap gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Hàng chờ thực tế</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Theo dõi tiến độ phòng khám theo thời gian thực</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-secondary-container/30 rounded-xl border border-secondary/20 text-secondary font-bold text-sm">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
          Live • {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {/* 1. KHỐI LƯỢT KHÁM CỦA BẠN (Cực kỳ nổi bật) */}
      {myQueueItem ? (
        <div className="mb-8 rounded-3xl overflow-hidden shadow-xl border border-primary/20 bg-gradient-to-br from-primary via-primary to-secondary relative">
          {/* Background decor */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="p-8 sm:p-10 text-white relative z-10">
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start justify-between">
              
              {/* Vị trí trung tâm: Số thứ tự */}
              <div className="text-center md:text-left flex-1">
                <p className="text-sm font-bold opacity-80 uppercase tracking-widest mb-2 flex items-center justify-center md:justify-start gap-2">
                  <Icon name="person" className="text-[18px]" />
                  Lượt khám của bạn
                </p>
                
                {myQueueItem.status === 'In Chair' ? (
                  <div className="animate-fade-in">
                    <h3 className="text-4xl sm:text-5xl font-black mb-2 flex items-center justify-center md:justify-start gap-3">
                      <Icon name="medical_services" className="text-[48px] animate-pulse" />
                      Đang khám
                    </h3>
                    <p className="text-lg opacity-90">Bác sĩ đang điều trị cho bạn.</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-6 justify-center md:justify-start">
                    <div className="w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center text-primary shadow-inner">
                      <span className="text-sm font-bold uppercase opacity-60 mt-1">Số thứ tự</span>
                      <span className="text-5xl font-black leading-none">{myPosition}</span>
                    </div>
                    <div>
                      <p className="text-sm opacity-80 mb-1">Thời gian chờ dự kiến</p>
                      <p className="text-4xl font-black">{estimatedWaitMinutes} <span className="text-lg font-bold">phút</span></p>
                    </div>
                  </div>
                )}
                
                {/* Timeline Component */}
                <div className="mt-8 md:mt-10 md:pr-10">
                  {renderTimeline(myQueueItem.status)}
                </div>
              </div>

              {/* Thông tin bác sĩ / phòng */}
              <div className="bg-black/10 backdrop-blur-md rounded-2xl p-5 w-full md:w-64 shrink-0 border border-white/10">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold opacity-60 mb-1">Bác sĩ phụ trách</p>
                    <p className="font-bold flex items-center gap-2">
                      <Icon name="stethoscope" className="text-[18px]" />
                      {myQueueItem.dentistName}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold opacity-60 mb-1">Phòng khám</p>
                    <p className="font-bold flex items-center gap-2">
                      <Icon name="meeting_room" className="text-[18px]" />
                      {myQueueItem.room}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold opacity-60 mb-1">Giờ Check-in</p>
                    <p className="font-bold flex items-center gap-2">
                      <Icon name="schedule" className="text-[18px]" />
                      {myQueueItem.checkInTime}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 bg-surface-container rounded-3xl border border-outline-variant p-10 text-center">
          <Icon name="playlist_remove" className="text-[64px] text-outline mb-4" />
          <h3 className="text-xl font-bold text-on-surface mb-2">Bạn không có trong hàng chờ</h3>
          <p className="text-on-surface-variant">Hãy đến quầy lễ tân để check-in hoặc đặt lịch khám mới.</p>
        </div>
      )}

      {/* 2. BẢNG HÀNG CHỜ PHÒNG KHÁM */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Cột trái: Đang khám (Rất nổi bật) */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b-2 border-primary/20">
            <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
              <Icon name="meeting_room" className="text-primary" />
              {myDentistName ? `Phòng khám (${myDentistName})` : 'Đang trong phòng khám'}
            </h3>
            <span className="bg-primary-container text-on-primary-container text-xs font-bold px-2.5 py-1 rounded-full">
              {inChairPatients.length} người
            </span>
          </div>
          
          <div className="space-y-3">
            {inChairPatients.map((item) => {
              const isMe = item.patientId === patientId;
              const dentist = dentists.find(d => d.id === item.dentistId);
              
              return (
                <div key={item.id} className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${
                  isMe ? 'bg-primary text-on-primary border-primary shadow-md' : 'bg-white border-outline-variant shadow-sm'
                }`}>
                  <div className="relative">
                    {dentist ? (
                      <img src={dentist.avatar} alt={dentist.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center">
                        <Icon name="person" className="text-outline" />
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full animate-pulse"></span>
                  </div>
                  
                  <div className="flex-1">
                    <p className={`font-bold text-sm ${isMe ? 'text-on-primary' : 'text-on-surface'}`}>
                      {isMe ? 'Lượt của bạn' : maskName(item.patientName)}
                    </p>
                    <p className={`text-xs mt-0.5 ${isMe ? 'text-on-primary/80' : 'text-on-surface-variant'}`}>
                      BS. {item.dentistName} • {item.room}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded flex shrink-0 ${
                      isMe ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                    }`}>
                      <Icon name="timer" className="text-[14px]" />
                      {item.elapsedTimeMin}p
                    </span>
                  </div>
                </div>
              );
            })}
            
            {inChairPatients.length === 0 && (
              <div className="p-8 text-center text-on-surface-variant border border-dashed rounded-xl border-outline-variant bg-surface-container-low">
                Các phòng khám đang trống.
              </div>
            )}
          </div>
        </div>

        {/* Cột phải: Danh sách chờ */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b-2 border-amber-200">
            <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
              <Icon name="airline_seat_recline_normal" className="text-amber-600" />
              {myDentistName ? `Hàng chờ (${myDentistName})` : 'Danh sách đợi tới lượt'}
            </h3>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full">
              {waitingPatients.length} người
            </span>
          </div>
          
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden divide-y divide-outline-variant">
            {waitingPatients.map((item, idx) => {
              const isMe = item.patientId === patientId;
              
              return (
                <div key={item.id} className={`px-5 py-4 flex items-center gap-4 ${
                  isMe ? 'bg-amber-50' : 'hover:bg-surface-container-low'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    isMe ? 'bg-amber-500 text-white shadow-md' : 'bg-surface-container text-on-surface-variant'
                  }`}>
                    {idx + 1}
                  </div>
                  
                  <div className="flex-1">
                    <p className={`font-bold text-sm flex items-center gap-2 ${isMe ? 'text-amber-900' : 'text-on-surface'}`}>
                      {isMe ? item.patientName : maskName(item.patientName)}
                      {isMe && <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Bạn</span>}
                    </p>
                    <p className={`text-xs mt-0.5 ${isMe ? 'text-amber-700' : 'text-on-surface-variant'}`}>
                      Chờ BS. {item.dentistName}
                    </p>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <p className="text-[10px] uppercase font-bold text-on-surface-variant">Ước tính</p>
                    <p className={`font-bold text-sm ${isMe ? 'text-amber-600' : 'text-on-surface'}`}>
                      ~{item.waitTimeMin}p
                    </p>
                  </div>
                </div>
              );
            })}
            
            {waitingPatients.length === 0 && (
              <div className="p-8 text-center text-on-surface-variant">
                Không có bệnh nhân nào đang chờ.
              </div>
            )}
          </div>
        </div>
        
      </div>
      
      {/* 3. Lời khuyên */}
      <div className="mt-8 bg-surface-container-low rounded-xl border border-outline-variant p-4 flex gap-3 text-sm text-on-surface-variant">
        <Icon name="tips_and_updates" className="text-secondary shrink-0" />
        <p>
          <strong>Lưu ý:</strong> Thứ tự thực tế có thể thay đổi đôi chút tùy thuộc vào tình trạng lâm sàng của bệnh nhân phía trước. 
          Vui lòng đợi tại khu vực phòng chờ tầng 1, chúng tôi sẽ mời bạn vào khi đến lượt.
        </p>
      </div>
      
    </div>
  );
};
