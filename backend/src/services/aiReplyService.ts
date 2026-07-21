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

/**
 * Phân tích cảm xúc dựa trên số sao và nội dung bình luận
 */
export function analyzeSentiment(rating: number, comment: string): ReviewSentiment {
  const text = comment.toLowerCase();

  const negativeKeywords = [
    'đau', 'tệ', 'kém', 'dở', 'thái độ', 'chờ lâu', 'đắt', 'thất vọng', 
    'không hài lòng', 'xấu', 'bụi', 'bẩn', 'sơ sài', 'ẩu', 'quát', 'phàn nàn'
  ];

  const positiveKeywords = [
    'tốt', 'tuyệt vời', 'hài lòng', 'tận tâm', 'nhẹ nhàng', 'không đau', 
    'sạch sẽ', 'chuyên nghiệp', 'chu đáo', 'bác sĩ giỏi', 'đẹp', 'khen', 'yên tâm'
  ];

  const hasNegative = negativeKeywords.some(kw => text.includes(kw));
  const hasPositive = positiveKeywords.some(kw => text.includes(kw));

  if (rating <= 2 || (hasNegative && !hasPositive)) {
    return ReviewSentiment.NEGATIVE;
  }

  if (rating >= 4 || (hasPositive && !hasNegative)) {
    return ReviewSentiment.POSITIVE;
  }

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
      `GoodSmile chân thành cảm ơn ${cleanName} đã gửi phản hồi tích cực 5 sao cho ${serviceText}. Sự hài lòng và an tâm của bạn chính là động lực lớn nhất để đội ngũ y bác sĩ GoodSmile không ngừng nâng cao chất lượng dịch vụ mỗi ngày!`,
      `Trân trọng cảm ơn ${cleanName}! GoodSmile rất vinh hạnh được đồng hành cùng bạn trong hành trình chăm sóc nụ cười qua ${serviceText}. Hẹn gặp lại bạn trong những lần tái khám định kỳ sắp tới!`
    ];
    // Chọn mẫu ngẫu nhiên dựa trên độ dài comment
    const index = Math.abs(comment.length) % templates.length;
    aiReply = templates[index];
  } else if (sentiment === ReviewSentiment.NEGATIVE) {
    aiReply = `Nha khoa GoodSmile chân thành xin lỗi ${cleanName} về trải nghiệm chưa được như ý đối với ${serviceText}. Sự hài lòng và an toàn y tế của bệnh nhân là ưu tiên hàng đầu của chúng tôi. Ban Quản Lý Phòng Khám sẽ trực tiếp kiểm tra sự việc và liên hệ với bạn trong thời gian sớm nhất để lắng nghe và hỗ trợ thỏa đáng.`;
  } else {
    aiReply = `Cảm ơn ${cleanName} đã dành thời gian đóng góp ý kiến cho Nha khoa GoodSmile về ${serviceText}. Những chia sẻ chân thành của bạn là cơ sở quý báu để phòng khám tiếp tục hoàn thiện và nâng cao chất lượng phục vụ bệnh nhân tốt hơn nữa.`;
  }

  return {
    sentiment,
    aiReply,
  };
}
