import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { api } from '../../api/api';
import './SpecialistCertificates.css';

type CertificateStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

type Certificate = {
  id: number;
  categoryId: number;
  courseName: string;
  institution: string;
  certificateUrl: string;
  status: CertificateStatus;
  createdAt: string;
  updatedAt: string;
};

type Specialty = {
  id: number;
  name: string;
  certificate: Certificate | null;
};

const STATUS_TEXT: Record<CertificateStatus, string> = {
  PENDING: 'En revisión',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
};

const SpecialistCertificates = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const requestedCategoryId = searchParams.get('categoryId') || '';
  const requestedCategoryName = searchParams.get('categoryName') || '';

  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    requestedCategoryId
  );

  const [courseName, setCourseName] = useState('');
  const [institution, setInstitution] = useState(
    'Fundación Carlos Slim / Capacítate para el empleo'
  );
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const token = localStorage.getItem('token');

  const selectedSpecialty = useMemo(
    () =>
      specialties.find(
        (item) => String(item.id) === String(selectedCategoryId)
      ) || null,
    [specialties, selectedCategoryId]
  );

  const loadCertificates = async () => {
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      setError('');

      /*
        1) Cargamos PRIMERO el catálogo de especialidades.
        Esto es independiente del endpoint de constancias.
        Aunque /specialists/certificates falle, las categorías
        deben seguir apareciendo.
      */
      const categoriesResponse = await api.get('/categories');

      const categories: Array<{
        id: number;
        name: string;
      }> = Array.isArray(categoriesResponse.data)
        ? categoriesResponse.data
        : categoriesResponse.data?.categories || [];

      const baseSpecialties: Specialty[] = categories
        .map((category) => ({
          id: Number(category.id),
          name: String(category.name),
          certificate: null,
        }))
        .sort((a, b) =>
          a.name.localeCompare(b.name, 'es')
        );

      setSpecialties(baseSpecialties);

      setSelectedCategoryId((current) => {
        if (
          current &&
          baseSpecialties.some(
            (item) =>
              String(item.id) === String(current)
          )
        ) {
          return current;
        }

        return baseSpecialties.length > 0
          ? String(baseSpecialties[0].id)
          : '';
      });

      /*
        2) Después intentamos obtener las constancias.
        Si este endpoint falla, NO borramos las categorías.
      */
      try {
        const certificatesResponse = await api.get(
          '/specialists/certificates',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const certificateSpecialties: Specialty[] =
          certificatesResponse.data?.specialties || [];

        const certificateByCategory = new Map<
          number,
          Certificate | null
        >();

        certificateSpecialties.forEach((item) => {
          certificateByCategory.set(
            Number(item.id),
            item.certificate || null
          );
        });

        setSpecialties(
          baseSpecialties.map((specialty) => ({
            ...specialty,
            certificate:
              certificateByCategory.get(
                Number(specialty.id)
              ) || null,
          }))
        );
      } catch (certificateError: any) {
        console.warn(
          'NO SE PUDIERON CARGAR LAS CONSTANCIAS, PERO LAS CATEGORÍAS SÍ:',
          certificateError.response?.data ||
            certificateError
        );
      }
    } catch (requestError: any) {
      console.error(
        'ERROR CARGANDO ESPECIALIDADES:',
        requestError.response?.data || requestError
      );

      setError(
        requestError.response?.data?.message ||
          'No fue posible cargar las especialidades.'
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void loadCertificates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetUploadForm = () => {
    setCourseName('');
    setFile(null);

    const input = document.getElementById(
      'certificate-file'
    ) as HTMLInputElement | null;

    if (input) {
      input.value = '';
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!token) {
      navigate('/login');
      return;
    }

    if (!selectedCategoryId) {
      setError('Selecciona una especialidad.');
      return;
    }

    if (!courseName.trim()) {
      setError('Escribe el nombre del curso o constancia.');
      return;
    }

    if (!institution.trim()) {
      setError('Escribe la institución que emitió la constancia.');
      return;
    }

    if (!file) {
      setError('Selecciona el archivo de tu constancia.');
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('El archivo debe ser PDF, JPG, PNG o WEBP.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('El archivo no puede superar 8 MB.');
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append('categoryId', selectedCategoryId);
      formData.append('courseName', courseName.trim());
      formData.append('institution', institution.trim());
      formData.append('certificate', file);

      await api.post('/specialists/certificates', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setSuccess(
        'Constancia enviada correctamente. Ahora está pendiente de revisión.'
      );

      resetUploadForm();
      await loadCertificates();
    } catch (requestError: any) {
      console.error(
        'ERROR SUBIENDO CONSTANCIA:',
        requestError.response?.data || requestError
      );

      setError(
        requestError.response?.data?.message ||
          'No fue posible subir la constancia.'
      );
    } finally {
      setSaving(false);
    }
  };

const getDocumentUrl = (certificateUrl: string) => {
  const apiBase =
    String(api.defaults.baseURL || '')
      .replace(/\/api\/?$/, '');

  return certificateUrl.startsWith('http')
    ? certificateUrl
    : `${apiBase}${certificateUrl}`;
};

  const selectedCertificate = selectedSpecialty?.certificate || null;

  return (
    <div className="credentials-page">
      <nav className="credentials-nav">
        <button type="button" onClick={() => navigate('/specialist')}>
          Inicio
        </button>

        <button
          type="button"
          onClick={() => navigate('/specialist/requests')}
        >
          Solicitudes
        </button>

        <button
          type="button"
          onClick={() => navigate('/specialist/services')}
        >
          Servicios
        </button>

        <button
          type="button"
          onClick={() => navigate('/specialist/earnings')}
        >
          Mis ganancias
        </button>

        <button type="button" className="active">
          Mis constancias
        </button>

        <button
          type="button"
          onClick={() => navigate('/specialist/profile')}
        >
          Mi perfil
        </button>
      </nav>

      <main className="credentials-shell">
        <section className="credentials-hero">
          <div>
            <span className="credentials-eyebrow">
              PERFIL PROFESIONAL
            </span>

            <h1>Constancias y acreditaciones</h1>

            <p>
              Sube una constancia por cada especialidad que quieras ofrecer.
              La aprobación de una especialidad no acredita automáticamente
              las demás.
            </p>
          </div>

          <div className="credentials-hero-badge">
            <span>{specialties.length}</span>
            <div>
              <strong>Especialidades</strong>
              <small>disponibles en FASYN</small>
            </div>
          </div>
        </section>

        {requestedCategoryName && (
          <div className="credentials-required-banner">
            <div className="credentials-required-icon">!</div>
            <div>
              <strong>Constancia requerida</strong>
              <p>
                Para continuar con tu publicación debes acreditar{' '}
                <b>{requestedCategoryName}</b>.
              </p>
            </div>
          </div>
        )}

        <section className="credentials-layout">
          <div className="credentials-main-card">
            <div className="credentials-card-heading">
              <div>
                <span>01</span>
                <div>
                  <h2>Agregar constancia</h2>
                  <p>
                    Selecciona la especialidad y adjunta el documento que
                    compruebe tu capacitación.
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="credentials-loading">
                <div className="credentials-spinner" />
                <p>Cargando especialidades...</p>
              </div>
            ) : (
              <>
                <div className="credentials-field">
                  <label>Especialidad</label>

                  <select
                    value={selectedCategoryId}
                    disabled={saving}
                    onChange={(event) => {
                      setSelectedCategoryId(event.target.value);
                      setError('');
                      setSuccess('');
                    }}
                  >
                    <option value="">
                      Selecciona una especialidad
                    </option>

                    {specialties.map((specialty) => (
                      <option
                        key={specialty.id}
                        value={specialty.id}
                      >
                        {specialty.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCertificate && (
                  <div
                    className={`credentials-current credentials-current-${selectedCertificate.status.toLowerCase()}`}
                  >
                    <div>
                      <span>ESTADO ACTUAL</span>
                      <strong>
                        {STATUS_TEXT[selectedCertificate.status]}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                      setPreviewUrl(
  getDocumentUrl(
    selectedCertificate.certificateUrl
  )
)
                      }
                    >
                      Ver constancia
                    </button>
                  </div>
                )}

                <div className="credentials-fields-grid">
                  <div className="credentials-field">
                    <label>Nombre del curso o constancia</label>
                    <input
                      type="text"
                      maxLength={120}
                      placeholder="Ej. Instalaciones eléctricas residenciales"
                      value={courseName}
                      disabled={saving}
                      onChange={(event) =>
                        setCourseName(event.target.value)
                      }
                    />
                  </div>

                  <div className="credentials-field">
                    <label>Institución</label>
                    <input
                      type="text"
                      maxLength={150}
                      placeholder="Institución que emitió el documento"
                      value={institution}
                      disabled={saving}
                      onChange={(event) =>
                        setInstitution(event.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="credentials-field">
                  <label>Documento</label>

                  <label
                    className={`credentials-upload-box ${
                      file ? 'has-file' : ''
                    }`}
                    htmlFor="certificate-file"
                  >
                    <div className="credentials-upload-icon">
                      {file ? '✓' : '↑'}
                    </div>

                    <div>
                      <strong>
                        {file
                          ? file.name
                          : 'Selecciona tu constancia'}
                      </strong>

                      <span>
                        {file
                          ? 'Archivo listo para enviar'
                          : 'PDF, JPG, PNG o WEBP · Máximo 8 MB'}
                      </span>
                    </div>
                  </label>

                  <input
                    id="certificate-file"
                    className="credentials-file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    disabled={saving}
                    onChange={(event) =>
                      setFile(event.target.files?.[0] || null)
                    }
                  />
                </div>

                {error && (
                  <div className="credentials-message error">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="credentials-message success">
                    {success}
                  </div>
                )}

                <div className="credentials-actions">
                  <button
                    type="button"
                    className="credentials-secondary"
                    disabled={saving}
                    onClick={() => navigate('/specialist')}
                  >
                    Volver
                  </button>

                  <button
                    type="button"
                    className="credentials-primary"
                    disabled={saving || !selectedCategoryId}
                    onClick={handleSubmit}
                  >
                    {saving
                      ? 'Enviando...'
                      : 'Enviar a revisión'}
                  </button>
                </div>
              </>
            )}
          </div>

          <aside className="credentials-help-card">
            <div className="credentials-help-icon">?</div>

            <span className="credentials-help-kicker">
              ¿NO TIENES CONSTANCIA?
            </span>

            <h2 color='#000'>Puedes obtener capacitación en línea</h2>

            <p>
              Una opción es TELMEX Educación / Fundación Carlos Slim.
              Busca un curso relacionado con la especialidad que deseas
              ofrecer y, al terminarlo, sube aquí tu constancia.
            </p>

            <button
              type="button"
              onClick={() =>
                window.open(
                  'https://telmexeducacion.com/course/',
                  '_blank',
                  'noopener,noreferrer'
                )
              }
            >
              Explorar cursos
              <span>↗</span>
            </button>

            <div className="credentials-help-note">
              <strong>La especialidad debe coincidir</strong>
              <p>
                Una constancia de Carpintería no acredita Electricidad.
                Cada especialidad se valida por separado.
              </p>
            </div>

            <small>
              También puedes presentar documentos emitidos por otras
              instituciones.
            </small>
          </aside>
        </section>

        <section className="credentials-status-card">
          <div className="credentials-status-heading">
            <div>
              <span className="credentials-eyebrow">
                TUS ESPECIALIDADES
              </span>
              <h2>Estado de acreditación</h2>
            </div>

            <button
              type="button"
              onClick={() => void loadCertificates()}
            >
              Actualizar
            </button>
          </div>

          {!loading && specialties.length === 0 ? (
            <div className="credentials-empty">
              No hay especialidades disponibles.
            </div>
          ) : (
            <div className="credentials-status-grid">
              {specialties.map((specialty) => {
                const certificate = specialty.certificate;

                return (
                  <article
                    className="credentials-specialty-card"
                    key={specialty.id}
                  >
                    <div className="credentials-specialty-top">
                      <div className="credentials-specialty-letter">
                        {specialty.name.charAt(0).toUpperCase()}
                      </div>

                      <span
                        className={`credentials-status-pill ${
                          certificate
                            ? certificate.status.toLowerCase()
                            : 'missing'
                        }`}
                      >
                        {certificate
                          ? STATUS_TEXT[certificate.status]
                          : 'Sin constancia'}
                      </span>
                    </div>

                    <h3>{specialty.name}</h3>

                    {certificate ? (
                      <>
                        <p>{certificate.courseName}</p>

 <button
  type="button"
  onClick={() =>
    setPreviewUrl(
      getDocumentUrl(
certificate.certificateUrl

      )
    )
  }
>
  Ver constancia
</button>
                      </>
                    ) : (
                      <p>
                        Aún no has enviado una constancia para esta
                        especialidad.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
      {previewUrl && (
  <div
    className="certificate-modal-backdrop"
    onClick={() => setPreviewUrl(null)}
  >
    <div
      className="certificate-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="certificate-modal-header">
        <h3>Vista previa de constancia</h3>

        <button
          type="button"
          onClick={() => setPreviewUrl(null)}
        >
          ×
        </button>
      </div>

      <div className="certificate-modal-body">
        {previewUrl.toLowerCase().endsWith('.pdf') ? (
          <iframe
            src={previewUrl}
            title="Constancia PDF"
          />
        ) : (
          <img
            src={previewUrl}
            alt="Constancia"
          />
        )}
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default SpecialistCertificates;
