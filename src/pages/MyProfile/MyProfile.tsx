import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import { api } from '../../api/api';
import logo from '../../assets/logo.png';

import './MyProfile.css';

type Category = {
  id: number;
  name: string;
};

type SpecialtyRelation = {
  category: Category;
};

type SpecialistProfileData = {
  id: number;
  userId: number;
  phone?: string | null;
  description?: string | null;
  experience?: number | null;
  state?: string | null;
  municipality?: string | null;
  neighborhood?: string | null;
  postalCode?: string | null;
  address?: string | null;
  available?: boolean;
  profileCompleted?: boolean;
  specialties?: SpecialtyRelation[];
};

type ProfileForm = {
  phone: string;
  description: string;
  experience: string;
  state: string;
  municipality: string;
  neighborhood: string;
  postalCode: string;
  address: string;
};

const MyProfile = () => {
  const navigate = useNavigate();

  const storedUser =
    localStorage.getItem('user');

  let user = {
    name: 'Especialista',
    email: '',
  };

  if (storedUser) {
    try {
      user = JSON.parse(storedUser);
    } catch (error) {
      console.error(
        'ERROR LEYENDO USUARIO:',
        error
      );
    }
  }

  const [form, setForm] =
    useState<ProfileForm>({
      phone: '',
      description: '',
      experience: '',
      state: '',
      municipality: '',
      neighborhood: '',
      postalCode: '',
      address: '',
    });

  const [profile, setProfile] =
    useState<SpecialistProfileData | null>(
      null
    );

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [
    selectedCategories,
    setSelectedCategories,
  ] = useState<number[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const initials =
    user.name
      ?.trim()
      .split(' ')
      .filter(Boolean)
      .map((word: string) =>
        word.charAt(0)
      )
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'ES';

  const firstName =
    user.name
      ?.trim()
      .split(' ')[0] ||
    'Especialista';

  const formatCategoryName = (
    value: string
  ) => {
    if (!value) {
      return 'Especialidad';
    }

    const formatted = value
      .replace(
        /([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g,
        '$1 $2'
      )
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!formatted) {
      return 'Especialidad';
    }

    return (
      formatted
        .charAt(0)
        .toLocaleUpperCase('es-MX') +
      formatted.slice(1)
    );
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');

      const token =
        localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      const [
        profileResponse,
        categoriesResponse,
      ] = await Promise.all([
        api.get(
          '/specialists/profile',
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        ),

        api.get('/categories'),
      ]);

      const profileData:
        SpecialistProfileData =
          profileResponse.data.profile;

      setProfile(profileData);

      setForm({
        phone:
          profileData?.phone || '',

        description:
          profileData?.description || '',

        experience:
          profileData?.experience !==
            null &&
          profileData?.experience !==
            undefined
            ? String(
                profileData.experience
              )
            : '',

        state:
          profileData?.state || '',

        municipality:
          profileData?.municipality ||
          '',

        neighborhood:
          profileData?.neighborhood ||
          '',

        postalCode:
          profileData?.postalCode || '',

        address:
          profileData?.address || '',
      });

      const specialties =
        profileData?.specialties || [];

      setSelectedCategories(
        specialties
          .map(
            (item) =>
              item.category?.id
          )
          .filter(Boolean)
      );

      const allCategories:
        Category[] =
          categoriesResponse.data
            ?.categories || [];

      setCategories(
        [...allCategories].sort(
          (a, b) =>
            formatCategoryName(
              a.name
            ).localeCompare(
              formatCategoryName(
                b.name
              ),
              'es'
            )
        )
      );
    } catch (requestError: any) {
      console.error(
        'ERROR CARGANDO PERFIL:',
        requestError.response?.data ||
          requestError
      );

      setError(
        requestError.response?.data
          ?.message ||
          'No fue posible cargar tu perfil.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleChange = (
    field: keyof ProfileForm,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError('');
    setSuccess('');
  };

  const toggleCategory = (
    categoryId: number
  ) => {
    setSelectedCategories(
      (current) => {
        if (
          current.includes(categoryId)
        ) {
          return current.filter(
            (id) =>
              id !== categoryId
          );
        }

        return [
          ...current,
          categoryId,
        ];
      }
    );

    setError('');
    setSuccess('');
  };

  const completionPercentage =
    useMemo(() => {
      let completed = 0;

      const total = 8;

      if (form.phone.trim()) {
        completed++;
      }

      if (
        form.description.trim()
      ) {
        completed++;
      }

      if (
        form.experience.trim()
      ) {
        completed++;
      }

      if (form.state.trim()) {
        completed++;
      }

      if (
        form.municipality.trim()
      ) {
        completed++;
      }

      if (
        form.neighborhood.trim()
      ) {
        completed++;
      }

      if (
        form.postalCode.trim()
      ) {
        completed++;
      }

      if (form.address.trim()) {
        completed++;
      }

      if (
        selectedCategories.length >
        0
      ) {
        completed++;
      }

      return Math.round(
        (completed / total) * 100
      );
    }, [
      form,
      selectedCategories,
    ]);

  const handleSave = async () => {
    try {
      const token =
        localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      if (!form.phone.trim()) {
        setError(
          'Ingresa tu número de teléfono.'
        );
        return;
      }

      if (
        !form.description.trim()
      ) {
        setError(
          'Agrega una descripción profesional.'
        );
        return;
      }

      if (
        selectedCategories.length ===
        0
      ) {
        setError(
          'Selecciona al menos una especialidad.'
        );
        return;
      }

      if (
        form.experience &&
        Number(form.experience) < 0
      ) {
        setError(
          'Los años de experiencia no pueden ser negativos.'
        );
        return;
      }

      setSaving(true);
      setError('');
      setSuccess('');

      await api.post(
        '/specialists/profile',
        {
          phone:
            form.phone.trim(),

          description:
            form.description.trim(),

          experience:
            form.experience
              ? Number(
                  form.experience
                )
              : null,

          state:
            form.state.trim(),

          municipality:
            form.municipality.trim(),

          neighborhood:
            form.neighborhood.trim(),

          postalCode:
            form.postalCode.trim(),

          address:
            form.address.trim(),
        },
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      await api.put(
        '/specialists/specialties',
        {
          categoryIds:
            selectedCategories,
        },
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      setSuccess(
        'Tu perfil se actualizó correctamente.'
      );

      await loadProfile();
    } catch (requestError: any) {
      console.error(
        'ERROR GUARDANDO PERFIL:',
        requestError.response?.data ||
          requestError
      );

      setError(
        requestError.response?.data
          ?.message ||
          'No fue posible guardar los cambios.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="my-profile-loading">
        <div className="my-profile-spinner" />

        <strong>
          Cargando tu perfil
        </strong>

        <span>
          Estamos preparando tu
          información profesional.
        </span>
      </div>
    );
  }

  return (
    <div className="my-profile-page">

      <header className="my-profile-header">
        <div className="my-profile-header-inner">

          <button
            type="button"
            className="my-profile-brand"
            onClick={() =>
              navigate('/')
            }
          >
            <img
              src={logo}
              alt="FASYN"
            />
          </button>

          <div className="my-profile-header-actions">

            <div className="my-profile-header-user">
              <span>
                {initials}
              </span>

              <div>
                <strong>
                  {firstName}
                </strong>

                <small>
                  Especialista
                </small>
              </div>
            </div>

            <button
              type="button"
              className="my-profile-back"
              onClick={() =>
                navigate(
                  '/specialist'
                )
              }
            >
              ← Volver al panel
            </button>

          </div>

        </div>
      </header>

      <main className="my-profile-main">

        <section className="my-profile-hero">

          <div>
            <span className="my-profile-eyebrow">
              MI PERFIL
            </span>

            <h1>
              Mi perfil profesional
            </h1>

            <p>
              Mantén actualizada tu
              información para que los
              clientes conozcan tu
              experiencia, especialidades
              y zona de trabajo.
            </p>
          </div>

          <div className="my-profile-progress-card">

            <div className="my-profile-progress-header">
              <span>
                PERFIL COMPLETADsO
              </span>

              <strong>
                {completionPercentage}%
              </strong>
            </div>

            <div className="my-profile-progress-track">
              <div
                className="my-profile-progress-bar"
                style={{
                  width:
                    `${completionPercentage}%`,
                }}
              />
            </div>

            <small>
              Completa tu información
              para mejorar tu perfil.
            </small>

          </div>

        </section>

        {error && (
          <div className="my-profile-alert error">
            <span>!</span>

            <div>
              <strong>
                Revisa tu información
              </strong>

              <p>{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="my-profile-alert success">
            <span>✓</span>

            <div>
              <strong>
                Cambios guardados
              </strong>

              <p>{success}</p>
            </div>
          </div>
        )}

        <div className="my-profile-layout">

          <aside className="my-profile-sidebar">

            <div className="my-profile-avatar">
              {initials}
            </div>

            <h2>
              {user.name}
            </h2>

            <p className="my-profile-email">
              {user.email}
            </p>

            <span className="my-profile-role">
              ESPECIALISTA FASYN
            </span>

            <div className="my-profile-sidebar-divider" />

            <div className="my-profile-status">
              <span />

              {profile?.available !== false
                ? 'Disponible'
                : 'No disponible'}
            </div>

            <div className="my-profile-sidebar-info">

              <div>
                <span>
                  Especialidades
                </span>

                <strong>
                  {
                    selectedCategories.length
                  }
                </strong>
              </div>

              <div>
                <span>
                  Experiencia
                </span>

                <strong>
                  {form.experience
                    ? `${form.experience} ${
                        Number(
                          form.experience
                        ) === 1
                          ? 'año'
                          : 'años'
                      }`
                    : 'Sin definir'}
                </strong>
              </div>

            </div>

            <div className="my-profile-photo-card">

              <div className="my-profile-photo-icon">
                +
              </div>

              <div>
                <strong>
                  Foto profesional
                </strong>

                <p>
                  Próximamente podrás
                  agregar una fotografía
                  a tu perfil.
                </p>
              </div>

            </div>

          </aside>

          <section className="my-profile-form-card">

            <section className="my-profile-section">

              <div className="my-profile-section-title">

                <span>01</span>

                <div>
                  <h2>
                    Información profesional
                  </h2>

                  <p>
                    Estos datos ayudarán a
                    los clientes a conocerte
                    mejor.
                  </p>
                </div>

              </div>

              <div className="my-profile-grid">

                <div className="my-profile-field">

                  <label>
                    Nombre completo
                  </label>

                  <input
                    type="text"
                    value={user.name}
                    disabled
                  />

                  <small>
                    El nombre corresponde
                    a tu cuenta.
                  </small>

                </div>

                <div className="my-profile-field">

                  <label>
                    Correo electrónico
                  </label>

                  <input
                    type="email"
                    value={user.email}
                    disabled
                  />

                  <small>
                    El correo corresponde
                    a tu cuenta.
                  </small>

                </div>

                <div className="my-profile-field">

                  <label>
                    Teléfono
                  </label>

                  <input
                    type="tel"
                    placeholder="Ej. 5512345678"
                    value={form.phone}
                    onChange={(event) =>
                      handleChange(
                        'phone',
                        event.target.value
                      )
                    }
                  />

                </div>

                <div className="my-profile-field">

                  <label>
                    Años de experiencia
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="80"
                    placeholder="Ej. 5"
                    value={
                      form.experience
                    }
                    onChange={(event) =>
                      handleChange(
                        'experience',
                        event.target.value
                      )
                    }
                  />

                </div>

              </div>

              <div className="my-profile-field full">

                <div className="my-profile-label-row">

                  <label>
                    Descripción profesional
                  </label>

                  <span>
                    {
                      form.description
                        .length
                    }
                    /500
                  </span>

                </div>

                <textarea
                  maxLength={500}
                  placeholder="Ej. Tengo más de 8 años de experiencia realizando trabajos de carpintería residencial, fabricación de muebles y reparaciones..."
                  value={
                    form.description
                  }
                  onChange={(event) =>
                    handleChange(
                      'description',
                      event.target.value
                    )
                  }
                />

                <small>
                  Describe tu experiencia,
                  fortalezas y los trabajos
                  que realizas.
                </small>

              </div>

            </section>

            <div className="my-profile-divider" />

            <section className="my-profile-section">

              <div className="my-profile-section-title">

                <span>02</span>

                <div>
                  <h2>
                    Especialidades
                  </h2>

                  <p>
                    Selecciona todas las
                    áreas en las que puedes
                    trabajar.
                  </p>
                </div>

              </div>

              {categories.length > 0 ? (
                <div className="my-profile-specialties">

                  {categories.map(
                    (category) => {
                      const selected =
                        selectedCategories.includes(
                          category.id
                        );

                      return (
                        <button
                          key={
                            category.id
                          }
                          type="button"
                          className={
                            selected
                              ? 'my-profile-specialty selected'
                              : 'my-profile-specialty'
                          }
                          onClick={() =>
                            toggleCategory(
                              category.id
                            )
                          }
                        >
                          <span>
                            {selected
                              ? '✓'
                              : '+'}
                          </span>

                          {formatCategoryName(
                            category.name
                          )}
                        </button>
                      );
                    }
                  )}

                </div>
              ) : (
                <div className="my-profile-empty">
                  No hay especialidades
                  registradas.
                </div>
              )}

              <div className="my-profile-selected-info">
                <span>
                  {
                    selectedCategories.length
                  }
                </span>

                {selectedCategories.length ===
                1
                  ? ' especialidad seleccionada'
                  : ' especialidades seleccionadas'}
              </div>

            </section>

            <div className="my-profile-divider" />

            <section className="my-profile-section">

              <div className="my-profile-section-title">

                <span>03</span>

                <div>
                  <h2>
                    Ubicación
                  </h2>

                  <p>
                    Indica la zona desde
                    donde ofreces tus
                    servicios.
                  </p>
                </div>

              </div>

              <div className="my-profile-grid">

                <div className="my-profile-field">

                  <label>
                    Estado
                  </label>

                  <input
                    type="text"
                    placeholder="Ej. Ciudad de México"
                    value={form.state}
                    onChange={(event) =>
                      handleChange(
                        'state',
                        event.target.value
                      )
                    }
                  />

                </div>

                <div className="my-profile-field">

                  <label>
                    Municipio / Alcaldía
                  </label>

                  <input
                    type="text"
                    placeholder="Ej. Miguel Hidalgo"
                    value={
                      form.municipality
                    }
                    onChange={(event) =>
                      handleChange(
                        'municipality',
                        event.target.value
                      )
                    }
                  />

                </div>

                <div className="my-profile-field">

                  <label>
                    Colonia
                  </label>

                  <input
                    type="text"
                    placeholder="Ej. Anáhuac"
                    value={
                      form.neighborhood
                    }
                    onChange={(event) =>
                      handleChange(
                        'neighborhood',
                        event.target.value
                      )
                    }
                  />

                </div>

                <div className="my-profile-field">

                  <label>
                    Código postal
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    placeholder="Ej. 11320"
                    value={
                      form.postalCode
                    }
                    onChange={(event) =>
                      handleChange(
                        'postalCode',
                        event.target.value.replace(
                          /\D/g,
                          ''
                        )
                      )
                    }
                  />

                </div>

              </div>

              <div className="my-profile-field full">

                <label>
                  Dirección
                </label>

                <input
                  type="text"
                  placeholder="Calle, número y referencias"
                  value={
                    form.address
                  }
                  onChange={(event) =>
                    handleChange(
                      'address',
                      event.target.value
                    )
                  }
                />

                <small>
                  Esta información puede
                  utilizarse para definir
                  mejor tu zona de trabajo.
                </small>

              </div>

            </section>

            <div className="my-profile-actions">

              <button
                type="button"
                className="my-profile-cancel"
                disabled={saving}
                onClick={() =>
                  navigate(
                    '/specialist'
                  )
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="my-profile-save"
                disabled={saving}
                onClick={handleSave}
              >
                {saving
                  ? 'Guardando...'
                  : 'Guardar cambios'}
              </button>

            </div>

          </section>

        </div>

      </main>

    </div>
  );
};

export default MyProfile;