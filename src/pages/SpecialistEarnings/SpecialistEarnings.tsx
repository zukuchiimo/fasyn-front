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

type PayoutDestinationType =
  | 'MERCADO_PAGO'
  | 'BANK_ACCOUNT';

type PayoutAccount = {
  id: number;
  type: PayoutDestinationType;

  bankName?: string | null;
  accountHolderName?: string | null;
  clabe?: string | null;
  last4?: string | null;

  isDefault?: boolean;
  active?: boolean;
};

const emptyWallet: Wallet = {
  availableBalance: 0,
  pendingBalance: 0,
  totalEarned: 0,
};

const SpecialistEarnings = () => {
  const navigate = useNavigate();

  const [wallet, setWallet] =
    useState<Wallet>(emptyWallet);

  const [earnings, setEarnings] =
    useState<ServiceEarning[]>([]);

  const [transactions, setTransactions] =
    useState<WalletTransaction[]>([]);

  const [accounts, setAccounts] =
    useState<PayoutAccount[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  /*
    RETIRO
  */

  const [
    showWithdrawModal,
    setShowWithdrawModal,
  ] = useState(false);

  const [
    withdrawAmount,
    setWithdrawAmount,
  ] = useState('');

  const [
    selectedAccountId,
    setSelectedAccountId,
  ] = useState('');

  const [
    withdrawing,
    setWithdrawing,
  ] = useState(false);

  const [
    withdrawError,
    setWithdrawError,
  ] = useState('');

  /*
    AGREGAR CUENTA
  */

  const [
    showAccountModal,
    setShowAccountModal,
  ] = useState(false);

  const [
    accountType,
    setAccountType,
  ] =
    useState<PayoutDestinationType>(
      'MERCADO_PAGO'
    );

  const [
    bankName,
    setBankName,
  ] = useState('');

  const [
    accountHolderName,
    setAccountHolderName,
  ] = useState('');

  const [
    clabe,
    setClabe,
  ] = useState('');

  const [
    makeDefault,
    setMakeDefault,
  ] = useState(true);

  const [
    savingAccount,
    setSavingAccount,
  ] = useState(false);

  const [
    accountError,
    setAccountError,
  ] = useState('');

  const getToken = () => {
    return (
      localStorage.getItem(
        'token'
      ) || ''
    );
  };

  const formatMoney = (
    value:
      | number
      | string
      | null
      | undefined
  ) => {
    const numberValue =
      Number(value || 0);

    return numberValue
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
      );
  };

  const formatDate = (
    value?:
      | string
      | null
  ) => {
    if (!value) {
      return '';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return new Intl
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
      .format(date);
  };

  const getStatusLabel = (
    status:
      TransactionStatus
  ) => {
    switch (status) {
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

  const getStatusClass = (
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

  const getTransactionTitle = (
    transaction:
      WalletTransaction
  ) => {
    switch (
      transaction.type
    ) {
      case 'SERVICE_EARNING':
        return transaction
          .requestId
          ? `Servicio #${transaction.requestId}`
          : 'Ganancia por servicio';

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

  const getAccountLabel = (
    account:
      PayoutAccount
  ) => {
    const institution =
      account.type ===
      'MERCADO_PAGO'
        ? 'Mercado Pago'
        : account.bankName ||
          'Cuenta bancaria';

    return [
      institution,

      account.last4
        ? `CLABE •••• ${account.last4}`
        : '',

      account.accountHolderName ||
        '',

      account.isDefault
        ? 'Principal'
        : '',
    ]
      .filter(Boolean)
      .join(' · ');
  };

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
          setLoading(true);
          setError('');

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
              transactionsResult
                .reason
            );
          }

          const accountsResult =
            results[3];

          if (
            accountsResult.status ===
            'fulfilled'
          ) {
            const loadedAccounts:
              PayoutAccount[] =
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
                  account
                ) =>
                  account
                    .isDefault
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
              loadedAccounts
                .length >
              0
            ) {
              setSelectedAccountId(
                String(
                  loadedAccounts[0]
                    .id
                )
              );
            } else {
              setSelectedAccountId(
                ''
              );
            }
          } else {
            console.error(
              'ERROR ACCOUNTS:',
              accountsResult.reason
            );
          }

          const failedCount =
            results.filter(
              (
                result
              ) =>
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
          requestError:
            any
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
            localStorage
              .removeItem(
                'token'
              );

            localStorage
              .removeItem(
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

  useEffect(
    () => {
      loadData();
    },
    [loadData]
  );

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

  /*
    CUENTA DE PAGO
  */

  const openAccountModal =
    () => {
      setAccountError(
        ''
      );

      setAccountType(
        'MERCADO_PAGO'
      );

      setBankName('');

      setAccountHolderName(
        ''
      );

      setClabe('');

      setMakeDefault(
        accounts.length ===
          0
      );

      setShowAccountModal(
        true
      );
    };

  const closeAccountModal =
    () => {
      if (
        savingAccount
      ) {
        return;
      }

      setAccountError(
        ''
      );

      setShowAccountModal(
        false
      );
    };

  const handleSaveAccount =
    async () => {
      const token =
        getToken();

      if (!token) {
        navigate(
          '/login'
        );

        return;
      }

      if (
        accountType ===
          'BANK_ACCOUNT' &&
        !bankName.trim()
      ) {
        setAccountError(
          'Ingresa la institución bancaria.'
        );

        return;
      }

      if (
        !accountHolderName
          .trim()
      ) {
        setAccountError(
          'Ingresa el nombre del titular.'
        );

        return;
      }

      const normalizedClabe =
        clabe
          .replace(
            /\D/g,
            ''
          )
          .trim();

      if (
        !/^\d{18}$/.test(
          normalizedClabe
        )
      ) {
        setAccountError(
          'Ingresa una CLABE válida de 18 dígitos.'
        );

        return;
      }

      try {
        setSavingAccount(
          true
        );

        setAccountError(
          ''
        );

        const payload = {
          type:
            accountType,

          bankName:
            accountType ===
            'MERCADO_PAGO'
              ? 'Mercado Pago'
              : bankName
                  .trim(),

          accountHolderName:
            accountHolderName
              .trim(),

          clabe:
            normalizedClabe,

          last4:
            normalizedClabe
              .slice(-4),

          isDefault:
            makeDefault,
        };

        await api.post(
          '/wallet/accounts',
          payload,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        setShowAccountModal(
          false
        );

        await loadData();

      } catch (
        requestError:
          any
      ) {
        console.error(
          'ERROR GUARDANDO CUENTA:',
          requestError
            ?.response
            ?.data ||
          requestError
        );

        setAccountError(
          requestError
            ?.response
            ?.data
            ?.message ||
          'No fue posible guardar la cuenta.'
        );

      } finally {
        setSavingAccount(
          false
        );
      }
    };

  /*
    RETIRO
  */

  const openWithdrawModal =
    () => {
      setWithdrawError(
        ''
      );

      setWithdrawAmount(
        ''
      );

      if (
        accounts.length ===
        0
      ) {
        openAccountModal();
        return;
      }

      setShowWithdrawModal(
        true
      );
    };

  const closeWithdrawModal =
    () => {
      if (
        withdrawing
      ) {
        return;
      }

      setWithdrawError(
        ''
      );

      setShowWithdrawModal(
        false
      );
    };

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

        setWithdrawError(
          ''
        );

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

        setWithdrawAmount(
          ''
        );

        await loadData();
      } catch (
        requestError:
          any
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

  if (loading) {
    return (
      <div className="earnings-loading">
        <div className="earnings-loader" />

        <strong>
          Cargando tus ganancias...
        </strong>
      </div>
    );
  }

  return (
    <div className="earnings-page">

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

      <main className="earnings-main">

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
              a Mercado Pago o a una cuenta bancaria.
            </p>

          </div>

          <div
            style={{
              display:
                'flex',
              gap:
                '10px',
              flexWrap:
                'wrap',
            }}
          >
            <button
              type="button"
              className="earnings-refresh"
              onClick={
                openAccountModal
              }
            >
              + Agregar cuenta
            </button>

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

        </div>

        {error && (
          <div className="earnings-error">
            {error}
          </div>
        )}

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

        <section
          className="earnings-card"
          style={{
            marginBottom:
              '20px',
          }}
        >
          <div className="earnings-card-header">
            <div>
              <span className="earnings-eyebrow">
                CUENTAS DE PAGO
              </span>

              <h2>
                Dónde recibes tu dinero
              </h2>

              <p>
                Registra Mercado Pago o una cuenta bancaria
                para recibir tus retiros.
              </p>
            </div>

            <button
              type="button"
              className="earnings-refresh"
              onClick={
                openAccountModal
              }
            >
              Agregar cuenta
            </button>
          </div>

          {accounts.length ===
          0 ? (
            <div className="earnings-empty">
              <div className="earnings-empty-icon">
                $
              </div>

              <strong>
                Sin cuenta registrada
              </strong>

              <p>
                Agrega la CLABE de Mercado Pago
                o de una cuenta bancaria.
              </p>

              <button
                type="button"
                className="wallet-withdraw-button"
                onClick={
                  openAccountModal
                }
                style={{
                  marginTop:
                    '12px',
                }}
              >
                Agregar cuenta
              </button>
            </div>
          ) : (
            <div className="service-earnings-list">
              {accounts.map(
                (
                  account
                ) => (
                  <div
                    key={
                      account.id
                    }
                    className="service-earning-item"
                  >
                    <div className="service-earning-info">

                      <div className="service-earning-icon">
                        {
                          account.type ===
                          'MERCADO_PAGO'
                            ? 'MP'
                            : 'B'
                        }
                      </div>

                      <div className="service-earning-content">
                        <strong>
                          {
                            account.type ===
                            'MERCADO_PAGO'
                              ? 'Mercado Pago'
                              : account.bankName ||
                                'Cuenta bancaria'
                          }
                        </strong>

                        <span>
                          {
                            getAccountLabel(
                              account
                            )
                          }
                        </span>
                      </div>

                    </div>

                    <div className="service-earning-amount">
                      {
                        account.isDefault
                          ? 'Principal'
                          : 'Activa'
                      }
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        <div className="earnings-grid">

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

      {/* MODAL RETIRO */}
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

            <div className="withdraw-field">
              <label>
                Cuenta destino
              </label>

              {accounts.length >
              0 ? (
                <>
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
                            getAccountLabel(
                              account
                            )
                          }
                        </option>
                      )
                    )}
                  </select>

                  <button
                    type="button"
                    className="earnings-refresh"
                    disabled={
                      withdrawing
                    }
                    onClick={() => {
                      setShowWithdrawModal(
                        false
                      );

                      openAccountModal();
                    }}
                    style={{
                      marginTop:
                        '10px',
                    }}
                  >
                    + Agregar otra cuenta
                  </button>
                </>
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
                      '12px',

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

      {/* MODAL AGREGAR CUENTA */}
      {showAccountModal && (
        <div className="withdraw-overlay">

          <div className="withdraw-modal">

            <div className="withdraw-modal-header">

              <div>
                <span>
                  CUENTA DE PAGO
                </span>

                <h2>
                  Agregar cuenta
                </h2>
              </div>

              <button
                type="button"
                className="withdraw-close"
                disabled={
                  savingAccount
                }
                onClick={
                  closeAccountModal
                }
              >
                ×
              </button>

            </div>

            <p
              style={{
                margin:
                  '8px 0 18px',
                color:
                  '#747b8a',
                lineHeight:
                  1.5,
              }}
            >
              Elige la institución y registra
              la CLABE donde quieres recibir tus transferencias.
            </p>

            {accountError && (
              <div
                className="earnings-error"
                style={{
                  marginBottom:
                    '15px',
                }}
              >
                {accountError}
              </div>
            )}

            <div
              style={{
                display:
                  'grid',
                gridTemplateColumns:
                  '1fr 1fr',
                gap:
                  '10px',
                marginBottom:
                  '18px',
              }}
            >
              <button
                type="button"
                disabled={
                  savingAccount
                }
                onClick={() =>
                  setAccountType(
                    'MERCADO_PAGO'
                  )
                }
                style={{
                  border:
                    accountType ===
                    'MERCADO_PAGO'
                      ? '2px solid #5c7cff'
                      : '1px solid #e2e5ec',
                  background:
                    accountType ===
                    'MERCADO_PAGO'
                      ? '#f3f6ff'
                      : '#fff',
                  borderRadius:
                    '12px',
                  padding:
                    '14px',
                  fontWeight:
                    700,
                  cursor:
                    'pointer',
                }}
              >
                Mercado Pago
              </button>

              <button
                type="button"
                disabled={
                  savingAccount
                }
                onClick={() =>
                  setAccountType(
                    'BANK_ACCOUNT'
                  )
                }
                style={{
                  border:
                    accountType ===
                    'BANK_ACCOUNT'
                      ? '2px solid #5c7cff'
                      : '1px solid #e2e5ec',
                  background:
                    accountType ===
                    'BANK_ACCOUNT'
                      ? '#f3f6ff'
                      : '#fff',
                  borderRadius:
                    '12px',
                  padding:
                    '14px',
                  fontWeight:
                    700,
                  cursor:
                    'pointer',
                }}
              >
                Cuenta bancaria
              </button>
            </div>

            {accountType ===
            'BANK_ACCOUNT' && (
              <div className="withdraw-field">
                <label>
                  Institución bancaria
                </label>

                <input
                  type="text"
                  placeholder="BBVA, Banorte, Santander..."
                  value={
                    bankName
                  }
                  disabled={
                    savingAccount
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setBankName(
                        event
                          .target
                          .value
                      )
                  }
                />
              </div>
            )}

            <div className="withdraw-field">
              <label>
                Nombre del titular
              </label>

              <input
                type="text"
                placeholder="Nombre completo del titular"
                value={
                  accountHolderName
                }
                disabled={
                  savingAccount
                }
                onChange={
                  (
                    event
                  ) =>
                    setAccountHolderName(
                      event
                        .target
                        .value
                    )
                }
              />
            </div>

            <div className="withdraw-field">
              <label>
                CLABE interbancaria
              </label>

              <input
                type="text"
                inputMode="numeric"
                maxLength={18}
                placeholder="18 dígitos"
                value={
                  clabe
                }
                disabled={
                  savingAccount
                }
                onChange={
                  (
                    event
                  ) =>
                    setClabe(
                      event
                        .target
                        .value
                        .replace(
                          /\D/g,
                          ''
                        )
                        .slice(
                          0,
                          18
                        )
                    )
                }
              />

              <small
                style={{
                  display:
                    'block',
                  marginTop:
                    '6px',
                  color:
                    '#8b919e',
                  lineHeight:
                    1.4,
                }}
              >
                {
                  accountType ===
                  'MERCADO_PAGO'
                    ? 'Captura la CLABE de 18 dígitos de tu cuenta Mercado Pago.'
                    : 'Captura la CLABE de 18 dígitos de la cuenta donde quieres recibir tus pagos.'
                }
              </small>
            </div>

            <label
              style={{
                display:
                  'flex',
                alignItems:
                  'center',
                gap:
                  '8px',
                margin:
                  '14px 0',
                fontSize:
                  '13px',
                cursor:
                  'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={
                  makeDefault
                }
                disabled={
                  savingAccount
                }
                onChange={
                  (
                    event
                  ) =>
                    setMakeDefault(
                      event
                        .target
                        .checked
                    )
                }
              />

              Usar como cuenta principal
            </label>

            <div className="withdraw-actions">

              <button
                type="button"
                className="withdraw-cancel"
                disabled={
                  savingAccount
                }
                onClick={
                  closeAccountModal
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="withdraw-confirm"
                disabled={
                  savingAccount
                }
                onClick={
                  handleSaveAccount
                }
              >
                {
                  savingAccount
                    ? 'Guardando...'
                    : 'Guardar cuenta'
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
