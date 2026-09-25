import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import { api } from '../../api/api';
import logo from '../../assets/logo.png';

import '../AdminDashboard/AdminDashboard.css';
import './AdminPayouts.css';

type EarningStatus =
  | 'PENDING'
  | 'AVAILABLE'
  | 'PROCESSING'
  | 'PAID'
  | 'CANCELLED';

interface Earning {
  id: number;

  grossAmount:
    | string
    | number;

  platformFee:
    | string
    | number;

  specialistAmount:
    | string
    | number;

  status:
    EarningStatus;

  availableAt?:
    | string
    | null;

  paidAt?:
    | string
    | null;

  specialist: {
    user: {
      id: number;
      name: string;
      email: string;
    };
  };

  request: {
    id: number;
    status: string;

    client: {
      id: number;
      name: string;
      email: string;
    };

    service: {
      id: number;
      name: string;

      category: {
        id: number;
        name: string;
      };
    };
  };

  payment: {
    id: number;
    amount:
      | string
      | number;

    currency: string;
    status: string;
  };

  payout?:
    | {
        id: number;
        status: string;
        amount:
          | string
          | number;
      }
    | null;
}

interface Stats {
  pendingCount: number;
  pendingAmount: number;

  availableCount: number;
  availableAmount: number;

  processingCount: number;
  processingAmount: number;

  paidCount: number;
  paidAmount: number;
}

const EMPTY_STATS:
  Stats = {
    pendingCount: 0,
    pendingAmount: 0,

    availableCount: 0,
    availableAmount: 0,

    processingCount: 0,
    processingAmount: 0,

    paidCount: 0,
    paidAmount: 0,
  };

