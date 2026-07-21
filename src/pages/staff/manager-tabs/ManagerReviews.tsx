import React, { useState, useEffect } from 'react';
import { Icon } from '../../../components/Icon';
import { useClinic } from '../../../context/ClinicContext';

export const ManagerReviews: React.FC = () => {
  const { reviews, fetchManageReviews, toggleReviewStatus, reGenerateAIReply } = useClinic();
  const [sentimentFilter, setSentimentFilter] = useState<string>('ALL');
  const [ratingFilter, setRatingFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchManageReviews({
      sentiment: sentimentFilter !== 'ALL' ? sentimentFilter : undefined,
      rating: ratingFilter !== 'ALL' ? Number(ratingFilter) : undefined,
      status: statusFilter !== 'ALL' ? (statusFilter as any) : undefined,
    });
  }, [sentimentFilter, ratingFilter, statusFilter]);

  // Thống kê nhanh
  const totalCount = reviews.length;
  const positiveCount = reviews.filter(r => r.sentiment === 'POSITIVE').length;
  const neutralCount = reviews.filter(r => r.sentiment === 'NEUTRAL').length;
  const negativeCount = reviews.filter(r => r.sentiment === 'NEGATIVE').length;
  const avgRating = totalCount > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalCount).toFixed(1)
    : '5.0';

  const positivePercent = totalCount > 0 ? Math.round((positiveCount / totalCount) * 100) : 100;

  const handleToggleStatus = async (reviewId: string, currentStatus?: string) => {
    setLoadingId(reviewId);
    try {
      await toggleReviewStatus(reviewId, currentStatus || 'Approved');
    } finally {
      setLoadingId(null);
    }
  };

  const handleReGenerateAI = async (reviewId: string) => {
    setLoadingId(reviewId);
    try {
      await reGenerateAIReply(reviewId);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ── Dashboard Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Total & Average Rating */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Điểm đánh giá trung bình</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-slate-900">{avgRating}</span>
              <span className="text-xs font-bold text-amber-500">/ 5.0 sao</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Tổng cộng {totalCount} đánh giá</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-100">
            <Icon name="star" className="text-2xl" />
          </div>
        </div>

        {/* Positive Sentiment */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Tỷ lệ Tích Cực</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-emerald-600">{positivePercent}%</span>
            </div>
            <p className="text-xs text-emerald-600 font-semibold mt-1">{positiveCount} phản hồi hài lòng</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <Icon name="sentiment_very_satisfied" className="text-2xl" />
          </div>
        </div>

        {/* Neutral Sentiment */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Trung Lập / Góp ý</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-amber-600">{neutralCount}</span>
            </div>
            <p className="text-xs text-amber-600 font-semibold mt-1">Cần lắng nghe ý kiến</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <Icon name="sentiment_neutral" className="text-2xl" />
          </div>
        </div>

        {/* Negative Sentiment */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Tiêu Cực / Khiếu Nại</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-rose-600">{negativeCount}</span>
            </div>
            <p className="text-xs text-rose-600 font-semibold mt-1">Cần liên hệ xử lý ngay</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
            <Icon name="sentiment_dissatisfied" className="text-2xl" />
          </div>
        </div>

      </div>

      {/* ── Filters Bar ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Sentiment Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Phân loại AI:</span>
            <select
              value={sentimentFilter}
              onChange={(e) => setSentimentFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-[#005eb8]"
            >
              <option value="ALL">Tất cả cảm xúc</option>
              <option value="POSITIVE">🟢 Tích cực ({positiveCount})</option>
              <option value="NEUTRAL">🟡 Trung lập ({neutralCount})</option>
              <option value="NEGATIVE">🔴 Tiêu cực ({negativeCount})</option>
            </select>
          </div>

          {/* Rating Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Số sao:</span>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-[#005eb8]"
            >
              <option value="ALL">Tất cả mức sao</option>
              <option value="5">5 Sao ⭐⭐⭐⭐⭐</option>
              <option value="4">4 Sao ⭐⭐⭐⭐</option>
              <option value="3">3 Sao ⭐⭐⭐</option>
              <option value="2">2 Sao ⭐⭐</option>
              <option value="1">1 Sao ⭐</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-[#005eb8]"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Approved">Đã duyệt hiển thị</option>
              <option value="Hidden">Đã ẩn</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => fetchManageReviews()}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
        >
          <Icon name="refresh" className="text-base" />
          Tải lại
        </button>

      </div>

      {/* ── Review Cards List ── */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
            <Icon name="rate_review" className="text-5xl text-slate-300 mb-3" />
            <p className="font-bold text-base text-slate-700">Chưa có bài đánh giá nào</p>
            <p className="text-xs mt-1">Không tìm thấy phản hồi phù hợp với bộ lọc hiện tại.</p>
          </div>
        ) : (
          reviews.map((rev) => {
            const isHidden = rev.status === 'Hidden';

            return (
              <div
                key={rev.id}
                className={`bg-white border rounded-2xl p-6 shadow-xs transition-all space-y-4 ${
                  isHidden ? 'border-slate-200 bg-slate-50/70 opacity-75' : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                {/* Header Info */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#005eb8]/10 text-[#005eb8] font-extrabold flex items-center justify-center text-sm">
                      {rev.patientName ? rev.patientName.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-base">{rev.patientName}</h4>
                        {rev.patientPhone && (
                          <span className="text-xs text-slate-500">({rev.patientPhone})</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Dịch vụ: <span className="font-semibold text-slate-700">{rev.serviceName}</span>
                        {rev.dentistName && ` • Bác sĩ: ${rev.dentistName}`}
                      </p>
                    </div>
                  </div>

                  {/* Badges & Stars */}
                  <div className="flex items-center gap-2">
                    {/* Stars */}
                    <div className="flex items-center gap-0.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Icon
                          key={s}
                          name="star"
                          className={`text-sm ${s <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                        />
                      ))}
                      <span className="text-xs font-extrabold text-amber-700 ml-1">{rev.rating}.0</span>
                    </div>

                    {/* Sentiment Badge */}
                    <span className={`text-xs font-extrabold px-3 py-1 rounded-lg uppercase tracking-wider ${
                      rev.sentiment === 'POSITIVE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                      rev.sentiment === 'NEGATIVE' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                      'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {rev.sentiment === 'POSITIVE' ? '🟢 Tích cực' : rev.sentiment === 'NEGATIVE' ? '🔴 Tiêu cực' : '🟡 Trung lập'}
                    </span>

                    {/* Status Badge */}
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                      isHidden ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {isHidden ? 'Đã ẩn' : 'Hiển thị'}
                    </span>
                  </div>
                </div>

                {/* Comment */}
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Ý kiến của bệnh nhân:</p>
                  <p className="text-slate-800 font-medium text-sm leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    "{rev.comment}"
                  </p>
                </div>

                {/* AI Auto-Reply Box */}
                {rev.aiReply && (
                  <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/50 border border-blue-200/80 rounded-xl p-4 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#005eb8]">
                        <Icon name="smart_toy" className="text-base text-indigo-600" />
                        <span>Phản Hồi Tự Động Từ AI GoodSmile</span>
                      </div>

                      {/* Re-generate button */}
                      <button
                        onClick={() => handleReGenerateAI(rev.id)}
                        disabled={loadingId === rev.id}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline disabled:opacity-50"
                        title="Tạo lại phản hồi AI mới"
                      >
                        <Icon name="sync" className={`text-sm ${loadingId === rev.id ? 'animate-spin' : ''}`} />
                        <span>AI Tạo lại</span>
                      </button>
                    </div>

                    <p className="text-sm text-slate-700 leading-relaxed italic">
                      "{rev.aiReply}"
                    </p>
                  </div>
                )}

                {/* Card Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => handleToggleStatus(rev.id, rev.status)}
                    disabled={loadingId === rev.id}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border ${
                      isHidden 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                        : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    <Icon name={isHidden ? 'visibility' : 'visibility_off'} className="text-base" />
                    <span>{isHidden ? 'Duyệt Cho Hiển Thị' : 'Ẩn Đánh Giá Này'}</span>
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
