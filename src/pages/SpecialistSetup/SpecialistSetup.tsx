import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { api } from '../../api/api';
import logo from '../../assets/logo.png';

import './SpecialistSetup.css';

interface Category {
  id: number;
  name: string;
}

const TOTAL_STEPS = 6;

const SpecialistSetup = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    phone: '',
    description: '',
    experience: '',
    state: '',
    municipality: '',
    neighborhood: '',
    postalCode: '',
    address: '',
  });

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);

        const response = await api.get('/categories');

        setCategories(response.data.categories || []);
      } catch (error) {
        console.error('ERROR CARGANDO CATEGORÍAS:', error);

        setError(
          'No fue posible cargar las especialidades disponibles.'
        );
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));

    setError('');
  };

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories((current) => {
      if (current.includes(categoryId)) {
        return current.filter((id) => id !== categoryId);
      }

      return [...current, categoryId];
    });

    setError('');
  };

  const validateStep = () => {
    setError('');

    if (step === 1) {
      if (!form.phone.trim()) {
        setError('Ingresa tu número de teléfono.');
        return false;
      }

      if (!form.description.trim()) {
        setError('Agrega una descripción de tu experiencia profesional.');
        return false;
      }

      if (!form.experience) {
        setError('Indica tus años de experiencia.');
        return false;
      }
    }

    if (step === 2) {
      if (
        !form.state.trim() ||
        !form.municipality.trim() ||
        !form.neighborhood.trim() ||
        !form.postalCode.trim()
      ) {
        setError(
          'Completa tu zona de trabajo antes de continuar.'
        );
        return false;
      }
    }

    if (step === 3 && !profilePhoto) {
      setError('Selecciona una fotografía de perfil.');
      return false;
    }

    if (step === 4 && (!idFront || !idBack)) {
      setError(
        'Selecciona el frente y reverso de tu identificación.'
      );
      return false;
    }

    if (step === 5 && selectedCategories.length === 0) {
      setError('Selecciona al menos una especialidad.');
      return false;
    }

    return true;
  };

  const nextStep = () => {
    if (!validateStep()) {
      return;
    }

    setStep((current) =>
      Math.min(current + 1, TOTAL_STEPS)
    );

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const previousStep = () => {
    setError('');

    setStep((current) =>
      Math.max(current - 1, 1)
    );

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

const finishSetup = async () => {
  try {
    setSaving(true);
    setError('');

    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login');
      return;
    }

    // 1. Guardar datos del perfil profesional
    const profileResponse = await api.post(
      '/specialists/profile',
      form,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log(
      'PERFIL GUARDADO:',
      profileResponse.data
    );

    // 2. Guardar especialidades seleccionadas
    const specialtiesResponse = await api.put(
      '/specialists/specialties',
      {
        categoryIds: selectedCategories,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log(
      'ESPECIALIDADES GUARDADAS:',
      specialtiesResponse.data
    );

    // 3. Ir al panel del especialista
    navigate('/specialist');

  } catch (error: any) {
    console.error(
      'ERROR GUARDANDO PERFIL:',
      error.response?.data || error
    );

    setError(
      error.response?.data?.message ||
        'No fue posible guardar tu perfil. Inténtalo nuevamente.'
    );
  } finally {
    setSaving(false);
  }
};
  const selectedCategoryNames = categories
    .filter((category) =>
      selectedCategories.includes(category.id)
    )
    .map((category) => category.name);

  return (
    <div className="specialist-setup">

      <header className="setup-header">

        <Link to="/" className="setup-logo">
          <img src={logo} alt="FASYN" />
        </Link>

        <div className="setup-header-info">
          <span>PERFIL PROFESIONAL</span>
          <p>Configuración de especialista</p>
        </div>

      </header>

      <main className="setup-layout">

        <aside className="setup-sidebar">

          <div className="setup-sidebar-content">

            <span className="setup-sidebar-label">
              COMIENZA EN FASYN
            </span>

            <h2>
              Crea un perfil que genere confianza.
            </h2>

            <p>
              Completa tu información para que los clientes
              conozcan tu experiencia, ubicación y los servicios
              que puedes realizar.
            </p>

            <div className="setup-steps">

              <div className={step === 1 ? 'setup-step active' : step > 1 ? 'setup-step completed' : 'setup-step'}>
                <span>01</span>
                <div>
                  <strong>Información profesional</strong>
                  <p>Experiencia y contacto</p>
                </div>
              </div>

              <div className={step === 2 ? 'setup-step active' : step > 2 ? 'setup-step completed' : 'setup-step'}>
                <span>02</span>
                <div>
                  <strong>Zona de trabajo</strong>
                  <p>Ubicación y cobertura</p>
                </div>
              </div>

              <div className={step === 3 ? 'setup-step active' : step > 3 ? 'setup-step completed' : 'setup-step'}>
                <span>03</span>
                <div>
                  <strong>Fotografía</strong>
                  <p>Imagen de tu perfil</p>
                </div>
              </div>

              <div className={step === 4 ? 'setup-step active' : step > 4 ? 'setup-step completed' : 'setup-step'}>
                <span>04</span>
                <div>
                  <strong>Identidad</strong>
                  <p>Verificación del especialista</p>
                </div>
              </div>

              <div className={step === 5 ? 'setup-step active' : step > 5 ? 'setup-step completed' : 'setup-step'}>
                <span>05</span>
                <div>
                  <strong>Especialidades</strong>
                  <p>Servicios que puedes realizar</p>
                </div>
              </div>

              <div className={step === 6 ? 'setup-step active' : 'setup-step'}>
                <span>06</span>
                <div>
                  <strong>Confirmación</strong>
                  <p>Revisa tu información</p>
                </div>
              </div>

            </div>

          </div>

        </aside>

        <section className="setup-main">

          <div className="setup-main-content">

            <div className="setup-progress-header">

              <div>
                <span>
                  PASO {step} DE {TOTAL_STEPS}
                </span>

                <strong>
                  {Math.round((step / TOTAL_STEPS) * 100)}%
                </strong>
              </div>

              <div className="setup-progress">
                <div
                  className="setup-progress-value"
                  style={{
                    width: `${(step / TOTAL_STEPS) * 100}%`,
                  }}
                />
              </div>

            </div>

            {step === 1 && (
              <section className="setup-card">

                <div className="setup-title">
                  <span>INFORMACIÓN PROFESIONAL</span>

                  <h1>Cuéntanos sobre tu trabajo</h1>

                  <p>
                    Esta información será visible para los clientes
                    que visiten tu perfil.
                  </p>
                </div>

                <div className="setup-form">

                  <label>
                    <span>Teléfono</span>

                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      maxLength={10}
                      onChange={handleChange}
                      placeholder="55 1234 5678"
                    />
                  </label>

                  <label>
                    <span>Descripción profesional</span>

                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      placeholder="Ej. Carpintero con experiencia en fabricación, reparación e instalación de muebles..."
                    />

                    <small>
                      Describe tus habilidades y el tipo de trabajos
                      que realizas.
                    </small>
                  </label>

                  <label>
                    <span>Años de experiencia</span>

                    <input
                      type="number"
                      min="0"
                      name="experience"
                      value={form.experience}
                      onChange={handleChange}
                      placeholder="Ej. 5"
                    />
                  </label>

                </div>

              </section>
            )}

            {step === 2 && (
              <section className="setup-card">

                <div className="setup-title">
                  <span>ZONA DE TRABAJO</span>

                  <h1>¿Dónde ofreces tus servicios?</h1>

                  <p>
                    Esta información ayudará a conectar tu perfil
                    con clientes cercanos.
                  </p>
                </div>

                <div className="setup-form setup-form-grid">

                  <label>
                    <span>Estado</span>

                    <input
                      name="state"
                      value={form.state}
                      onChange={handleChange}
                      placeholder="Ciudad de México"
                    />
                  </label>

                  <label>
                    <span>Alcaldía o municipio</span>

                    <input
                      name="municipality"
                      value={form.municipality}
                      onChange={handleChange}
                      placeholder="Gustavo A. Madero"
                    />
                  </label>

                  <label>
                    <span>Colonia</span>

                    <input
                      name="neighborhood"
                      value={form.neighborhood}
                      onChange={handleChange}
                      placeholder="Lindavista"
                    />
                  </label>

                  <label>
                    <span>Código postal</span>

                    <input
                      name="postalCode"
                      value={form.postalCode}
                      onChange={handleChange}
                      placeholder="07300"
                    />
                  </label>

                  <label className="setup-full-field">
                    <span>Domicilio</span>

                    <input
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Calle, número exterior e interior"
                    />

                    <small>
                      Tu domicilio completo no se mostrará públicamente.
                    </small>
                  </label>

                </div>

              </section>
            )}

            {step === 3 && (
              <section className="setup-card">

                <div className="setup-title">
                  <span>FOTOGRAFÍA</span>

                  <h1>Agrega una foto de perfil</h1>

                  <p>
                    Una fotografía clara ayuda a que los clientes
                    identifiquen al especialista que contratarán.
                  </p>
                </div>

                <label className="upload-box">

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      setProfilePhoto(
                        e.target.files?.[0] || null
                      );
                      setError('');
                    }}
                  />

                  <span className="upload-title">
                    Seleccionar fotografía
                  </span>

                  <span className="upload-description">
                    JPG, PNG o WEBP
                  </span>

                  {profilePhoto && (
                    <strong className="selected-file">
                      {profilePhoto.name}
                    </strong>
                  )}

                </label>

              </section>
            )}

            {step === 4 && (
              <section className="setup-card">

                <div className="setup-title">
                  <span>VERIFICACIÓN</span>

                  <h1>Verifica tu identidad</h1>

                  <p>
                    Utilizaremos tu identificación para validar
                    tu perfil profesional.
                  </p>
                </div>

                <div className="identification-grid">

                  <label className="upload-box">

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        setIdFront(
                          e.target.files?.[0] || null
                        );
                        setError('');
                      }}
                    />

                    <span className="upload-small-label">
                      IDENTIFICACIÓN
                    </span>

                    <span className="upload-title">
                      Frente
                    </span>

                    <span className="upload-description">
                      Selecciona una imagen legible
                    </span>

                    {idFront && (
                      <strong className="selected-file">
                        {idFront.name}
                      </strong>
                    )}

                  </label>

                  <label className="upload-box">

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        setIdBack(
                          e.target.files?.[0] || null
                        );
                        setError('');
                      }}
                    />

                    <span className="upload-small-label">
                      IDENTIFICACIÓN
                    </span>

                    <span className="upload-title">
                      Reverso
                    </span>

                    <span className="upload-description">
                      Selecciona una imagen legible
                    </span>

                    {idBack && (
                      <strong className="selected-file">
                        {idBack.name}
                      </strong>
                    )}

                  </label>

                </div>

                <div className="privacy-message">
                  <strong>Información privada</strong>

                  <p>
                    Tu identificación no será visible para otros
                    usuarios de FASYN.
                  </p>
                </div>

              </section>
            )}

            {step === 5 && (
              <section className="setup-card">

                <div className="setup-title">
                  <span>ESPECIALIDADES</span>

                  <h1>¿Qué tipo de trabajos realizas?</h1>

                  <p>
                    Puedes seleccionar más de una especialidad.
                    Después podrás crear servicios y precios específicos.
                  </p>
                </div>

                {loadingCategories ? (
                  <div className="categories-loading">
                    Cargando especialidades...
                  </div>
                ) : categories.length === 0 ? (
                  <div className="categories-empty">
                    No hay especialidades disponibles.
                  </div>
                ) : (
                  <div className="setup-options">

                    {categories.map((category) => {
                      const selected =
                        selectedCategories.includes(category.id);

                      return (
                        <button
                          key={category.id}
                          type="button"
                          className={
                            selected
                              ? 'specialty-option selected'
                              : 'specialty-option'
                          }
                          onClick={() =>
                            toggleCategory(category.id)
                          }
                        >
                          <span className="specialty-selector">
                            {selected ? '✓' : ''}
                          </span>

                          <span>{category.name}</span>
                        </button>
                      );
                    })}

                  </div>
                )}

              </section>
            )}

            {step === 6 && (
              <section className="setup-card">

                <div className="setup-title">
                  <span>CONFIRMACIÓN</span>

                  <h1>Tu perfil está casi listo</h1>

                  <p>
                    Revisa la información principal antes de
                    continuar a tu panel profesional.
                  </p>
                </div>

                <div className="setup-review">

                  <div className="review-row">
                    <span>Experiencia</span>

                    <strong>
                      {form.experience || '0'} años
                    </strong>
                  </div>

                  <div className="review-row">
                    <span>Zona</span>

                    <strong>
                      {form.municipality || 'Sin especificar'}
                      {form.state && `, ${form.state}`}
                    </strong>
                  </div>

                  <div className="review-row">
                    <span>Especialidades</span>

                    <strong>
                      {selectedCategoryNames.length > 0
                        ? selectedCategoryNames.join(', ')
                        : 'Sin seleccionar'}
                    </strong>
                  </div>

                </div>

                <div className="commission-card">

                  <div>
                    <span>COMISIÓN DE FASYN</span>

                    <strong>15%</strong>
                  </div>

                  <p>
                    La comisión se aplica únicamente sobre
                    servicios completados a través de la plataforma.
                  </p>

                </div>

                <div className="setup-next-info">
                  <span>SIGUIENTE ETAPA</span>

                  <p>
                    Al terminar podrás crear tus servicios,
                    establecer precios por hora, día o actividad
                    y administrar solicitudes de clientes.
                  </p>
                </div>

              </section>
            )}

            {error && (
              <div className="setup-error">
                {error}
              </div>
            )}

            <div className="setup-actions">

              {step > 1 ? (
                <button
                  type="button"
                  className="setup-back"
                  onClick={previousStep}
                  disabled={saving}
                >
                  Atrás
                </button>
              ) : (
                <div />
              )}

              {step < TOTAL_STEPS ? (
                <button
                  type="button"
                  className="setup-next"
                  onClick={nextStep}
                >
                  Continuar
                </button>
              ) : (
                <button
                  type="button"
                  className="setup-next"
                  onClick={finishSetup}
                  disabled={saving}
                >
                  {saving
                    ? 'Guardando perfil...'
                    : 'Finalizar perfil'}
                </button>
              )}

            </div>

          </div>

        </section>

      </main>

    </div>
  );
};

export default SpecialistSetup;