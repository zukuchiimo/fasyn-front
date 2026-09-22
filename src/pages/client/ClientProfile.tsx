import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import logo from '../../assets/logo.png';
import { api } from '../../api/api';

import './ClientProfile.css';

type ClientProfileData = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  profilePhotoUrl?: string | null;
  active: boolean;
  createdAt: string;
};

const ClientProfile = () => {
  const navigate = useNavigate();

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const token =
    localStorage.getItem('token');

  const [profile, setProfile] =
    useState<ClientProfileData | null>(null);

  const [name, setName] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [phone, setPhone] =
    useState('');

  const [selectedPhoto, setSelectedPhoto] =
    useState<File | null>(null);

  const [previewPhoto, setPreviewPhoto] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const resolveStoredFileUrl = (
    fileUrl?: string | null
  ) => {
    if (!fileUrl) {
      return '';
    }

    if (/^https?:\/\//i.test(fileUrl)) {
      return fileUrl;
    }

    const apiBaseUrl =
      api.defaults.baseURL ||
      'http://localhost:3000/api';

    const apiOrigin = apiBaseUrl
      .replace(/\/api\/?$/, '')
      .replace(/\/$/, '');

    const normalizedPath =
      fileUrl.startsWith('/')
        ? fileUrl
        : `/${fileUrl}`;

    return `${apiOrigin}${normalizedPath}`;
  };

  const initials = useMemo(() => {
    return (
      name
        .trim()
        .split(' ')
        .filter(Boolean)
        .map((word) =>
          word.charAt(0)
        )
        .join('')
        .substring(0, 2)
        .toUpperCase() ||
      'CL'
    );
  }, [name]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      navigate('/login');
      return;
    }

    let mounted = true;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError('');

        console.log(
          'CARGANDO PERFIL CLIENTE...'
        );

        const response =
          await api.get(
            '/clients/profile',
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },

              /*
                Evita que la pantalla se quede
                cargando indefinidamente si el
                backend no responde.
              */
              timeout: 8000,
            }
          );

        if (!mounted) {
          return;
        }

        console.log(
          'PERFIL CLIENTE RESPONSE:',
          response.data
        );

        const data =
          response.data?.profile;

        if (!data) {
          throw new Error(
            'La API no devolvió el perfil del cliente'
          );
        }

        setProfile(data);
        setName(data.name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
console.log('DATA PROFILE PHOTO -------:', data
);
        if (data.profilePhotoUrl) {
          setPreviewPhoto(
            resolveStoredFileUrl(
              data.profilePhotoUrl
            )
          );
        } else {
          setPreviewPhoto('');
        }
      } catch (requestError: any) {
        if (!mounted) {
          return;
        }

        console.error(
          'ERROR CARGANDO PERFIL CLIENTE:',
          requestError.response?.data ||
            requestError
        );

        if (
          requestError.response?.status ===
          401
        ) {
          localStorage.removeItem(
            'token'
          );

          localStorage.removeItem(
            'user'
          );

          setLoading(false);
          navigate('/login');
          return;
        }

        /*
          Como respaldo visual cargamos los datos
          que ya tenemos de la sesión para que la
          pantalla NO se quede atorada.
        */
        const storedUser =
          localStorage.getItem(
            'user'
          );

        if (storedUser) {
          try {
            const sessionUser =
              JSON.parse(
                storedUser
              );

            setName(
              sessionUser?.name ||
                'Cliente'
            );

            setEmail(
              sessionUser?.email ||
                ''
            );
          } catch (
            storageError
          ) {
            console.error(
              'ERROR LEYENDO USUARIO LOCAL:',
              storageError
            );
          }
        }

        if (
          requestError.code ===
          'ECONNABORTED'
        ) {
          setError(
            'El servidor tardó demasiado en responder. Revisa que el backend esté ejecutándose en el puerto 3000.'
          );
        } else {
          setError(
            requestError.response?.data
              ?.message ||
              requestError.message ||
              'No fue posible cargar tu perfil.'
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [navigate, token]);

  useEffect(() => {
    return () => {
      if (
        previewPhoto.startsWith(
          'blob:'
        )
      ) {
        URL.revokeObjectURL(
          previewPhoto
        );
      }
    };
  }, [previewPhoto]);

  const handlePhotoChange = (
    event:
      React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setError(
        'La foto debe ser JPG, PNG o WEBP.'
      );
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        'La foto no puede superar 5 MB.'
      );
      return;
    }

    if (
      previewPhoto.startsWith(
        'blob:'
      )
    ) {
      URL.revokeObjectURL(
        previewPhoto
      );
    }

    setSelectedPhoto(file);

    setPreviewPhoto(
      URL.createObjectURL(file)
    );

    setError('');
    setSuccess('');
  };

  const handleSave = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!token) {
      navigate('/login');
      return;
    }

    if (!name.trim()) {
      setError(
        'Ingresa tu nombre.'
      );
      return;
    }

    if (!email.trim()) {
      setError(
        'Ingresa tu correo electrónico.'
      );
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response =
        await api.patch(
          '/clients/profile',
          {
            name:
              name.trim(),
            email:
              email
                .trim()
                .toLowerCase(),
            phone:
              phone.trim(),
          },
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      let updatedProfile =
        response.data?.profile;

      if (selectedPhoto) {
        const formData =
          new FormData();

        formData.append(
          'profilePhoto',
          selectedPhoto
        );

        const photoResponse =
          await api.post(
            '/clients/profile/photo',
            formData,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        updatedProfile = {
          ...updatedProfile,

          profilePhotoUrl:
            photoResponse.data
              ?.profilePhotoUrl ??
            updatedProfile
              ?.profilePhotoUrl,
        };

        setSelectedPhoto(null);

        if (
          updatedProfile
            ?.profilePhotoUrl
        ) {
          setPreviewPhoto(
            resolveStoredFileUrl(
              updatedProfile
                .profilePhotoUrl
            )
          );
        }
      }

      setProfile(
        updatedProfile
      );

      const storedUser =
        localStorage.getItem(
          'user'
        );

      if (storedUser) {
        try {
          const currentUser =
            JSON.parse(
              storedUser
            );

          localStorage.setItem(
            'user',
            JSON.stringify({
              ...currentUser,

              name:
                updatedProfile?.name ||
                name.trim(),

              email:
                updatedProfile?.email ||
                email
                  .trim()
                  .toLowerCase(),
            })
          );
        } catch (storageError) {
          console.error(
            'ERROR ACTUALIZANDO USUARIO LOCAL:',
            storageError
          );
        }
      }

      setSuccess(
        'Tu perfil se actualizó correctamente.'
      );
    } catch (requestError: any) {
      console.error(
        'ERROR ACTUALIZANDO PERFIL CLIENTE:',
        requestError.response?.data ||
          requestError
      );

      setError(
        requestError.response?.data
          ?.message ||
          'No fue posible actualizar tu perfil.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(
      'token'
    );

    localStorage.removeItem(
      'user'
    );

    navigate('/login');
  };

  const handlePendingSection = (
    section: string
  ) => {
    alert(
      `${section} estará disponible próximamente.`
    );
  };

  if (loading) {
    return (
      <div className="client-profile-loading">
        <div className="client-profile-spinner" />

        <strong>
          Cargando tu perfil
        </strong>

        <span>
          Estamos consultando tu información.
        </span>
      </div>
    );
  }

  return (
    <div className="client-dashboard">

      {/* SIDEBAR: MISMA ESTRUCTURA DEL DASHBOARD */}
      <aside className="client-sidebar">

        <button
          type="button"
          className="client-logo"
          onClick={() =>
            navigate('/')
          }
        >
          <img
            src={logo}
            alt="FASYN"
          />
        </button>

        <div className="client-user">

          <div
            className="client-avatar"
            style={{
              overflow: 'hidden',
            }}
          >
            {previewPhoto ? (
              <img
                src={previewPhoto}
                alt={name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              initials
            )}
          </div>

          <div className="client-user-info">

            <strong>
              {name || 'Cliente'}
            </strong>

            <span>
              Cliente
            </span>

          </div>

        </div>

        <nav className="client-menu">

          <button
            type="button"
            onClick={() =>
              navigate('/client')
            }
          >
            <span>⌂</span>
            Inicio
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(
                '/specialists'
              )
            }
          >
            <span>⌕</span>
            Buscar especialistas
          </button>

          <button
            type="button"
            onClick={() =>
              handlePendingSection(
                'Mis solicitudes'
              )
            }
          >
            <span>◉</span>
            Mis solicitudes
          </button>

          <button
            type="button"
            onClick={() =>
              handlePendingSection(
                'Favoritos'
              )
            }
          >
            <span>♡</span>
            Favoritos
          </button>

          <button
            type="button"
            onClick={() =>
              handlePendingSection(
                'Historial'
              )
            }
          >
            <span>✓</span>
            Historial
          </button>

          <button
            type="button"
            className="active"
          >
            <span>♙</span>
            Mi perfil
          </button>

        </nav>

        <div className="client-sidebar-bottom">

          <button
            type="button"
            className="client-back-home"
            onClick={() =>
              navigate('/')
            }
          >
            ← Volver a FASYN
          </button>

          <button
            type="button"
            className="client-logout"
            onClick={
              handleLogout
            }
          >
            Cerrar sesión
          </button>

        </div>

      </aside>

      {/* CONTENIDO: MISMO CONTENEDOR DEL DASHBOARD */}
      <main className="client-main">

        <header className="client-header">

          <div>

            <span className="client-eyebrow">
              PANEL DEL CLIENTE
            </span>

            <h1>
              Mi perfil
            </h1>

            <p>
              Administra tu información personal
              y tu foto de perfil.
            </p>

          </div>

          <button
            type="button"
            className="find-specialist-button"
            onClick={() =>
              navigate('/client')
            }
          >
            <span>←</span>
            Volver al inicio
          </button>

        </header>

        {error && (
          <div className="client-profile-message error">
            {error}
          </div>
        )}

        {success && (
          <div className="client-profile-message success">
            {success}
          </div>
        )}

        <form
          className="client-profile-grid"
          onSubmit={
            handleSave
          }
        >

          {/* FOTO */}
          <section className="client-panel client-profile-photo-card">

            <div className="client-panel-header">

              <div>

                <span className="client-section-eyebrow">
                  PERFIL
                </span>

                <h2>
                  Foto de perfil
                </h2>

                <p>
                  Personaliza tu cuenta con
                  una fotografía.
                </p>

              </div>

            </div>

            <div className="client-profile-photo-body">

              <div className="client-profile-photo">

                {previewPhoto ? (
                  <img
                    src={previewPhoto}
                    alt={name}
                  />
                ) : (
                  initials
                )}

              </div>

              <h3>
                {name || 'Cliente'}
              </h3>

              <span className="client-profile-role">
                Cliente FASYN
              </span>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={
                  handlePhotoChange
                }
                hidden
              />

              <button
                type="button"
                className="client-profile-photo-button"
                onClick={() =>
                  fileInputRef.current
                    ?.click()
                }
              >
                {previewPhoto
                  ? 'Cambiar foto'
                  : 'Agregar foto'}
              </button>

              <small>
                JPG, PNG o WEBP. Máximo 5 MB.
              </small>

              <div className="client-profile-status">

                <span>
                  ESTADO DE CUENTA
                </span>

                <strong>
                  <i />
                  {profile?.active
                    ? 'Activa'
                    : 'Inactiva'}
                </strong>

              </div>

            </div>

          </section>

          {/* DATOS */}
          <section className="client-panel client-profile-data-card">

            <div className="client-panel-header">

              <div>

                <span className="client-section-eyebrow">
                  INFORMACIÓN
                </span>

                <h2>
                  Datos personales
                </h2>

                <p>
                  Mantén actualizados tus datos
                  de contacto.
                </p>

              </div>

            </div>

            <div className="client-profile-form">

              <label>
                <span>
                  Nombre completo
                </span>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  placeholder="Nombre completo"
                  required
                />
              </label>

              <label>
                <span>
                  Correo electrónico
                </span>

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="correo@ejemplo.com"
                  required
                />
              </label>

              <label>
                <span>
                  Teléfono
                </span>

                <input
                  type="tel"
                  value={phone}
                  onChange={(event) =>
                    setPhone(
                      event.target.value
                    )
                  }
                  placeholder="55 1234 5678"
                />
              </label>

              <label>
                <span>
                  Tipo de cuenta
                </span>

                <input
                  type="text"
                  value="Cliente"
                  disabled
                />
              </label>

            </div>

            <div className="client-profile-info-row">

              <div>

                <span>
                  MIEMBRO DESDE
                </span>

                <strong>
                  {profile?.createdAt
                    ? new Date(
                        profile.createdAt
                      ).toLocaleDateString(
                        'es-MX',
                        {
                          year:
                            'numeric',
                          month:
                            'long',
                          day:
                            'numeric',
                        }
                      )
                    : 'No disponible'}
                </strong>

              </div>

              <div>

                <span>
                  CUENTA
                </span>

                <strong>
                  Cliente FASYN
                </strong>

              </div>

            </div>

            <div className="client-profile-actions">

              <button
                type="button"
                className="client-profile-cancel"
                disabled={saving}
                onClick={() =>
                  navigate('/client')
                }
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="client-profile-save"
                disabled={saving}
              >
                {saving
                  ? 'Guardando...'
                  : 'Guardar cambios'}
              </button>

            </div>

          </section>

        </form>

      </main>

    </div>
  );
};

export default ClientProfile;
