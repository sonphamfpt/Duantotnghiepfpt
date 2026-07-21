import React, { useState } from 'react';
import { Icon } from './Icon';
import { useClinic } from '../context/ClinicContext';
import { ServiceReviewItem } from '../types/clinic';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  appointmentId?: string;
  serviceId?: string;
  serviceName?: string;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  patientId,
  appointmentId,
  serviceId,
  serviceName,
}) => {
  const { addReview } = useClinic();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ServiceReviewItem | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim().length < 5) {
      alert('Nội dung đánh giá phải có ít nhất 5 ký tự.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addReview({
        patientId,
        appointmentId,
        serviceId,
        rating,
        comment: comment.trim(),
      });

      if (res.data) {
        setResult(res.data);
      } else {
        onClose();
      }
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra khi gửi đánh giá.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(5);
    setComment('');
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 transform transition-all">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#00478d] to-[#005eb8] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="rate_review" className="text-2xl text-yellow-300" />
            <div>
              <h3 className="font-bold text-lg leading-tight">Đánh Giá Dịch Vụ Nha Khoa</h3>
              <p className="text-xs text-white/80">{serviceName || 'Trải nghiệm điều trị tại GoodSmile'}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors"
          >
            <Icon name="close" className="text-xl" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {result ? (
            /* Instant AI Response View */
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 py-3 px-4 rounded-xl border border-emerald-200">
                <Icon name="check_circle" className="text-2xl" />
                <span className="font-bold text-sm">Gửi đánh giá thành công!</span>
              </div>

              {/* AI Reply Box */}
              {result.aiReply && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200 rounded-xl p-4 space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#005eb8]">
                      <Icon name="smart_toy" className="text-base text-indigo-600" />
                      <span>Phản hồi tự động từ Trợ lý AI GoodSmile</span>
                    </div>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                      result.sentiment === 'POSITIVE' ? 'bg-emerald-100 text-emerald-800' :
                      result.sentiment === 'NEGATIVE' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {result.sentiment === 'POSITIVE' ? 'Tích cực' : result.sentiment === 'NEGATIVE' ? 'Cần hỗ trợ' : 'Trung lập'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed italic">
                    "{result.aiReply}"
                  </p>
                </div>
              )}

              <button
                onClick={handleClose}
                className="w-full bg-[#005eb8] hover:bg-[#004a94] text-white py-3 font-bold rounded-xl transition-colors shadow-sm"
              >
                Hoàn tất
              </button>
            </div>
          ) : (
            /* Review Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Rating Stars */}
              <div className="text-center space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Mức độ hài lòng của bạn
                </label>
                <div className="flex justify-center items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= (hoverRating || rating);
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 text-3xl focus:outline-none transition-transform hover:scale-125 active:scale-95"
                      >
                        <Icon
                          name="star"
                          className={active ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}
                        />
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs font-semibold text-slate-600">
                  {rating === 5 && '🌟 Tuyệt vời - Rất hài lòng'}
                  {rating === 4 && '😊 Hài lòng - Dịch vụ tốt'}
                  {rating === 3 && '😐 Bình thường - Tạm ổn'}
                  {rating === 2 && '🙁 Chưa hài lòng'}
                  {rating === 1 && '😡 Rất thất vọng'}
                </p>
              </div>

              {/* Comment Textarea */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Ý kiến đóng góp & Cảm nhận <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  required
                  placeholder="Chia sẻ trải nghiệm của bạn về tay nghề bác sĩ, sự phục vụ của nhân viên, không gian phòng khám..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#005eb8] focus:border-transparent outline-none resize-none transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 bg-[#005eb8] hover:bg-[#004a94] text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Icon name="sync" className="animate-spin text-lg" />
                      <span>AI đang phân tích...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="send" className="text-base" />
                      <span>Gửi đánh giá</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
};
