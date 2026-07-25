import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/Icon';
import { useClinic } from '../../context/ClinicContext';

export const Contact: React.FC = () => {
  const { addLog } = useClinic();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    document.title = 'Liên Hệ - GoodSmile Clinic';
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !message) {
      alert('Vui lòng nhập đầy đủ các trường thông tin bắt buộc!');
      return;
    }
    
    // Ghi nhận yêu cầu tư vấn mới vào hệ thống nhật ký Lễ tân
    addLog(
      'RECEPTION',
      'INFO',
      `Yêu cầu tư vấn mới từ ${name.trim()} (SĐT: ${phone.trim()}${email ? `, Email: ${email.trim()}` : ''}): "${message.trim()}"`
    );

    setIsSubmitted(true);
    setName('');
    setPhone('');
    setEmail('');
    setMessage('');
  };

  return (
    <div className="bg-background min-h-screen">
      {/* ── Hero Banner ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#00478d] via-[#005fa8] to-[#006d33] py-20 px-6 md:px-16">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto text-center space-y-4">
          <span className="text-white/80 font-bold tracking-widest uppercase text-xs bg-white/10 px-3 py-1 rounded-full border border-white/20">
            Hỗ Trợ 24/7
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
            Liên Hệ Với <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-green-300">GoodSmile</span>
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Hệ thống phòng khám mở cửa đón tiếp tất cả các ngày trong tuần. Hãy để lại tin nhắn hoặc gọi điện trực tiếp để nhận tư vấn kịp thời.
          </p>
        </div>
      </section>

      {/* ── Main Content ── */}
      <div className="max-w-6xl mx-auto px-6 md:px-16 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Details & Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-outline-variant p-6 shadow-sm space-y-6">
              <h3 className="font-headline-sm text-headline-sm text-primary">Thông Tin Liên Hệ</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center flex-shrink-0">
                    <Icon name="location_on" />
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface">Địa chỉ hệ thống</h4>
                    <p className="text-body-md text-on-surface-variant">Tòa nhà FPT Polytechnic, Kiều Mai, Phúc Diễn, Từ Liêm, Hà Nội</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center flex-shrink-0">
                    <Icon name="call" />
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface">Hotline khẩn cấp</h4>
                    <p className="text-body-md text-on-surface-variant font-bold text-primary">1900 6789 (Hỗ trợ 24/7)</p>
                    <p className="text-xs text-on-surface-variant">Điện thoại đặt lịch: (024) 7300 1900</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center flex-shrink-0">
                    <Icon name="mail" />
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface">Thư điện tử</h4>
                    <p className="text-body-md text-on-surface-variant">contact@goodsmile.vn</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center flex-shrink-0">
                    <Icon name="schedule" />
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface">Giờ làm việc</h4>
                    <p className="text-body-md text-on-surface-variant">Thứ 2 - Chủ nhật: 08:00 AM - 08:00 PM</p>
                    <p className="text-xs text-error font-semibold">* Làm việc cả ngày Lễ & Tết</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Google Maps Embed */}
            <div className="bg-surface-container rounded-xl border border-outline-variant h-64 relative overflow-hidden shadow-sm flex flex-col">
              <iframe
                title="Bản đồ chỉ đường Nha Khoa GoodSmile"
                src="https://maps.google.com/maps?q=Tr%C6%B0%E1%BB%9Dng%20Cao%20%C4%91%E1%BA%B3ng%20FPT%20Polytechnic%20H%C3%A0%20N%E1%BB%99i%20Ki%E1%BB%81u%20Mai%20Ph%C3%BAc%20Di%E1%BB%85n%20B%E1%BA%AFc%20T%E1%BB%AB%20Li%C3%AAm&t=&z=15&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full rounded-xl"
              ></iframe>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-xl border border-outline-variant p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-headline-sm text-headline-sm text-primary">Gửi Yêu Cầu Tư Vấn</h3>
              <p className="text-body-md text-on-surface-variant">
                Hãy gửi câu hỏi hoặc thắc mắc của bạn về tình trạng răng miệng, chúng tôi sẽ liên hệ lại qua điện thoại để giải đáp nhanh nhất.
              </p>

              {isSubmitted ? (
                <div className="bg-secondary-container/20 border border-secondary/30 p-6 rounded-lg text-center space-y-3">
                  <Icon name="check_circle" className="text-secondary text-5xl" />
                  <h4 className="font-bold text-on-secondary-container">Gửi thông tin thành công!</h4>
                  <p className="text-xs text-on-secondary-container">
                    Cảm ơn bạn đã liên hệ với GoodSmile. Đội ngũ tư vấn viên y khoa sẽ gọi điện hỗ trợ bạn trong vòng 15-30 phút.
                  </p>
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="text-xs text-primary font-bold underline cursor-pointer"
                  >
                    Gửi yêu cầu khác
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-label-md font-bold uppercase text-on-surface-variant mb-1">
                      Họ và tên của bạn *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Nguyễn Thị Lan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-label-md font-bold uppercase text-on-surface-variant mb-1">
                        Số điện thoại liên lạc *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="0901234567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-label-md font-bold uppercase text-on-surface-variant mb-1">
                        Địa chỉ Email (Nếu có)
                      </label>
                      <input
                        type="email"
                        placeholder="lan.nguyen@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-md focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-label-md font-bold uppercase text-on-surface-variant mb-1">
                      Mô tả triệu chứng hoặc nhu cầu tư vấn *
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Ví dụ: Răng tôi bị ê buốt khi dùng đồ ăn lạnh, muốn đặt khám tư vấn niềng răng..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-3 text-body-md focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-primary text-on-primary rounded-lg font-bold flex items-center justify-center gap-2 hover:shadow-lg active:scale-95 transition-transform cursor-pointer"
                  >
                    <Icon name="send" />
                    GỬI YÊU CẦU TƯ VẤN MIỄN PHÍ
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
