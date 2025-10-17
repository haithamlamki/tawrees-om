import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface ExportButtonsProps {
  onExportPDF: () => Promise<void>;
  onExportExcel: () => void;
  disabled?: boolean;
}

export const ExportButtons = ({ onExportPDF, onExportExcel, disabled }: ExportButtonsProps) => {
  const { t } = useTranslation();

  const handlePDFExport = async () => {
    try {
      await onExportPDF();
      toast.success(t('common.success'), {
        description: t('calculator.pdfExported') || 'PDF exported successfully'
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(t('common.error'), {
        description: t('calculator.exportError') || 'Failed to export PDF'
      });
    }
  };

  const handleExcelExport = () => {
    try {
      onExportExcel();
      toast.success(t('common.success'), {
        description: t('calculator.excelExported') || 'Excel exported successfully'
      });
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error(t('common.error'), {
        description: t('calculator.exportError') || 'Failed to export Excel'
      });
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={handlePDFExport}
        disabled={disabled}
        variant="outline"
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        {t('calculator.exportPDF') || 'Export PDF'}
      </Button>
      <Button
        onClick={handleExcelExport}
        disabled={disabled}
        variant="outline"
        className="gap-2"
      >
        <FileSpreadsheet className="h-4 w-4" />
        {t('calculator.exportExcel') || 'Export Excel'}
      </Button>
    </div>
  );
};
