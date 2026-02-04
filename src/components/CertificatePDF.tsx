import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Estilos do certificado
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 60,
  },
  border: {
    borderWidth: 3,
    borderColor: '#2563eb',
    borderStyle: 'solid',
    padding: 40,
    minHeight: '100%',
  },
  header: {
    textAlign: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 50,
  },
  body: {
    marginBottom: 40,
  },
  text: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 1.6,
    marginBottom: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 20,
    textDecoration: 'underline',
  },
  course: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
    textAlign: 'center',
    marginBottom: 20,
  },
  footer: {
    marginTop: 60,
    textAlign: 'center',
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  hash: {
    fontSize: 10,
    color: '#999',
    marginTop: 20,
  },
});

// Componente do certificado em PDF
export const CertificatePDF = ({ userName, courseName, date, hash }: {
  userName: string;
  courseName: string;
  date: string;
  hash: string;
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.border}>
        <View style={styles.header}>
          <Text style={styles.title}>CERTIFICADO</Text>
          <Text style={styles.subtitle}>de Conclusão de Curso</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.text}>
            Certificamos que
          </Text>
          <Text style={styles.name}>
            {userName}
          </Text>
          <Text style={styles.text}>
            concluiu com êxito o curso
          </Text>
          <Text style={styles.course}>
            {courseName}
          </Text>
          <Text style={styles.text}>
            demonstrando dedicação e empenho no aprendizado.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.date}>
            Data de Conclusão: {date}
          </Text>
          <Text style={styles.hash}>
            Código de Validação: {hash}
          </Text>
        </View>
      </View>
    </Page>
  </Document>
);
