import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2 solid #000",
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
  },
  titleArabic: {
    fontSize: 18,
    textAlign: "right",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    borderBottom: "1 solid #ccc",
    paddingBottom: 3,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "2 solid #000",
    paddingBottom: 5,
    marginBottom: 5,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #eee",
    paddingVertical: 5,
  },
  col1: { width: "10%" },
  col2: { width: "40%" },
  col3: { width: "15%", textAlign: "right" },
  col4: { width: "15%", textAlign: "right" },
  col5: { width: "20%", textAlign: "right" },
  totalsSection: {
    marginTop: 20,
    marginLeft: "50%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    paddingVertical: 3,
  },
  totalLabel: {
    width: "60%",
    textAlign: "right",
    paddingRight: 10,
  },
  totalValue: {
    width: "40%",
    textAlign: "right",
    fontWeight: "bold",
  },
  grandTotal: {
    borderTop: "2 solid #000",
    paddingTop: 8,
    marginTop: 5,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 8,
    color: "#666",
    borderTop: "1 solid #ccc",
    paddingTop: 10,
  },
  vatBox: {
    backgroundColor: "#f5f5f5",
    padding: 8,
    marginTop: 10,
    borderRadius: 3,
  },
});

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  vat_exempt?: boolean;
}

interface TaxCompliantInvoicePDFProps {
  invoice: {
    invoice_number: string;
    created_at: string;
    due_date?: string;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    vat_rate?: number;
    vendor_vatin?: string;
    customer_vatin?: string;
    notes?: string;
  };
  customer: {
    company_name: string;
    customer_code: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  items: InvoiceItem[];
  vendor?: {
    company_name: string;
    vatin: string;
    address: string;
    city: string;
    country: string;
    phone: string;
    email: string;
  };
}

export const TaxCompliantInvoicePDF = ({
  invoice,
  customer,
  items,
  vendor = {
    company_name: "Your Company LLC",
    vatin: "OM-VATIN-123456789",
    address: "Industrial Area, Building 123",
    city: "Muscat",
    country: "Oman",
    phone: "+968-24-123456",
    email: "billing@yourcompany.om",
  },
}: TaxCompliantInvoicePDFProps) => {
  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(3)} OMR`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>TAX INVOICE</Text>
          <Text style={styles.titleArabic}>فاتورة ضريبية</Text>
          <View style={styles.row}>
            <Text>Invoice No: {invoice.invoice_number}</Text>
            <Text>Date: {formatDate(invoice.created_at)}</Text>
          </View>
          {invoice.due_date && (
            <View style={styles.row}>
              <Text>Due Date: {formatDate(invoice.due_date)}</Text>
            </View>
          )}
        </View>

        {/* Vendor & Customer Details */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 20 }}>
          <View style={{ width: "48%" }}>
            <Text style={styles.sectionTitle}>From / Vendor</Text>
            <Text style={{ fontWeight: "bold", marginBottom: 3 }}>{vendor.company_name}</Text>
            <Text>VATIN: {invoice.vendor_vatin || vendor.vatin}</Text>
            <Text>{vendor.address}</Text>
            <Text>{vendor.city}, {vendor.country}</Text>
            <Text>Tel: {vendor.phone}</Text>
            <Text>Email: {vendor.email}</Text>
          </View>

          <View style={{ width: "48%" }}>
            <Text style={styles.sectionTitle}>To / Customer</Text>
            <Text style={{ fontWeight: "bold", marginBottom: 3 }}>{customer.company_name}</Text>
            <Text>Customer Code: {customer.customer_code}</Text>
            {invoice.customer_vatin && <Text>VATIN: {invoice.customer_vatin}</Text>}
            {customer.address && <Text>{customer.address}</Text>}
            {customer.city && <Text>{customer.city}, {customer.country || "Oman"}</Text>}
            {customer.phone && <Text>Tel: {customer.phone}</Text>}
            {customer.email && <Text>Email: {customer.email}</Text>}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>#</Text>
            <Text style={styles.col2}>Description</Text>
            <Text style={styles.col3}>Qty</Text>
            <Text style={styles.col4}>Unit Price</Text>
            <Text style={styles.col5}>Total</Text>
          </View>
          {items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.col1}>{index + 1}</Text>
              <Text style={styles.col2}>
                {item.description}
                {item.vat_exempt && " (VAT Exempt)"}
              </Text>
              <Text style={styles.col3}>{item.quantity.toFixed(3)}</Text>
              <Text style={styles.col4}>{formatCurrency(item.unit_price)}</Text>
              <Text style={styles.col5}>{formatCurrency(item.total_price)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              VAT ({invoice.vat_rate || 5}%):
            </Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.tax_amount)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={[styles.totalLabel, { fontSize: 12 }]}>Total Amount:</Text>
            <Text style={[styles.totalValue, { fontSize: 12 }]}>
              {formatCurrency(invoice.total_amount)}
            </Text>
          </View>
        </View>

        {/* VAT Info Box */}
        <View style={styles.vatBox}>
          <Text style={{ fontWeight: "bold", marginBottom: 3 }}>
            VAT Summary / ملخص ضريبة القيمة المضافة
          </Text>
          <View style={styles.row}>
            <Text>Taxable Amount: {formatCurrency(invoice.subtotal)}</Text>
            <Text>VAT Amount: {formatCurrency(invoice.tax_amount)}</Text>
          </View>
          <Text style={{ marginTop: 3, fontSize: 8, color: "#666" }}>
            This is a VAT-compliant invoice as per Oman Tax Authority regulations
          </Text>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={[styles.section, { marginTop: 15 }]}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.row}>
            <Text>Generated: {new Date().toLocaleString("en-GB")}</Text>
            <Text>Page 1 of 1</Text>
          </View>
          <Text style={{ marginTop: 5, textAlign: "center" }}>
            All amounts are in Omani Rial (OMR) - Currency rounded to 3 decimal places (baisa)
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default TaxCompliantInvoicePDF;
