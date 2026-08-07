/**
 * Tải về hình ảnh Mã QR Check-in kèm thông tin nhãn phòng khám
 */
export const downloadQrCode = (qrUrl: string, appointmentId: string) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      const padding = 24;
      const labelHeight = 54;
      canvas.width = img.width + padding * 2;
      canvas.height = img.height + padding * 2 + labelHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Nền trắng tinh khôi
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Viền bo góc mỏng nhã nhặn
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 2;
        ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

        // Vẽ QR Code ở giữa
        ctx.drawImage(img, padding, padding);

        // Nhãn Nha Khoa GoodSmile & Mã số hẹn
        ctx.font = 'bold 11px Arial, sans-serif';
        ctx.fillStyle = '#005EB8';
        ctx.textAlign = 'center';
        ctx.fillText('NHA KHOA GOOD SMILE — MÃ CHECK-IN', canvas.width / 2, canvas.height - 30);

        ctx.font = 'bold 15px "Courier New", monospace';
        ctx.fillStyle = '#0F172A';
        ctx.fillText(appointmentId, canvas.width / 2, canvas.height - 12);

        // Tự động tải xuống ảnh PNG
        const link = document.createElement('a');
        link.download = `QR-Checkin-${appointmentId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        return;
      }
    } catch (e) {
      console.warn('Canvas export failed, fallback to blob fetch', e);
    }
    fallbackBlobDownload(qrUrl, appointmentId);
  };

  img.onerror = () => {
    fallbackBlobDownload(qrUrl, appointmentId);
  };

  img.src = qrUrl;
};

const fallbackBlobDownload = (qrUrl: string, appointmentId: string) => {
  fetch(qrUrl)
    .then((res) => res.blob())
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `QR-Checkin-${appointmentId}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    })
    .catch(() => {
      window.open(qrUrl, '_blank');
    });
};
