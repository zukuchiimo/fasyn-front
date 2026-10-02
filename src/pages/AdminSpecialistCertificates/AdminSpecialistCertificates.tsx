import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

import { api } from '../../api/api';

import './AdminSpecialistCertificates.css';

type CertificateStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED';

interface Certificate {
  id: number;
  courseName: string;
  institution: string;
  certificateUrl: string;
  status: CertificateStatus;
  createdAt: string;

  category: {
    id: number;
    name: string;
  };
}

interface Specialist {
  id: number;
  userId: number;
  name: string;
  email: string;
}

const AdminSpecialistCertificates =
  () => {
    const navigate =
      useNavigate();

    const {
      specialistId,
    } = useParams();

    const token =
      localStorage.getItem(
        'token'
      );

    const [
      specialist,
      setSpecialist,
    ] =
      useState<
        Specialist | null
      >(null);

    const [
      certificates,
      setCertificates,
    ] =
      useState<
        Certificate[]
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

    const [
      processingId,
      setProcessingId,
    ] =
      useState<
        number | null
      >(null);

    const [
      actionMessage,
      setActionMessage,
    ] =
      useState('');

    const numericSpecialistId =
      useMemo(
        () =>
          Number(
            specialistId
          ),
        [
          specialistId,
        ]
      );

    const loadCertificates =
      useCallback(
        async () => {
          try {
            if (!token) {
              navigate(
                '/login'
              );

              return;
            }

            if (
              !Number.isInteger(
                numericSpecialistId
              ) ||
              numericSpecialistId <=
                0
            ) {
              setError(
                'Especialista inválido.'
              );

              return;
            }

            setLoading(
              true
            );

            setError('');

            const response =
              await api.get(
                `/admin/specialists/${numericSpecialistId}/certificates`,
                {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },
                }
              );

            setSpecialist(
              response.data
                ?.specialist ||
                null
            );

            setCertificates(
              response.data
                ?.certificates ||
                []
            );
          } catch (
            err: any
          ) {
            console.error(
              'ADMIN CERTIFICATES ERROR:',
              err?.response
                ?.data || err
            );

            setError(
              err?.response
                ?.data
                ?.message ||
                'No fue posible consultar las constancias.'
            );
          } finally {
            setLoading(
              false
            );
          }
        },
        [
          navigate,
          numericSpecialistId,
          token,
        ]
      );

    useEffect(() => {
      loadCertificates();
    }, [
      loadCertificates,
    ]);

    const updateStatus =
      async (
        certificateId: number,
        action:
          | 'approve'
          | 'reject'
      ) => {
        try {
          if (!token) {
            navigate(
              '/login'
            );

            return;
          }

          setProcessingId(
            certificateId
          );

          setError('');
          setActionMessage(
            ''
          );

          const response =
            await api.patch(
              `/admin/certificates/${certificateId}/${action}`,
              {},
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          setActionMessage(
            response.data
              ?.message ||
              'Constancia actualizada.'
          );

          await loadCertificates();
        } catch (
          err: any
        ) {
          console.error(
            'UPDATE CERTIFICATE ERROR:',
            err?.response
              ?.data || err
          );

          setError(
            err?.response
              ?.data
              ?.message ||
              'No fue posible actualizar la constancia.'
          );
        } finally {
          setProcessingId(
            null
          );
        }
      };

    const handleDelete =
      async (
        certificate:
          Certificate
      ) => {
        const confirmed =
          window.confirm(
            `¿Seguro que deseas eliminar la constancia "${certificate.courseName}"?`
          );

        if (!confirmed) {
          return;
        }

        try {
          if (!token) {
            navigate(
              '/login'
            );

            return;
          }

          setProcessingId(
            certificate.id
          );

          setError('');
          setActionMessage(
            ''
          );

          const response =
            await api.delete(
              `/admin/certificates/${certificate.id}`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          setActionMessage(
            response.data
              ?.message ||
              'Constancia eliminada.'
          );

          await loadCertificates();
        } catch (
          err: any
        ) {
          console.error(
            'DELETE CERTIFICATE ERROR:',
            err?.response
              ?.data || err
          );

          setError(
            err?.response
              ?.data
              ?.message ||
              'No fue posible eliminar la constancia.'
          );
        } finally {
          setProcessingId(
            null
          );
        }
      };

    const statusLabel = (
      status:
        CertificateStatus
    ) => {
      switch (
        status
      ) {
        case 'APPROVED':
          return 'Aprobada';

        case 'REJECTED':
          return 'Rechazada';

        default:
          return 'Pendiente';
      }
    };

    const getDocumentUrl =
      (
        certificateUrl:
          string
      ) => {
        if (
          certificateUrl.startsWith(
            'http'
          )
        ) {
          return certificateUrl;
        }

        /*
          Si tu API corre en localhost:3000
          y certificateUrl viene como:
          /uploads/certificates/archivo.pdf
        */

        return `http://localhost:3000${certificateUrl}`;
      };

    return (
      <div className="admin-certificates-page">

        <div className="admin-certificates-top">
          <button
            type="button"
            className="back-button"
            onClick={() =>
              navigate(
                '/admin/specialists'
              )
            }
          >
            ← Volver a especialistas
          </button>

          <div>
            <span className="section-label">
              ESPECIALISTAS
            </span>

            <h1>
              Constancias
            </h1>

            {specialist && (
              <p>
                Revisa las
                constancias de{' '}
                <strong>
                  {
                    specialist.name
                  }
                </strong>
                .
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="admin-certificates-error">
            {error}
          </div>
        )}

        {actionMessage && (
          <div className="admin-certificates-success">
            {
              actionMessage
            }
          </div>
        )}

        {loading ? (
          <div className="admin-certificates-empty">
            Cargando
            constancias...
          </div>
        ) : certificates.length ===
          0 ? (
          <div className="admin-certificates-empty">
            <h3>
              Sin constancias
            </h3>

            <p>
              Este especialista
              todavía no ha
              enviado
              constancias.
            </p>
          </div>
        ) : (
          <div className="admin-certificates-list">
            {certificates.map(
              (
                certificate
              ) => {
                const processing =
                  processingId ===
                  certificate.id;

                return (
                  <article
                    key={
                      certificate.id
                    }
                    className="admin-certificate-card"
                  >
                    <div className="certificate-card-header">
                      <div>
                        <span className="certificate-category">
                          {
                            certificate
                              .category
                              .name
                          }
                        </span>

                        <h3>
                          {
                            certificate.courseName
                          }
                        </h3>

                        <p>
                          Emitida
                          por{' '}
                          <strong>
                            {
                              certificate.institution
                            }
                          </strong>
                        </p>
                      </div>

                      <span
                        className={`certificate-status ${certificate.status.toLowerCase()}`}
                      >
                        {statusLabel(
                          certificate.status
                        )}
                      </span>
                    </div>

                    <div className="certificate-meta">
                      <span>
                        Subida:{' '}
                        {new Date(
                          certificate.createdAt
                        ).toLocaleDateString(
                          'es-MX'
                        )}
                      </span>
                    </div>

                    <div className="certificate-actions">

                      <a
                        href={getDocumentUrl(
                          certificate.certificateUrl
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="certificate-document-button"
                      >
                        Ver documento
                      </a>xq

                      {certificate.status !==
                        'APPROVED' && (
                        <button
                          type="button"
                          className="approve-button"
                          disabled={
                            processing
                          }
                          onClick={() =>
                            updateStatus(
                              certificate.id,
                              'approve'
                            )
                          }
                        >
                          {processing
                            ? 'Procesando...'
                            : 'Aprobar'}
                        </button>
                      )}

                      {certificate.status !==
                        'REJECTED' && (
                        <button
                          type="button"
                          className="reject-button"
                          disabled={
                            processing
                          }
                          onClick={() =>
                            updateStatus(
                              certificate.id,
                              'reject'
                            )
                          }
                        >
                          Rechazar
                        </button>
                      )}

                      <button
                        type="button"
                        className="delete-button"
                        disabled={
                          processing
                        }
                        onClick={() =>
                          handleDelete(
                            certificate
                          )
                        }
                      >
                        Eliminar
                      </button>

                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </div>
    );
  };

export default AdminSpecialistCertificates;