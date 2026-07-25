/**
 * Utility xuất dữ liệu ra file CSV/Excel hỗ trợ tiếng Việt có dấu (UTF-8 BOM).
 * Khi mở trực tiếp bằng Microsoft Excel sẽ hiển thị đúng chuẩn tiếng Việt.
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  filename: string,
  headersMap?: Record<string, string>
): void {
  if (!data || data.length === 0) {
    alert('Không có dữ liệu để xuất file!');
    return;
  }

  // Lấy các thuộc tính cần xuất
  const keys = headersMap ? Object.keys(headersMap) : Object.keys(data[0]);

  // Tiêu đề cột
  const headerRow = keys
    .map((k) => {
      const label = headersMap ? headersMap[k] : k;
      return `"${String(label).replace(/"/g, '""')}"`;
    })
    .join(',');

  // Dữ liệu từng dòng
  const dataRows = data.map((item) => {
    return keys
      .map((k) => {
        const val = item[k];
        let strVal = val === null || val === undefined ? '' : String(val);
        strVal = strVal.replace(/"/g, '""');
        return `"${strVal}"`;
      })
      .join(',');
  });

  // Thêm UTF-8 BOM (\uFEFF) cho Microsoft Excel mở tiếng Việt đúng định dạng
  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
