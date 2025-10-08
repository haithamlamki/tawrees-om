import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2 solid #1a365d',
    paddingBottom: 15,
  },
  logo: {
    width: 100,
    height: 40,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: 5,
  },
  contractNumber: {
    fontSize: 10,
    color: '#718096',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 10,
    borderBottom: '1 solid #e2e8f0',
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: '35%',
    fontWeight: 'bold',
    color: '#4a5568',
  },
  value: {
    width: '65%',
    color: '#1a202c',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#edf2f7',
    padding: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #e2e8f0',
    padding: 8,
  },
  tableCol1: { width: '40%' },
  tableCol2: { width: '30%' },
  tableCol3: { width: '30%', textAlign: 'right' },
  termsText: {
    fontSize: 9,
    lineHeight: 1.5,
    color: '#4a5568',
    marginBottom: 5,
  },
  signature: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '45%',
    borderTop: '1 solid #2d3748',
    paddingTop: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#718096',
    borderTop: '1 solid #e2e8f0',
    paddingTop: 10,
  },
});

interface ContractPDFProps {
  contract: {
    contract_number: string;
    customer_name: string;
    storage_fee_monthly: number;
    handling_fee_per_unit: number;
    billing_cycle: string;
    payment_terms: string;
    start_date: string;
    end_date: string;
    auto_renewal: boolean;
    status: string;
    services: string[];
    special_terms?: string;
  };
  customerDetails?: {
    company_name?: string;
    address?: string;
    contact_name?: string;
    contact_phone?: string;
    contact_email?: string;
  };
}

export const ContractPDF = ({ contract, customerDetails }: ContractPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>WAREHOUSE MANAGEMENT SERVICE CONTRACT</Text>
        <Text style={styles.contractNumber}>Contract No: {contract.contract_number}</Text>
        <Text style={styles.contractNumber}>Generated: {format(new Date(), 'PPP')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Party Information</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Service Provider:</Text>
          <Text style={styles.value}>Tawreed Logistics LLC</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Customer Name:</Text>
          <Text style={styles.value}>{contract.customer_name}</Text>
        </View>
        {customerDetails?.company_name && (
          <View style={styles.row}>
            <Text style={styles.label}>Company:</Text>
            <Text style={styles.value}>{customerDetails.company_name}</Text>
          </View>
        )}
        {customerDetails?.contact_name && (
          <View style={styles.row}>
            <Text style={styles.label}>Contact Person:</Text>
            <Text style={styles.value}>{customerDetails.contact_name}</Text>
          </View>
        )}
        {customerDetails?.contact_phone && (
          <View style={styles.row}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{customerDetails.contact_phone}</Text>
          </View>
        )}
        {customerDetails?.contact_email && (
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{customerDetails.contact_email}</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contract Terms</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Contract Period:</Text>
          <Text style={styles.value}>
            {format(new Date(contract.start_date), 'PP')} - {format(new Date(contract.end_date), 'PP')}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Billing Cycle:</Text>
          <Text style={styles.value}>{contract.billing_cycle}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Payment Terms:</Text>
          <Text style={styles.value}>{contract.payment_terms}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Auto Renewal:</Text>
          <Text style={styles.value}>{contract.auto_renewal ? 'Yes' : 'No'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>{contract.status}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Fees</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCol1}>Service Description</Text>
            <Text style={styles.tableCol2}>Unit</Text>
            <Text style={styles.tableCol3}>Rate</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCol1}>Storage Fee</Text>
            <Text style={styles.tableCol2}>Monthly</Text>
            <Text style={styles.tableCol3}>${contract.storage_fee_monthly.toFixed(2)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCol1}>Handling Fee</Text>
            <Text style={styles.tableCol2}>Per Unit</Text>
            <Text style={styles.tableCol3}>${contract.handling_fee_per_unit.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Services Included</Text>
        {contract.services.map((service, index) => (
          <Text key={index} style={styles.termsText}>• {service}</Text>
        ))}
      </View>

      {contract.special_terms && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Terms & Conditions</Text>
          <Text style={styles.termsText}>{contract.special_terms}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General Terms & Conditions</Text>
        <Text style={styles.termsText}>
          1. The Customer agrees to pay all fees as outlined in this contract on time.
        </Text>
        <Text style={styles.termsText}>
          2. Storage fees are calculated based on space occupied and billed {contract.billing_cycle.toLowerCase()}.
        </Text>
        <Text style={styles.termsText}>
          3. The Service Provider maintains insurance coverage for stored goods up to the declared value.
        </Text>
        <Text style={styles.termsText}>
          4. The Customer must provide accurate inventory information and proper documentation.
        </Text>
        <Text style={styles.termsText}>
          5. Either party may terminate this contract with 30 days written notice.
        </Text>
        <Text style={styles.termsText}>
          6. This contract is governed by the laws of the jurisdiction where services are provided.
        </Text>
      </View>

      <View style={styles.signature}>
        <View style={styles.signatureBox}>
          <Text style={{ fontSize: 9, marginBottom: 30 }}>Service Provider Signature</Text>
          <Text style={{ fontSize: 8 }}>Name: _________________________</Text>
          <Text style={{ fontSize: 8 }}>Date: _________________________</Text>
        </View>
        <View style={styles.signatureBox}>
          <Text style={{ fontSize: 9, marginBottom: 30 }}>Customer Signature</Text>
          <Text style={{ fontSize: 8 }}>Name: _________________________</Text>
          <Text style={{ fontSize: 8 }}>Date: _________________________</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text>This is a legally binding contract. Please read all terms carefully before signing.</Text>
        <Text>Tawreed Logistics LLC | www.tawreed.com | support@tawreed.com</Text>
      </View>
    </Page>
  </Document>
);