const AdminPayouts = () => {

  const navigate =
    useNavigate();

  const token =
    localStorage.getItem(
      'token'
    );

  const userRaw =
    localStorage.getItem(
      'user'
    );

  const currentUser =
    useMemo(() => {
      try {
        return userRaw
          ? JSON.parse(
              userRaw
            )
          : null;
      } catch {
        return null;
      }
    }, [userRaw]);

  const [
    earnings,
    setEarnings,
  ] = useState<
    Earning[]
  >([]);

  const [
    stats,
    setStats,
  ] = useState<Stats>(
    EMPTY_STATS
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  const loadPayouts =
    useCallback(
      async () => {

        try {

          if (!token) {
            navigate(
              '/login'
            );

            return;
          }

          setLoading(
            true
          );

          setError(
            ''
          );

          const response =
            await api.get(
              '/admin/payouts',
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          console.log(
            'ADMIN PAYOUTS:',
            response.data
          );

          setEarnings(
            response.data
              ?.earnings ||
              []
          );

          setStats({
            ...EMPTY_STATS,

            ...(
              response.data
                ?.stats ||
              {}
            ),
          });

        } catch (
          err: any
        ) {

          console.error(
            'ADMIN PAYOUTS ERROR:',
            err?.response
              ?.data ||
              err
          );

          setError(
            err?.response
              ?.data
              ?.message ||
              'No fue posible consultar los pagos.'
          );

        } finally {

          setLoading(
            false
          );

        }
      },
      [
        navigate,
        token,
      ]
    );

  useEffect(() => {

    loadPayouts();

  }, [
    loadPayouts,
  ]);

  const money = (
    value:
      | string
      | number
  ) => {

    return Number(
      value || 0
    ).toLocaleString(
      'es-MX',
      {
        style:
          'currency',

        currency:
          'MXN',
      }
    );

  };

  const statusLabel = (
    status:
      EarningStatus
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

      case 'PAID':
        return 'Pagado';

      case 'CANCELLED':
        return 'Cancelado';

      default:
        return status;
    }

  };

  const handleLogout =
    () => {

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

    };

  return (

    <div className="admin-page">

      <aside className="admin-sidebar">

        <div>

          <div className="admin-brand">

            <img
              src={logo}
              alt="FASYN"
            />

            <span>
              ADMIN
            </span>

          </div>

          <nav className="admin-menu">

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/admin'
                )
              }
            >
              <span>⌂</span>
              Resumen
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/admin'
                )
              }
            >
              <span>▤</span>
              Solicitudes
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/admin/specialists'
                )
              }
            >
              <span>♙</span>
              Especialistas
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/admin/clients'
                )
              }
            >
              <span>♧</span>
              Clientes
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/admin/categories'
                )
              }
            >
              <span>◇</span>
              Categorías
            </button>

            <button
              type="button"
              className="active"
              onClick={() =>
                navigate(
                  '/admin/payouts'
                )
              }
            >
              <span>$</span>
              Pagos
            </button>

          </nav>

        </div>

        <div className="admin-sidebar-bottom">

          <button
            type="button"
            onClick={
              handleLogout
            }
          >
            Cerrar sesión
          </button>

        </div>

      </aside>

      <main className="admin-content">

        <header className="admin-header">

          <div>

            <span>
              FINANZAS
            </span>

            <h1>
              Pagos
            </h1>

            <p>
              Administra las ganancias
              y transferencias a especialistas.
            </p>

          </div>

          <div className="admin-user">

            <div className="admin-user-avatar">

              {
                currentUser
                  ?.name
                  ?.charAt(0)
                  ?.toUpperCase() ||
                'A'
              }

            </div>

            <div>

              <strong>
                {
                  currentUser
                    ?.name ||
                  'Administrador'
                }
              </strong>

              <span>
                Administrador
              </span>

            </div>

          </div>

        </header>

        <section className="payout-stats">

          <article>

            <span>
              PENDIENTE
            </span>

            <strong>
              {
                money(
                  stats
                    .pendingAmount
                )
              }
            </strong>

            <small>
              {
                stats
                  .pendingCount
              } servicio(s)
            </small>

          </article>

          <article>

            <span>
              DISPONIBLE
            </span>

            <strong>
              {
                money(
                  stats
                    .availableAmount
                )
              }
            </strong>

            <small>
              {
                stats
                  .availableCount
              } por transferir
            </small>

          </article>

          <article>

            <span>
              PROCESANDO
            </span>

            <strong>
              {
                money(
                  stats
                    .processingAmount
                )
              }
            </strong>

            <small>
              {
                stats
                  .processingCount
              } transferencia(s)
            </small>

          </article>

          <article>

            <span>
              PAGADO
            </span>

            <strong>
              {
                money(
                  stats
                    .paidAmount
                )
              }
            </strong>

            <small>
              {
                stats
                  .paidCount
              } completado(s)
            </small>

          </article>

        </section>

        <section className="payout-panel">

          <div className="payout-panel-header">

            <div>

              <span>
                GANANCIAS
              </span>

              <h2>
                Pagos a especialistas
              </h2>

            </div>

            <button
              type="button"
              onClick={
                loadPayouts
              }
            >
              Actualizar
            </button>

          </div>

          {error && (

            <div className="payout-error">
              {error}
            </div>

          )}

          {loading ? (

            <div className="payout-empty">
              Cargando pagos...
            </div>

          ) : earnings.length ===
            0 ? (

            <div className="payout-empty">

              <h3>
                Sin movimientos
              </h3>

              <p>
                Todavía no existen
                ganancias registradas.
              </p>

            </div>

          ) : (

            <div className="payout-list">

              {
                earnings.map(
                  (
                    earning
                  ) => (

                    <article
                      key={
                        earning.id
                      }
                      className="payout-card"
                    >

                      <div className="payout-title">

                        <div>

                          <span>
                            SOLICITUD #
                            {
                              earning
                                .request
                                .id
                            }
                          </span>

                          <h3>
                            {
                              earning
                                .request
                                .service
                                .name
                            }
                          </h3>

                        </div>

                        <strong
                          className={`earning-status ${earning.status.toLowerCase()}`}
                        >
                          {
                            statusLabel(
                              earning
                                .status
                            )
                          }
                        </strong>

                      </div>

                      <div className="payout-data">

                        <div>

                          <span>
                            CLIENTE
                          </span>

                          <strong>
                            {
                              earning
                                .request
                                .client
                                .name
                            }
                          </strong>

                        </div>

                        <div>

                          <span>
                            ESPECIALISTA
                          </span>

                          <strong>
                            {
                              earning
                                .specialist
                                .user
                                .name
                            }
                          </strong>

                        </div>

                        <div>

                          <span>
                            CLIENTE PAGÓ
                          </span>

                          <strong>
                            {
                              money(
                                earning
                                  .grossAmount
                              )
                            }
                          </strong>

                        </div>

                        <div>

                          <span>
                            COMISIÓN FASYN
                          </span>

                          <strong>
                            {
                              money(
                                earning
                                  .platformFee
                              )
                            }
                          </strong>

                        </div>

                        <div>

                          <span>
                            ESPECIALISTA RECIBE
                          </span>

                          <strong className="specialist-money">
                            {
                              money(
                                earning
                                  .specialistAmount
                              )
                            }
                          </strong>

                        </div>

                      </div>

                      {
                        earning.status ===
                          'AVAILABLE' && (

                          <div className="payout-actions">

                            <button
                              type="button"
                              disabled
                            >
                              Transferir {
                                money(
                                  earning
                                    .specialistAmount
                                )
                              }
                            </button>

                            <small>
                              Falta conectar la
                              transferencia real
                              con Mercado Pago.
                            </small>

                          </div>

                        )
                      }

                    </article>

                  )
                )
              }

            </div>

          )}

        </section>

      </main>

    </div>
  );
};

export default AdminPayouts;