
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import { api } from '../../api/api';
import logo from '../../assets/logo.png';

import './SpecialistEarnings.css';

/* =========================================
   TIPOS
========================================= */

type Wallet = {
  availableBalance: number | string;
  pendingBalance: number | string;
  totalEarned: number | string;
};

type ServiceEarning = {
  serviceId: number;
  serviceName: string;
  completedJobs: number;
  amount: number | string;
};

type TransactionType =
  | 'SERVICE_EARNING'
  | 'PAYOUT'
  | 'REFUND'
  | 'ADJUSTMENT';

type TransactionStatus =
  | 'PENDING'
  | 'AVAILABLE'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

type WalletTransaction = {
  id: number;

  type: TransactionType;

  status: TransactionStatus;

  amount: number | string;

  description?: string | null;

  requestId?: number | null;

  createdAt: string;
};

type PayoutAccount = {
  id: number;

  bankName: string;

  last4: string;

  isDefault?: boolean;
};

/* =========================================
   VALORES INICIALES
========================================= */

const emptyWallet: Wallet = {
  availableBalance: 0,
  pendingBalance: 0,
  totalEarned: 0,
};

/* =========================================
   COMPONENTE
========================================= */

const SpecialistEarnings = () => {

  const navigate =
    useNavigate();

  /* =====================================
     ESTADOS
  ===================================== */

  const [
    wallet,
    setWallet,
  ] =
    useState<Wallet>(
      emptyWallet
    );

  const [
    earnings,
    setEarnings,
  ] =
    useState<
      ServiceEarning[]
    >([]);

  const [
    transactions,
    setTransactions,
  ] =
    useState<
      WalletTransaction[]
    >([]);

  const [
    accounts,
    setAccounts,
  ] =
    useState<
      PayoutAccount[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState('');

  /* =====================================
     MODAL RETIRO
  ===================================== */

  const [
    showWithdrawModal,
    setShowWithdrawModal,
  ] =
    useState(false);

  const [
    withdrawAmount,
    setWithdrawAmount,
  ] =
    useState('');

  const [
    selectedAccountId,
    setSelectedAccountId,
  ] =
    useState('');

  const [
    withdrawing,
    setWithdrawing,
  ] =
    useState(false);

  const [
    withdrawError,
    setWithdrawError,
  ] =
    useState('');

  /* =====================================
     TOKEN
  ===================================== */

  const getToken =
    () => {

      return (
        localStorage.getItem(
          'token'
        ) || ''
      );
    };

  /* =====================================
     FORMATO MONEDA
  ===================================== */

  const formatMoney =
    (
      value:
        | number
        | string
        | null
        | undefined
    ) => {

      const numberValue =
        Number(
          value || 0
        );

      return (
        numberValue
          .toLocaleString(
            'es-MX',
            {
              style:
                'currency',

              currency:
                'MXN',

              minimumFractionDigits:
                2,

              maximumFractionDigits:
                2,
            }
          )
      );
    };

  /* =====================================
     FORMATO FECHA
  ===================================== */

  const formatDate =
    (
      value?:
        | string
        | null
    ) => {

      if (!value) {
        return '';
      }

      const date =
        new Date(
          value
        );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return value;
      }

      return (
        new Intl
          .DateTimeFormat(
            'es-MX',
            {
              day:
                '2-digit',

              month:
                'short',

              year:
                'numeric',

              hour:
                '2-digit',

              minute:
                '2-digit',
            }
          )
          .format(
            date
          )
      );
    };

  /* =====================================
     ESTADO MOVIMIENTO
  ===================================== */

  const getStatusLabel =
    (
      status:
        TransactionStatus
    ) => {

      switch (
        status
      ) {

        case 'PENDING':
          return 'Pendiente';

        case 'AVAILABLE':
          return 'Disponible';

        case 'PROCESSING':
          return 'Procesando';

        case 'COMPLETED':
          return 'Completado';

        case 'FAILED':
          return 'Fallido';

        case 'CANCELLED':
          return 'Cancelado';

        default:
          return status;
      }
    };

  const getStatusClass =
    (
      status:
        TransactionStatus
    ) => {

      if (
        status ===
          'FAILED' ||
        status ===
          'CANCELLED'
      ) {
        return 'failed';
      }

      if (
        status ===
          'PENDING' ||
        status ===
          'PROCESSING'
      ) {
        return 'pending';
      }

      return '';
    };

  /* =====================================
     NOMBRE DEL MOVIMIENTO
  ===================================== */

  const getTransactionTitle =
    (
      transaction:
        WalletTransaction
    ) => {

      switch (
        transaction.type
      ) {

        case 'SERVICE_EARNING':

          return (
            transaction
              .requestId
              ? `Servicio #${transaction.requestId}`
              : 'Ganancia por servicio'
          );

        case 'PAYOUT':

          return 'Retiro de saldo';

        case 'REFUND':

          return 'Reembolso';

        case 'ADJUSTMENT':

          return 'Ajuste de saldo';

        default:

          return 'Movimiento';
      }
    };

  /* =====================================
     CARGAR WALLET
  ===================================== */

  const loadData =
    useCallback(
      async () => {

        const token =
          getToken();

        if (!token) {

          navigate(
            '/login'
          );

          return;
        }

        try {

          setLoading(
            true
          );

          setError('');

          /*
            Hacemos llamadas independientes para
            que si una sección falla no se caiga
            necesariamente toda la pantalla.
          */

          const results =
            await Promise.allSettled([
              api.get(
                '/wallet/me',
                {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },
                }
              ),

              api.get(
                '/wallet/earnings',
                {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },
                }
              ),

              api.get(
                '/wallet/transactions',
                {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },
                }
              ),

              api.get(
                '/wallet/accounts',
                {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },
                }
              ),
            ]);

          /* =============================
             WALLET
          ============================== */

          const walletResult =
            results[0];

          if (
            walletResult.status ===
            'fulfilled'
          ) {

            setWallet(
              walletResult
                .value
                .data
                ?.wallet ||
              emptyWallet
            );

          } else {

            console.error(
              'ERROR WALLET:',
              walletResult.reason
            );
          }

          /* =============================
             GANANCIAS
          ============================== */

          const earningsResult =
            results[1];

          if (
            earningsResult.status ===
            'fulfilled'
          ) {

            setEarnings(
              earningsResult
                .value
                .data
                ?.earnings ||
              []
            );

          } else {

            console.error(
              'ERROR EARNINGS:',
              earningsResult.reason
            );
          }

          /* =============================
             TRANSACCIONES
          ============================== */

          const transactionsResult =
            results[2];

          if (
            transactionsResult.status ===
            'fulfilled'
          ) {

            setTransactions(
              transactionsResult
                .value
                .data
                ?.transactions ||
              []
            );

          } else {

            console.error(
              'ERROR TRANSACTIONS:',
              transactionsResult.reason
            );
          }

          /* =============================
             CUENTAS
          ============================== */

          const accountsResult =
            results[3];

          if (
            accountsResult.status ===
            'fulfilled'
          ) {

            const loadedAccounts =
              accountsResult
                .value
                .data
                ?.accounts ||
              [];

            setAccounts(
              loadedAccounts
            );

            const defaultAccount =
              loadedAccounts.find(
                (
                  account:
                    PayoutAccount
                ) =>
                  account.isDefault
              );

            if (
              defaultAccount
            ) {

              setSelectedAccountId(
                String(
                  defaultAccount.id
                )
              );

            } else if (
              loadedAccounts.length >
              0
            ) {

              setSelectedAccountId(
                String(
                  loadedAccounts[0].id
                )
              );
            }

          } else {

            console.error(
              'ERROR ACCOUNTS:',
              accountsResult.reason
            );
          }

          /*
            Si todas fallaron mostramos
            mensaje general.
          */

          const failedCount =
            results.filter(
              (result) =>
                result.status ===
                'rejected'
            ).length;

          if (
            failedCount ===
            results.length
          ) {

            setError(
              'No fue posible cargar la información de tus ganancias.'
            );
          }

        } catch (
          requestError: any
        ) {

          console.error(
            'ERROR CARGANDO GANANCIAS:',
            requestError
          );

          if (
            requestError
              ?.response
              ?.status ===
            401
          ) {

            localStorage.removeItem(
              'token'
            );

            localStorage.removeItem(
              'user'
            );

            navigate(
              '/login'
            );

            return;
          }

          setError(
            'No fue posible cargar tus ganancias.'
          );

        } finally {

          setLoading(
            false
          );
        }
      },
      [navigate]
    );

  /* =====================================
     USE EFFECT
  ===================================== */

  useEffect(
    () => {

      loadData();

    },
    [loadData]
  );

  /* =====================================
     SALDO DISPONIBLE
  ===================================== */

  const availableBalance =
    useMemo(
      () =>
        Number(
          wallet
            .availableBalance ||
          0
        ),
      [
        wallet
          .availableBalance,
      ]
    );

  /* =====================================
     ABRIR MODAL
  ===================================== */

  const openWithdrawModal =
    () => {

      setWithdrawError('');

      setWithdrawAmount('');

      setShowWithdrawModal(
        true
      );
    };

  /* =====================================
     CERRAR MODAL
  ===================================== */

  const closeWithdrawModal =
    () => {

      if (
        withdrawing
      ) {
        return;
      }

      setWithdrawError('');

      setShowWithdrawModal(
        false
      );
    };

  /* =====================================
     RETIRAR
  ===================================== */

  const handleWithdraw =
    async () => {

      const amount =
        Number(
          withdrawAmount
        );

      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {

        setWithdrawError(
          'Ingresa un monto válido.'
        );

        return;
      }

      if (
        amount >
        availableBalance
      ) {

        setWithdrawError(
          'El monto supera tu saldo disponible.'
        );

        return;
      }

      if (
        !selectedAccountId
      ) {

        setWithdrawError(
          'Selecciona una cuenta para recibir el dinero.'
        );

        return;
      }

      const token =
        getToken();

      if (!token) {

        navigate(
          '/login'
        );

        return;
      }

      try {

        setWithdrawing(
          true
        );

        setWithdrawError('');

        await api.post(
          '/wallet/payouts',
          {
            amount,
            payoutAccountId:
              Number(
                selectedAccountId
              ),
          },
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        setShowWithdrawModal(
          false
        );

        setWithdrawAmount('');

        await loadData();

      } catch (
        requestError: any
      ) {

        console.error(
          'ERROR RETIRANDO SALDO:',
          requestError
            ?.response
            ?.data ||
          requestError
        );

        setWithdrawError(
          requestError
            ?.response
            ?.data
            ?.message ||
          'No fue posible realizar el retiro.'
        );

      } finally {

        setWithdrawing(
          false
        );
      }
    };

  /* =====================================
     LOADING
  ===================================== */

  if (
    loading
  ) {

    return (

      <div className="earnings-loading">

        <div className="earnings-loader" />

        <strong>
          Cargando tus ganancias...
        </strong>

      </div>
    );
  }

  /* =====================================
     UI
  ===================================== */

  return (

    <div className="earnings-page">

      {/* =================================
          HEADER
      ================================= */}

      <header className="earnings-header">

        <div className="earnings-header-inner">

          <button
            type="button"
            className="earnings-brand"
            onClick={() =>
              navigate(
                '/specialist'
              )
            }
          >

            <img
              src={logo}
              alt="FASYN"
            />

          </button>

          <button
            type="button"
            className="earnings-back-button"
            onClick={() =>
              navigate(
                '/specialist'
              )
            }
          >
            ← Volver al panel
          </button>

        </div>

      </header>

      {/* =================================
          CONTENIDO
      ================================= */}

      <main className="earnings-main">

        {/* ===============================
            TITULO
        ================================ */}

        <div className="earnings-heading">

          <div className="earnings-heading-content">

            <span className="earnings-eyebrow">
              MIS GANANCIAS
            </span>

            <h1>
              Tu dinero en FASYN
            </h1>

            <p>
              Consulta tus ganancias,
              revisa tus movimientos y
              transfiere tu saldo disponible
              a una de tus cuentas.
            </p>

          </div>

          <button
            type="button"
            className="earnings-refresh"
            onClick={
              loadData
            }
          >
            Actualizar
          </button>

        </div>

        {/* ===============================
            ERROR
        ================================ */}

        {error && (

          <div className="earnings-error">
            {error}
          </div>

        )}

        {/* ===============================
            WALLET
        ================================ */}

        <section className="earnings-wallet-card">

          <div className="earnings-wallet-top">

            <div>

              <span className="wallet-label">
                SALDO DISPONIBLE
              </span>

              <h2 className="wallet-balance">
                {
                  formatMoney(
                    wallet
                      .availableBalance
                  )
                }
              </h2>

              <div className="wallet-currency">
                Pesos mexicanos · MXN
              </div>

            </div>

            <button
              type="button"
              className="wallet-withdraw-button"
              disabled={
                availableBalance <=
                0
              }
              onClick={
                openWithdrawModal
              }
            >
              Retirar dinero
              <span>
                →
              </span>
            </button>

          </div>

          {/* STATS */}

          <div className="wallet-stats">

            <div className="wallet-stat">

              <span>
                DISPONIBLE
              </span>

              <strong>
                {
                  formatMoney(
                    wallet
                      .availableBalance
                  )
                }
              </strong>

            </div>

            <div className="wallet-stat">

              <span>
                PENDIENTE
              </span>

              <strong>
                {
                  formatMoney(
                    wallet
                      .pendingBalance
                  )
                }
              </strong>

            </div>

            <div className="wallet-stat">

              <span>
                TOTAL GANADO
              </span>

              <strong>
                {
                  formatMoney(
                    wallet
                      .totalEarned
                  )
                }
              </strong>

            </div>

          </div>

        </section>

        {/* =================================
            GRID
        ================================= */}

        <div className="earnings-grid">

          {/* ===============================
              POR SERVICIO
          ================================ */}

          <section className="earnings-card">

            <div className="earnings-card-header">

              <div>

                <span className="earnings-eyebrow">
                  SERVICIOS
                </span>

                <h2>
                  Ganancias por servicio
                </h2>

                <p>
                  Consulta cuánto has generado
                  con cada servicio.
                </p>

              </div>

            </div>

            {earnings.length ===
            0 ? (

              <div className="earnings-empty">

                <div className="earnings-empty-icon">
                  $
                </div>

                <strong>
                  Sin ganancias todavía
                </strong>

                <p>
                  Cuando completes trabajos,
                  tus ganancias aparecerán aquí.
                </p>

              </div>

            ) : (

              <div className="service-earnings-list">

                {earnings.map(
                  (
                    earning,
                    index
                  ) => (

                    <div
                      key={
                        earning
                          .serviceId
                      }
                      className="service-earning-item"
                    >

                      <div className="service-earning-info">

                        <div className="service-earning-icon">
                          {
                            String(
                              index +
                              1
                            )
                            .padStart(
                              2,
                              '0'
                            )
                          }
                        </div>

                        <div className="service-earning-content">

                          <strong>
                            {
                              earning
                                .serviceName
                            }
                          </strong>

                          <span>
                            {
                              earning
                                .completedJobs
                            }{' '}
                            {
                              earning
                                .completedJobs ===
                              1
                                ? 'trabajo completado'
                                : 'trabajos completados'
                            }
                          </span>

                        </div>

                      </div>

                      <div className="service-earning-amount">

                        {
                          formatMoney(
                            earning
                              .amount
                          )
                        }

                      </div>

                    </div>

                  )
                )}

              </div>

            )}

          </section>

          {/* ===============================
              MOVIMIENTOS
          ================================ */}

          <section className="earnings-card">

            <div className="earnings-card-header">

              <div>

                <span className="earnings-eyebrow">
                  ACTIVIDAD
                </span>

                <h2>
                  Movimientos
                </h2>

                <p>
                  Últimos movimientos
                  de tu cuenta.
                </p>

              </div>

            </div>

            {transactions.length ===
            0 ? (

              <div className="earnings-empty">

                <div className="earnings-empty-icon">
                  ↕
                </div>

                <strong>
                  Sin movimientos
                </strong>

                <p>
                  Aquí aparecerán tus ingresos
                  y retiros.
                </p>

              </div>

            ) : (

              <div className="earnings-transactions">

                {transactions.map(
                  (
                    transaction
                  ) => {

                    const isPayout =
                      transaction
                        .type ===
                      'PAYOUT';

                    return (

                      <div
                        key={
                          transaction.id
                        }
                        className="earnings-transaction"
                      >

                        <div
                          className={
                            isPayout
                              ? 'transaction-icon withdrawal'
                              : 'transaction-icon'
                          }
                        >
                          {
                            isPayout
                              ? '↓'
                              : '↑'
                          }
                        </div>

                        <div className="transaction-information">

                          <strong>
                            {
                              getTransactionTitle(
                                transaction
                              )
                            }
                          </strong>

                          <span>
                            {
                              transaction
                                .description ||
                              formatDate(
                                transaction
                                  .createdAt
                              )
                            }
                          </span>

                          <div
                            className={
                              `transaction-status ${
                                getStatusClass(
                                  transaction
                                    .status
                                )
                              }`
                            }
                          >
                            {
                              getStatusLabel(
                                transaction
                                  .status
                              )
                            }
                          </div>

                        </div>

                        <div
                          className={
                            isPayout
                              ? 'transaction-amount negative'
                              : 'transaction-amount'
                          }
                        >
                          {
                            isPayout
                              ? '- '
                              : '+ '
                          }

                          {
                            formatMoney(
                              transaction
                                .amount
                            )
                          }

                        </div>

                      </div>

                    );
                  }
                )}

              </div>

            )}

          </section>

        </div>

      </main>

      {/* =================================
          MODAL RETIRO
      ================================= */}

      {showWithdrawModal && (

        <div className="withdraw-overlay">

          <div className="withdraw-modal">

            <div className="withdraw-modal-header">

              <div>

                <span>
                  RETIRAR SALDO
                </span>

                <h2>
                  Transferir dinero
                </h2>

              </div>

              <button
                type="button"
                className="withdraw-close"
                disabled={
                  withdrawing
                }
                onClick={
                  closeWithdrawModal
                }
              >
                ×
              </button>

            </div>

            {/* SALDO */}

            <div className="withdraw-balance">

              <span>
                Saldo disponible
              </span>

              <strong>
                {
                  formatMoney(
                    wallet
                      .availableBalance
                  )
                }
              </strong>

            </div>

            {/* ERROR */}

            {withdrawError && (

              <div
                className="earnings-error"
                style={{
                  marginTop:
                    '15px',

                  marginBottom:
                    0,
                }}
              >
                {withdrawError}
              </div>

            )}

            {/* MONTO */}

            <div className="withdraw-field">

              <label>
                Monto a retirar
              </label>

              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="0.00"
                value={
                  withdrawAmount
                }
                disabled={
                  withdrawing
                }
                onChange={
                  (
                    event
                  ) =>
                    setWithdrawAmount(
                      event
                        .target
                        .value
                    )
                }
              />

            </div>

            {/* CUENTA */}

            <div className="withdraw-field">

              <label>
                Cuenta destino
              </label>

              {accounts.length >
              0 ? (

                <select
                  value={
                    selectedAccountId
                  }
                  disabled={
                    withdrawing
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setSelectedAccountId(
                        event
                          .target
                          .value
                      )
                  }
                >

                  {accounts.map(
                    (
                      account
                    ) => (

                      <option
                        key={
                          account.id
                        }
                        value={
                          account.id
                        }
                      >
                        {
                          account
                            .bankName
                        }{' '}
                        ••••{' '}
                        {
                          account
                            .last4
                        }

                        {
                          account
                            .isDefault
                            ? ' · Principal'
                            : ''
                        }
                      </option>

                    )
                  )}

                </select>

              ) : (

                <div
                  style={{
                    padding:
                      '12px',

                    border:
                      '1px solid #e2e5ec',

                    borderRadius:
                      '10px',

                    color:
                      '#8b919e',

                    fontSize:
                      '9px',

                    lineHeight:
                      1.5,
                  }}
                >
                  No tienes una cuenta
                  registrada para recibir
                  transferencias.
                </div>

              )}

            </div>

            {/* BOTONES */}

            <div className="withdraw-actions">

              <button
                type="button"
                className="withdraw-cancel"
                disabled={
                  withdrawing
                }
                onClick={
                  closeWithdrawModal
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="withdraw-confirm"
                disabled={
                  withdrawing ||
                  !selectedAccountId ||
                  !withdrawAmount
                }
                onClick={
                  handleWithdraw
                }
              >
                {
                  withdrawing
                    ? 'Procesando...'
                    : withdrawAmount
                      ? `Transferir ${formatMoney(
                          withdrawAmount
                        )}`
                      : 'Transferir'
                }
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
};

export default SpecialistEarnings;