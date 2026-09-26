import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);

  const requestId = searchParams.get('requestId');
  const paymentId =
    searchParams.get('payment_id') ||
    searchParams.get('collection_id');

  const status =
    searchParams.get('status') ||
    searchParams.get('collection_status');

  useEffect(() => {
    console.log('PAYMENT SUCCESS');
    console.log('requestId:', requestId);
    console.log('paymentId:', paymentId);
    console.log('status:', status);

    setLoading(false);
  }, [requestId, paymentId, status]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2>Validando pago...</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>✓</div>

        <h1 style={styles.title}>
          ¡Solicitud registrada!
        </h1>

        <p style={styles.text}>
          Tu pago fue procesado correctamente y tu solicitud de servicio
          fue registrada.
        </p>

        {requestId && (
          <div style={styles.info}>
            <span>Solicitud</span>
            <strong>#{requestId}</strong>
          </div>
        )}

        {paymentId && (
          <div style={styles.info}>
            <span>ID de pago</span>
            <strong>{paymentId}</strong>
          </div>
        )}

        <div style={styles.status}>
          Pago aprobado
        </div>

        <button
          style={styles.primaryButton}
          onClick={() => navigate('/client/requests')}
        >
          Ver mis solicitudes
        </button>

        <button
          style={styles.secondaryButton}
          onClick={() => navigate('/client')}
        >
          Ir al inicio
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#f5f7fa',
    padding: '20px',
  },

  card: {
    width: '100%',
    maxWidth: '480px',
    background: '#ffffff',
    borderRadius: '20px',
    padding: '40px',
    textAlign: 'center',
    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
  },

  icon: {
    width: '75px',
    height: '75px',
    borderRadius: '50%',
    background: '#22c55e',
    color: '#ffffff',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '42px',
    margin: '0 auto 24px',
  },

  title: {
    marginBottom: '12px',
  },

  text: {
    color: '#666',
    lineHeight: '1.6',
    marginBottom: '30px',
  },

  info: {
    display: 'flex',
    justifyContent: 'space-between',
    background: '#f7f7f7',
    padding: '12px 16px',
    borderRadius: '10px',
    marginBottom: '10px',
  },

  status: {
    background: '#dcfce7',
    color: '#166534',
    padding: '12px',
    borderRadius: '10px',
    margin: '20px 0',
    fontWeight: '600',
  },

  primaryButton: {
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: '10px',
    background: '#111827',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '16px',
    marginBottom: '10px',
  },

  secondaryButton: {
    width: '100%',
    padding: '14px',
    border: '1px solid #ddd',
    borderRadius: '10px',
    background: '#ffffff',
    cursor: 'pointer',
    fontSize: '16px',
  },
};

export default PaymentSuccess;