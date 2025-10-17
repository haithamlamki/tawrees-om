import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { ShipmentItem, QuoteBreakdown } from '@/types/calculator';

interface ExportData {
  shippingType: 'air' | 'sea';
  items: ShipmentItem[];
  quote: QuoteBreakdown | null;
  shippingRates?: Array<{
    carrier: string;
    service: string;
    cost: number;
    currency: string;
    transitDays: number;
  }>;
  deliveryType?: string;
  deliveryCity?: string;
  containerType?: string;
  language: 'en' | 'ar' | 'zh-CN';
}

export const exportToPDF = async (data: ExportData): Promise<void> => {
  const { language } = data;
  const isRTL = language === 'ar';

  // Create a temporary div with the content to export
  const tempDiv = document.createElement('div');
  tempDiv.style.width = '800px';
  tempDiv.style.padding = '40px';
  tempDiv.style.backgroundColor = 'white';
  tempDiv.style.direction = isRTL ? 'rtl' : 'ltr';
  tempDiv.style.fontFamily = isRTL ? 'Arial, sans-serif' : 'Arial, sans-serif';
  
  // Build HTML content
  const title = language === 'ar' ? 'حاسبة الشحن - تقرير' : language === 'zh-CN' ? '运费计算器 - 报告' : 'Shipping Calculator - Report';
  const date = new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : language === 'zh-CN' ? 'zh-CN' : 'en-US');
  
  let html = `
    <div style="margin-bottom: 30px;">
      <h1 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 24px;">${title}</h1>
      <p style="margin: 0; color: #666; font-size: 12px;">${date}</p>
    </div>
  `;

  // Shipment Details
  const detailsTitle = language === 'ar' ? 'تفاصيل الشحن' : language === 'zh-CN' ? '运输详情' : 'Shipment Details';
  const shippingTypeLabel = language === 'ar' ? 'نوع الشحن' : language === 'zh-CN' ? '运输方式' : 'Shipping Type';
  const shippingTypeText = data.shippingType === 'air' 
    ? (language === 'ar' ? 'شحن جوي' : language === 'zh-CN' ? '空运' : 'Air Freight')
    : (language === 'ar' ? 'شحن بحري' : language === 'zh-CN' ? '海运' : 'Sea Freight');

  html += `
    <div style="margin-bottom: 20px;">
      <h2 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 18px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">${detailsTitle}</h2>
      <p style="margin: 5px 0;"><strong>${shippingTypeLabel}:</strong> ${shippingTypeText}</p>
      ${data.containerType ? `<p style="margin: 5px 0;"><strong>${language === 'ar' ? 'نوع الحاوية' : language === 'zh-CN' ? '集装箱类型' : 'Container Type'}:</strong> ${data.containerType}</p>` : ''}
      ${data.deliveryType ? `<p style="margin: 5px 0;"><strong>${language === 'ar' ? 'نوع التسليم' : language === 'zh-CN' ? '配送方式' : 'Delivery Type'}:</strong> ${data.deliveryType}</p>` : ''}
      ${data.deliveryCity ? `<p style="margin: 5px 0;"><strong>${language === 'ar' ? 'مدينة التسليم' : language === 'zh-CN' ? '配送城市' : 'Delivery City'}:</strong> ${data.deliveryCity}</p>` : ''}
    </div>
  `;

  // Items Table
  if (data.items.length > 0) {
    const itemsTitle = language === 'ar' ? 'قائمة الشحنات' : language === 'zh-CN' ? '货物清单' : 'Items List';
    html += `
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 18px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">${itemsTitle}</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: ${isRTL ? 'right' : 'left'};">${language === 'ar' ? 'الكمية' : language === 'zh-CN' ? '数量' : 'Qty'}</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: ${isRTL ? 'right' : 'left'};">${language === 'ar' ? 'الطول' : language === 'zh-CN' ? '长度' : 'Length'}</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: ${isRTL ? 'right' : 'left'};">${language === 'ar' ? 'العرض' : language === 'zh-CN' ? '宽度' : 'Width'}</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: ${isRTL ? 'right' : 'left'};">${language === 'ar' ? 'الارتفاع' : language === 'zh-CN' ? '高度' : 'Height'}</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: ${isRTL ? 'right' : 'left'};">${language === 'ar' ? 'الوزن' : language === 'zh-CN' ? '重量' : 'Weight'}</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map(item => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.length} ${item.dimensionUnit}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.width} ${item.dimensionUnit}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.height} ${item.dimensionUnit}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.weight} ${item.weightUnit}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Quote Breakdown
  if (data.quote) {
    const quoteTitle = language === 'ar' ? 'تفاصيل السعر' : language === 'zh-CN' ? '报价明细' : 'Quote Breakdown';
    html += `
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 18px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">${quoteTitle}</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tbody>
            ${data.quote.calculations.totalCBM ? `<tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>${language === 'ar' ? 'الحجم الإجمالي' : language === 'zh-CN' ? '总体积' : 'Total CBM'}:</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.quote.calculations.totalCBM.toFixed(3)} m³</td></tr>` : ''}
            ${data.quote.calculations.totalWeight ? `<tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>${language === 'ar' ? 'الوزن الإجمالي' : language === 'zh-CN' ? '总重量' : 'Total Weight'}:</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.quote.calculations.totalWeight.toFixed(2)} kg</td></tr>` : ''}
            ${data.quote.calculations.volumetricWeight ? `<tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>${language === 'ar' ? 'الوزن الحجمي' : language === 'zh-CN' ? '体积重量' : 'Volumetric Weight'}:</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${data.quote.calculations.volumetricWeight.toFixed(2)} kg</td></tr>` : ''}
            <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>${language === 'ar' ? 'السعر الأساسي' : language === 'zh-CN' ? '基础费率' : 'Base Rate'}:</strong></td><td style="border: 1px solid #ddd; padding: 8px;">OMR ${data.quote.baseRate.toFixed(3)}</td></tr>
            ${data.quote.surcharges.map(s => `<tr><td style="border: 1px solid #ddd; padding: 8px;">${s.type}:</td><td style="border: 1px solid #ddd; padding: 8px;">OMR ${s.amount.toFixed(3)}</td></tr>`).join('')}
            <tr style="background-color: #f5f5f5;"><td style="border: 1px solid #ddd; padding: 8px;"><strong>${language === 'ar' ? 'المجموع' : language === 'zh-CN' ? '总价' : 'Total'}:</strong></td><td style="border: 1px solid #ddd; padding: 8px;"><strong>OMR ${data.quote.total.toFixed(3)}</strong></td></tr>
          </tbody>
        </table>
      </div>
    `;
  }

  // Shipping Rates
  if (data.shippingRates && data.shippingRates.length > 0) {
    const ratesTitle = language === 'ar' ? 'أسعار الشحن المباشرة' : language === 'zh-CN' ? '实时运费报价' : 'Live Shipping Rates';
    html += `
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 18px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">${ratesTitle}</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: ${isRTL ? 'right' : 'left'};">${language === 'ar' ? 'الناقل' : language === 'zh-CN' ? '承运商' : 'Carrier'}</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: ${isRTL ? 'right' : 'left'};">${language === 'ar' ? 'الخدمة' : language === 'zh-CN' ? '服务' : 'Service'}</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: ${isRTL ? 'right' : 'left'};">${language === 'ar' ? 'التكلفة' : language === 'zh-CN' ? '费用' : 'Cost'}</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: ${isRTL ? 'right' : 'left'};">${language === 'ar' ? 'مدة التسليم' : language === 'zh-CN' ? '运输时间' : 'Transit'}</th>
            </tr>
          </thead>
          <tbody>
            ${data.shippingRates.map(rate => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${rate.carrier}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${rate.service}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${rate.currency} ${rate.cost.toFixed(2)}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${rate.transitDays} ${language === 'ar' ? 'أيام' : language === 'zh-CN' ? '天' : 'days'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  tempDiv.innerHTML = html;
  document.body.appendChild(tempDiv);

  try {
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    
    const filename = `shipping-calculator-${new Date().getTime()}.pdf`;
    pdf.save(filename);
  } finally {
    document.body.removeChild(tempDiv);
  }
};

export const exportToExcel = (data: ExportData): void => {
  const { language } = data;
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Items
  if (data.items.length > 0) {
    const itemsData = data.items.map(item => ({
      [language === 'ar' ? 'الكمية' : language === 'zh-CN' ? '数量' : 'Quantity']: item.quantity,
      [language === 'ar' ? 'الطول' : language === 'zh-CN' ? '长度' : 'Length']: `${item.length} ${item.dimensionUnit}`,
      [language === 'ar' ? 'العرض' : language === 'zh-CN' ? '宽度' : 'Width']: `${item.width} ${item.dimensionUnit}`,
      [language === 'ar' ? 'الارتفاع' : language === 'zh-CN' ? '高度' : 'Height']: `${item.height} ${item.dimensionUnit}`,
      [language === 'ar' ? 'الوزن' : language === 'zh-CN' ? '重量' : 'Weight']: `${item.weight} ${item.weightUnit}`,
    }));

    const itemsSheet = XLSX.utils.json_to_sheet(itemsData);
    XLSX.utils.book_append_sheet(workbook, itemsSheet, language === 'ar' ? 'الشحنات' : language === 'zh-CN' ? '货物' : 'Items');
  }

  // Sheet 2: Quote Summary
  if (data.quote) {
    const summaryData = [
      { 
        [language === 'ar' ? 'البند' : language === 'zh-CN' ? '项目' : 'Item']: language === 'ar' ? 'الحجم الإجمالي' : language === 'zh-CN' ? '总体积' : 'Total CBM',
        [language === 'ar' ? 'القيمة' : language === 'zh-CN' ? '数值' : 'Value']: data.quote.calculations.totalCBM ? `${data.quote.calculations.totalCBM.toFixed(3)} m³` : 'N/A'
      },
      {
        [language === 'ar' ? 'البند' : language === 'zh-CN' ? '项目' : 'Item']: language === 'ar' ? 'الوزن الإجمالي' : language === 'zh-CN' ? '总重量' : 'Total Weight',
        [language === 'ar' ? 'القيمة' : language === 'zh-CN' ? '数值' : 'Value']: data.quote.calculations.totalWeight ? `${data.quote.calculations.totalWeight.toFixed(2)} kg` : 'N/A'
      },
      {
        [language === 'ar' ? 'البند' : language === 'zh-CN' ? '项目' : 'Item']: language === 'ar' ? 'الوزن الحجمي' : language === 'zh-CN' ? '体积重量' : 'Volumetric Weight',
        [language === 'ar' ? 'القيمة' : language === 'zh-CN' ? '数值' : 'Value']: data.quote.calculations.volumetricWeight ? `${data.quote.calculations.volumetricWeight.toFixed(2)} kg` : 'N/A'
      },
      {
        [language === 'ar' ? 'البند' : language === 'zh-CN' ? '项目' : 'Item']: language === 'ar' ? 'السعر الأساسي' : language === 'zh-CN' ? '基础费率' : 'Base Rate',
        [language === 'ar' ? 'القيمة' : language === 'zh-CN' ? '数值' : 'Value']: `OMR ${data.quote.baseRate.toFixed(3)}`
      },
      ...data.quote.surcharges.map(s => ({
        [language === 'ar' ? 'البند' : language === 'zh-CN' ? '项目' : 'Item']: s.type,
        [language === 'ar' ? 'القيمة' : language === 'zh-CN' ? '数值' : 'Value']: `OMR ${s.amount.toFixed(3)}`
      })),
      {
        [language === 'ar' ? 'البند' : language === 'zh-CN' ? '项目' : 'Item']: language === 'ar' ? 'المجموع' : language === 'zh-CN' ? '总价' : 'Total',
        [language === 'ar' ? 'القيمة' : language === 'zh-CN' ? '数值' : 'Value']: `OMR ${data.quote.total.toFixed(3)}`
      }
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, language === 'ar' ? 'ملخص' : language === 'zh-CN' ? '摘要' : 'Summary');
  }

  // Sheet 3: Shipping Rates
  if (data.shippingRates && data.shippingRates.length > 0) {
    const ratesData = data.shippingRates.map(rate => ({
      [language === 'ar' ? 'الناقل' : language === 'zh-CN' ? '承运商' : 'Carrier']: rate.carrier,
      [language === 'ar' ? 'الخدمة' : language === 'zh-CN' ? '服务' : 'Service']: rate.service,
      [language === 'ar' ? 'التكلفة' : language === 'zh-CN' ? '费用' : 'Cost']: `${rate.currency} ${rate.cost.toFixed(2)}`,
      [language === 'ar' ? 'مدة التسليم (أيام)' : language === 'zh-CN' ? '运输时间（天）' : 'Transit (days)']: rate.transitDays
    }));

    const ratesSheet = XLSX.utils.json_to_sheet(ratesData);
    XLSX.utils.book_append_sheet(workbook, ratesSheet, language === 'ar' ? 'الأسعار' : language === 'zh-CN' ? '报价' : 'Rates');
  }

  const filename = `shipping-calculator-${new Date().getTime()}.xlsx`;
  XLSX.writeFile(workbook, filename);
};
