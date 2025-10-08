import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

Font.register({
  family: "Roboto",
  src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf",
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Roboto",
    fontSize: 10,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  companyInfo: {
    fontSize: 10,
    color: "#666",
    marginBottom: 5,
  },
  section: {
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  label: {
    fontWeight: "bold",
    width: "40%",
  },
  value: {
    width: "60%",
    textAlign: "right",
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    padding: 10,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    padding: 10,
  },
  tableCol: {
    width: "25%",
  },
  tableColWide: {
    width: "50%",
  },
  totals: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: "#333",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  grandTotal: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 10,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: "center",
    color: "#666",
    fontSize: 9,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 10,
  },
});

interface InvoicePDFProps {
  invoice: {
    invoice_number: string;
    issue_date: string;
    due_date: string;
    status: string;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    currency: string;
    notes?: string;
  };
  customer: {
    company_name: string;
    full_name: string;
    email?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
}

export const InvoicePDF = ({ invoice, customer, items }: InvoicePDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>INVOICE</Text>
        <Text style={styles.companyInfo}>Your Company Name</Text>
        <Text style={styles.companyInfo}>123 Business Street</Text>
        <Text style={styles.companyInfo}>City, Country</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Invoice Number:</Text>
          <Text style={styles.value}>{invoice.invoice_number}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Issue Date:</Text>
          <Text style={styles.value}>
            {new Date(invoice.issue_date).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Due Date:</Text>
          <Text style={styles.value}>
            {new Date(invoice.due_date).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>{invoice.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={{ fontWeight: "bold", marginBottom: 10 }}>Bill To:</Text>
        <Text>{customer.company_name}</Text>
        <Text>{customer.full_name}</Text>
        {customer.email && <Text>{customer.email}</Text>}
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableColWide}>Description</Text>
          <Text style={styles.tableCol}>Quantity</Text>
          <Text style={styles.tableCol}>Unit Price</Text>
          <Text style={styles.tableCol}>Total</Text>
        </View>
        {items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.tableColWide}>{item.description}</Text>
            <Text style={styles.tableCol}>{item.quantity}</Text>
            <Text style={styles.tableCol}>
              {invoice.currency} {item.unit_price.toFixed(2)}
            </Text>
            <Text style={styles.tableCol}>
              {invoice.currency} {item.total.toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.totals}>
        <View style={styles.totalRow}>
          <Text>Subtotal:</Text>
          <Text>
            {invoice.currency} {invoice.subtotal.toFixed(2)}
          </Text>
        </View>
        <View style={styles.totalRow}>
          <Text>Tax:</Text>
          <Text>
            {invoice.currency} {invoice.tax_amount.toFixed(2)}
          </Text>
        </View>
        <View style={[styles.totalRow, styles.grandTotal]}>
          <Text>Total Amount:</Text>
          <Text>
            {invoice.currency} {invoice.total_amount.toFixed(2)}
          </Text>
        </View>
      </View>

      {invoice.notes && (
        <View style={styles.section}>
          <Text style={{ fontWeight: "bold", marginBottom: 5 }}>Notes:</Text>
          <Text>{invoice.notes}</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text>Thank you for your business!</Text>
        <Text>For questions, contact: support@company.com</Text>
      </View>
    </Page>
  </Document>
);
