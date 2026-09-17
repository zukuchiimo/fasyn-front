import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import { api } from '../../../api/api';
import logo from '../../assets/logo.png';

import './SpecialistProfile.css';

type Category = {
  id: number;
  name: string;
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

const SpecialistProfile = () => {
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
      .trim();

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

      const profile =
        profileResponse.data.profile;

      if (profile) {
        setForm({
          phone:
            profile.phone || '',

          description:
            profile.description || '',

          experience:
            profile.experience !== null &&
            profile.experience !== undefined
              ? String(
                  profile.experience
                )
              : '',

          state:
            profile.state || '',

          municipality:
            profile.municipality || '',

          neighborhood:
            profile.neighborhood || '',

          postalCode:
            profile.postalCode || '',

          address:
            profile.address || '',
        });

        const specialties =
          profile.specialties || [];

        setSelectedCategories(
          specialties.map(
            (item: any) =>
              item.category.id
          )
        );
      }

      setCategories(
        categoriesResponse.data
          ?.categories || []
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

    setSuccess('');
    setError('');
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
            (id) => id !== categoryId
          );
        }

        return [
          ...current,
          categoryId,
        ];
      }
    );

    setSuccess('');
  };

  const completedFields =
    useMemo(() => {
      let completed = 0;

      if (form.phone.trim()) {
        completed++;
      }

      if (form.description.trim()) {
        completed++;
      }

      if (form.experience.trim()) {
        completed++;
      }

      if (form.state.trim()) {
        completed++;
      }

      if (form.municipality.trim()) {
        completed++;
      }

      if (form.neighborhood.trim()) {
        completed++;
      }

      if (form.postalCode.trim()) {
        completed++;
      }

      if (form.address.trim()) {
        completed++;
      }

      if (
        selectedCategories.length > 0
      ) {
        completed++;
      }

      return completed;
    }, [
      form,
      selectedCategories,
    ]);

  const completionPercentage =
    Math.round(
      (completedFields / 9) * 100
    );

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
        selectedCategories.length === 0
      ) {
        setError(
          'Selecciona al menos una especialidad.'
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
      <div className="specialist-profile-loading">
        <span />
        <p>
          Cargando tu perfil...
        </p>
      </div>
    );
  }

  return (
    <div className="specialist-profile-page">

      <header className="specialist-profile-header">
        <div className="specialist-profile-header-inner">

          <button
            type="button"
            className="specialist-profile-brand"
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
            className="specialist-profile-back"
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

      <main className="specialist-profile-main">

        <section className="specialist-profile-heading">

          <div>
            <span className="specialist-profile-eyebrow">
              MI PERFIL
            </span>

            <h1>
              Tu perfil profesional
            </h1>

            <p>
              Mantén actualizada la
              información que verán los
              clientes cuando encuentren
              tus servicios.
            </p>
          </div>

          <div className="specialist-profile-completion">

            <div>
              <span>
                PERFIL COMPLETADO
              </span>

              <strong>
                {completionPercentage}%
              </strong>
            </div>

            <div className="profile-completion-track">
              <div
                className="profile-completion-bar"
                style={{
                  width:
                    `${completionPercentage}%`,
                }}
              />
            </div>

          </div>

        </section>

        {error && (
          <div className="specialist-profile-error">
            {error}
          </div>
        )}

        {success && (
          <div className="specialist-profile-success">
            {success}
          </div>
        )}

        <div className="specialist-profile-layout">

          <aside className="specialist-profile-sidebar">

            <div className="specialist-profile-avatar">
              {initials}
            </div>

            <h2>
              {user.name}
            </h2>

            <p>
              {user.email}
            </p>

            <span className="specialist-profile-role">
              Especialista FASYN
            </span>

            <div className="specialist-profile-status">
              <i />
              Perfil activo
            </div>

            <div className="specialist-profile-photo-note">
              <strong>
                Foto de perfil
              </strong>

              <p>
                Próximamente podrás subir
                una fotografía profesional.
              </p>
            </div>

          </aside>

          <section className="specialist-profile-form">

            <div className="profile-section">

              <div className="profile-section-heading">
                <span>01</span>

                <div>
                  <h2>
                    Información profesional
                  </h2>

                  <p>
                    Cuéntale a tus clientes
                    quién eres y cuál es tu
                    experiencia.
                  </p>
                </div>
              </div>

              <div className="profile-fields-grid">

                <div className="profile-field">
                  <label>
                    Nombre
                  </label>

                  <input
                    type="text"
                    value={user.name}
                    disabled
                  />
                </div>

                <div className="profile-field">
                  <label>
                    Correo electrónico
                  </label>

                  <input
                    type="email"
                    value={user.email}
                    disabled
                  />
                </div>

                <div className="profile-field">
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

                <div className="profile-field">
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

              <div className="profile-field">
                <div className="profile-label-row">
                  <label>
                    Descripción profesional
                  </label>

                  <span>
                    {
                      form.description
                        .length
                    }/500
                  </span>
                </div>

                <textarea
                  maxLength={500}
                  placeholder="Describe tu experiencia, el tipo de trabajos que realizas y qué te distingue como profesional."
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
              </div>

            </div>

            <div className="profile-divider" />

            <div className="profile-section">

              <div className="profile-section-heading">
                <span>02</span>

                <div>
                  <h2>
                    Especialidades
                  </h2>

                  <p>
                    Selecciona las áreas en
                    las que puedes ofrecer
                    servicios.
                  </p>
                </div>
              </div>

              <div className="profile-specialty-grid">

                {categories.map(
                  (category) => {
                    const selected =
                      selectedCategories.includes(
                        category.id
                      );

                    return (
                      <button
                        type="button"
                        key={
                          category.id
                        }
                        className={
                          selected
                            ? 'profile-specialty-option selected'
                            : 'profile-specialty-option'
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

              {categories.length ===
                0 && (
                <div className="profile-empty-specialties">
                  No hay especialidades
                  disponibles.
                </div>
              )}

            </div>

            <div className="profile-divider" />

            <div className="profile-section">

              <div className="profile-section-heading">
                <span>03</span>

                <div>
                  <h2>
                    Ubicación
                  </h2>

                  <p>
                    Indica dónde realizas
                    tus servicios.
                  </p>
                </div>
              </div>

              <div className="profile-fields-grid">

                <div className="profile-field">
                  <label>
                    Estado
                  </label>

                  <input
                    type="text"
                    placeholder="Ej. Ciudad de México"
                    value={
                      form.state
                    }
                    onChange={(event) =>
                      handleChange(
                        'state',
                        event.target.value
                      )
                    }
                  />
                </div>

                <div className="profile-field">
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

                <div className="profile-field">
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

                <div className="profile-field">
                  <label>
                    Código postal
                  </label>

                  <input
                    type="text"
                    maxLength={5}
                    placeholder="Ej. 11320"
                    value={
                      form.postalCode
                    }
                    onChange={(event) =>
                      handleChange(
                        'postalCode',
                        event.target.value
                      )
                    }
                  />
                </div>

              </div>

              <div className="profile-field">
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
              </div>

            </div>

            <div className="profile-form-actions">

              <button
                type="button"
                className="profile-cancel-button"
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
                className="profile-save-button"
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

export default SpecialistProfile;