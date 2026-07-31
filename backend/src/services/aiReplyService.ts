import { ReviewSentiment } from '@prisma/client';

export interface AIReplyInput {
  patientName: string;
  serviceName?: string;
  rating: number;
  comment: string;
}

export interface AIReplyResult {
  sentiment: ReviewSentiment;
  aiReply: string;
}

export interface ModerationResult {
  isAppropriate: boolean;   // true = cho hiển thị, false = ẩn đi
  reason?: string;          // lý do bị ẩn (nếu có)
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

// ─── Danh sách từ cấm / bất lịch sự ─────────────────────────────────────────
const TOXIC_KEYWORDS = [
  // Tục tĩu tiếng Việt
  'đ.m', 'đmm', 'đml', 'vcl', 'đcm', 'mẹ kiếp', 'địt',
  'clgt', 'clm', 'cặc', 'lồn', 'buồi', 'chó má',
  // Xúc phạm / công kích cá nhân
  'óc chó', 'đần', 'khùng', 'điên rồ', 'rác rưởi',
  'thất học', 'mất dạy', 'đồ chó', 'súc vật', 'vô học',
  // Đe dọa
  'tao giết', 'tao chém', 'báo công an', 'tao kiện',
  // Spam / nội dung không liên quan
  'click vào đây', 'mua ngay', 'giảm giá sốc', 'liên hệ zalo để mua',
];

// Từ nhạy cảm mức MEDIUM — chỉ ẩn khi kết hợp với điều kiện khác
const SENSITIVE_KEYWORDS = [
  'chán', 'thất vọng', 'tức', 'bực', 'ghét', 'bực bội',
  'không ra gì', 'quá tệ', 'tệ lắm', 'không thể chấp nhận',
];

/**
 * AI Kiểm duyệt nội dung đánh giá
 * Tự động quyết định review có được hiển thị công khai không.
 * 
 * Quy tắc:
 *  HIGH  → ẩn ngay, không cần manager xét
 *  MEDIUM → ẩn, manager cần xem xét lại
 *  LOW   → để qua, không đủ bằng chứng để ẩn
 */
export function moderateContent(comment: string, rating: number): ModerationResult {
  const text = comment.toLowerCase().trim();

  // 1. Kiểm tra từ độc hại → ẩn ngay (HIGH)
  const toxicFound = TOXIC_KEYWORDS.filter(kw => text.includes(kw));
  if (toxicFound.length > 0) {
    return {
      isAppropriate: false,
      reason: `Nội dung chứa từ ngữ không phù hợp: "${toxicFound[0]}"`,
      confidence: 'HIGH',
    };
  }

  // 2. Nội dung quá ngắn + sao thấp → có thể spam (MEDIUM)
  if (text.length < 5 && rating <= 2) {
    return {
      isAppropriate: false,
      reason: 'Nội dung quá ngắn và không có giá trị thông tin.',
      confidence: 'MEDIUM',
    };
  }

  // 3. Nhiều từ nhạy cảm + 1 sao → công kích (MEDIUM)
  const sensitiveFound = SENSITIVE_KEYWORDS.filter(kw => text.includes(kw));
  if (sensitiveFound.length >= 3 && rating === 1) {
    return {
      isAppropriate: false,
      reason: 'Nội dung mang tính công kích mạnh, cần quản lý xét duyệt.',
      confidence: 'MEDIUM',
    };
  }

  // 4. Chứa link ngoài → spam (HIGH)
  if (/https?:\/\/|www\.|zalo\.me|t\.me\/|bit\.ly/i.test(comment)) {
    return {
      isAppropriate: false,
      reason: 'Nội dung chứa liên kết ngoài, có thể là spam.',
      confidence: 'HIGH',
    };
  }

  return { isAppropriate: true, confidence: 'HIGH' };
}

/**
 * Phân tích cảm xúc dựa trên số sao và nội dung bình luận
 */
export function analyzeSentiment(rating: number, comment: string): ReviewSentiment {
  const text = comment.toLowerCase();

  const negativeKeywords = [
    'đau', 'tệ', 'kém', 'dở', 'thái độ', 'chờ lâu', 'đắt', 'thất vọng',
    'không hài lòng', 'xấu', 'bụi', 'bẩn', 'sơ sài', 'ẩu', 'quát', 'phàn nàn',
  ];

  const positiveKeywords = [
    'tốt', 'tuyệt vời', 'hài lòng', 'tận tâm', 'nhẹ nhàng', 'không đau',
    'sạch sẽ', 'chuyên nghiệp', 'chu đáo', 'bác sĩ giỏi', 'đẹp', 'khen', 'yên tâm',
  ];

  const hasNegative = negativeKeywords.some(kw => text.includes(kw));
  const hasPositive = positiveKeywords.some(kw => text.includes(kw));

  if (rating <= 2 || (hasNegative && !hasPositive)) return ReviewSentiment.NEGATIVE;
  if (rating >= 4 || (hasPositive && !hasNegative)) return ReviewSentiment.POSITIVE;
  return ReviewSentiment.NEUTRAL;
}

/**
 * Sinh phản hồi tự động bằng AI (tailored cho Nha khoa GoodSmile)
 */
export function generateAIReply(input: AIReplyInput): AIReplyResult {
  const { patientName, serviceName, rating, comment } = input;
  const sentiment = analyzeSentiment(rating, comment);

  const cleanName = patientName.trim() || 'Quý khách';
  const serviceText = serviceName ? `dịch vụ "${serviceName}"` : 'dịch vụ';

  let aiReply = '';

  if (sentiment === ReviewSentiment.POSITIVE) {
    const templates = [
      `Cảm ơn ${cleanName} đã tin tưởng lựa chọn Nha khoa GoodSmile và trải nghiệm ${serviceText}! Đội ngũ bác sĩ và nhân viên vô cùng hạnh phúc khi biết bạn hài lòng với kết quả. Chúc ${cleanName} luôn sở hữu nụ cười rạng rỡ và khỏe mạnh! 🦷✨`,
      `GoodSmile chân thành cảm ơn ${cleanName} đã gửi phản hồi tích cực cho ${serviceText}. Sự hài lòng và an tâm của bạn chính là động lực lớn nhất để đội ngũ y bác sĩ GoodSmile không ngừng nâng cao chất lượng dịch vụ mỗi ngày!`,
      `Trân trọng cảm ơn ${cleanName}! GoodSmile rất vinh hạnh được đồng hành cùng bạn trong hành trình chăm sóc nụ cười qua ${serviceText}. Hẹn gặp lại bạn trong những lần tái khám định kỳ sắp tới!`,
    ];
    const index = Math.abs(comment.length) % templates.length;
    aiReply = templates[index];
  } else if (sentiment === ReviewSentiment.NEGATIVE) {
    aiReply = `Nha khoa GoodSmile chân thành xin lỗi ${cleanName} về trải nghiệm chưa được như ý đối với ${serviceText}. Sự hài lòng và an toàn y tế của bệnh nhân là ưu tiên hàng đầu của chúng tôi. Ban Quản Lý Phòng Khám sẽ trực tiếp kiểm tra sự việc và liên hệ với bạn trong thời gian sớm nhất để lắng nghe và hỗ trợ thỏa đáng.`;
  } else {
    aiReply = `Cảm ơn ${cleanName} đã dành thời gian đóng góp ý kiến cho Nha khoa GoodSmile về ${serviceText}. Những chia sẻ chân thành của bạn là cơ sở quý báu để phòng khám tiếp tục hoàn thiện và nâng cao chất lượng phục vụ bệnh nhân tốt hơn nữa.`;
  }

  return { sentiment, aiReply };
}
