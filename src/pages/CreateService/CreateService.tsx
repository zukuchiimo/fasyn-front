import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { api } from '../../api/api';
import logo from '../../assets/logo.png';

import './CreateService.css';

type PriceType = 'HOUR' | 'DAY' | 'ACTIVITY';

type Category = {
  id: number;
  name: string;
};

const ADD_SPECIALTY_OPTION = '__ADD_SPECIALTY__';

const CreateService = () => {
  const navigate = useNavigate();

  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [priceType, setPriceType] = useState<PriceType>('ACTIVITY');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showSpecialtyModal, setShowSpecialtyModal] = useState(false);
  const [newSpecialtyName, setNewSpecialtyName] = useState('');
  const [creatingSpecialty, setCreatingSpecialty] = useState(false);
  const [specialtyError, setSpecialtyError] = useState('');
const formatSpecialtyName = (value: string) => {
  const clean = value
    .trim()
    .replace(/\s+/g, ' ');

  if (!clean) {
    return '';
  }

  return (
    clean.charAt(0).toLocaleUpperCase('es-MX') +
    clean.slice(1).toLocaleLowerCase('es-MX')
  );
};

  const formatCategoryLabel = (value: string) => {
    const withSpaces = value
      .replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .trim();

    if (!withSpaces) {
      return 'Especialidad';
    }

    return (
      withSpaces.charAt(0).toLocaleUpperCase('es-MX') +
      withSpaces.slice(1)
    );
  };

  const selectedCategory = useMemo(
    () =>
      categories.find(
        (category) => String(category.id) === categoryId
      ) || null,
    [categories, categoryId]
  );

  const getCategoryName = () => {
    if (!selectedCategory) {
      return 'Especialidad';
    }

    return formatCategoryLabel(selectedCategory.name);
  };

  const getPriceLabel = () => {
    switch (priceType) {
      case 'HOUR':
        return 'por hora';
      case 'DAY':
        return 'por día';
      default:
        return 'por servicio';
    }
  };

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      setError('');

      // Traemos TODAS las especialidades existentes en FASYN.
      const response = await api.get('/categories');

      const loadedCategories: Category[] =
        response.data?.categories || [];

      setCategories(
        [...loadedCategories].sort((a, b) =>
          formatCategoryLabel(a.name).localeCompare(
            formatCategoryLabel(b.name),
            'es'
          )
        )
      );
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
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openSpecialtyModal = () => {
    setNewSpecialtyName('');
    setSpecialtyError('');
    setShowSpecialtyModal(true);
  };

  const closeSpecialtyModal = () => {
    if (creatingSpecialty) {
      return;
    }

    setShowSpecialtyModal(false);
    setNewSpecialtyName('');
    setSpecialtyError('');
  };

  const handleCategoryChange = (value: string) => {
    if (value === ADD_SPECIALTY_OPTION) {
      openSpecialtyModal();
      return;
    }

    setCategoryId(value);
    setError('');
  };

  const handleCreateSpecialty = async () => {
    const rawName = newSpecialtyName.trim();

    if (rawName.length < 3) {
      setSpecialtyError(
        'Escribe una especialidad de al menos 3 caracteres.'
      );
      return;
    }

const formattedName = formatSpecialtyName(rawName);
    if (!formattedName) {
      setSpecialtyError('Ingresa una especialidad válida.');
      return;
    }

    // Si ya existe en el catálogo, simplemente la seleccionamos.
const existingCategory = categories.find(
  (category) =>
    formatSpecialtyName(category.name).toLocaleLowerCase('es-MX') ===
    formattedName.toLocaleLowerCase('es-MX')
);
    if (existingCategory) {
      setCategoryId(String(existingCategory.id));
      setShowSpecialtyModal(false);
      setNewSpecialtyName('');
      setSpecialtyError('');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      setCreatingSpecialty(true);
      setSpecialtyError('');

      const response = await api.post(
        '/specialists/specialties/new',
        {
          name: formattedName,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const category: Category = response.data.category;

      setCategories((current) => {
        const exists = current.some(
          (item) => item.id === category.id
        );

        const next = exists ? current : [...current, category];

        return [...next].sort((a, b) =>
          formatCategoryLabel(a.name).localeCompare(
            formatCategoryLabel(b.name),
            'es'
          )
        );
      });

      setCategoryId(String(category.id));
      setShowSpecialtyModal(false);
      setNewSpecialtyName('');
      setSpecialtyError('');
    } catch (requestError: any) {
      console.error(
        'ERROR CREANDO ESPECIALIDAD:',
        requestError.response?.data || requestError
      );

      setSpecialtyError(
        requestError.response?.data?.message ||
          'No fue posible agregar la especialidad.'
      );
    } finally {
      setCreatingSpecialty(false);
    }
  };

  const ensureSpecialtyLinked = async (
    token: string,
    category: Category
  ) => {
    /*
      Este endpoint también sirve para asociar una categoría
      existente al especialista. Si ya está asociada, el backend
      simplemente mantiene la relación.
    */
    await api.post(
      '/specialists/specialties/new',
      {
        name: category.name,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  };

  const handlePublish = async () => {
    setError('');

    if (!categoryId || !selectedCategory) {
      setError('Selecciona una especialidad.');
      return;
    }

    if (!name.trim()) {
      setError('Escribe el nombre del servicio.');
      return;
    }

    if (name.trim().length < 3) {
      setError(
        'El nombre del servicio debe tener al menos 3 caracteres.'
      );
      return;
    }

    if (!price || Number(price) <= 0) {
      setError('Ingresa un precio válido.');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      setSaving(true);

      // Si eligió una especialidad ya existente en el catálogo,
      // nos aseguramos de asociarla a su perfil antes de publicar.
      await ensureSpecialtyLinked(token, selectedCategory);

      const response = await api.post(
        '/specialists/services',
        {
          categoryId: Number(categoryId),
          name: name.trim(),
          description: description.trim(),
          price: Number(price),
          priceType,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('SERVICIO CREADO:', response.data);

      navigate('/specialist');
    } catch (requestError: any) {
      console.error(
        'ERROR PUBLICANDO SERVICIO:',
        requestError.response?.data || requestError
      );

      setError(
        requestError.response?.data?.message ||
          'No fue posible publicar el servicio.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="service-create-page">
      <header className="service-create-navbar">
        <button
          type="button"
          className="service-create-logo"
          onClick={() => navigate('/specialist')}
        >
          <img src={logo} alt="FASYN" />
        </button>

        <div className="service-create-navbar-actions">
          <span>Panel del especialista</span>

          <button
            type="button"
            onClick={() => navigate('/specialist')}
          >
            Volver al panel
          </button>
        </div>
      </header>

      <main className="service-create-content">
        <section className="service-create-heading">
          <div>
            <span className="service-create-eyebrow">
              NUEVO SERVICIO
            </span>

            <h1>Publica lo que sabes hacer.</h1>

            <p>
              Elige una especialidad, describe el trabajo que
              realizas y establece la forma en que cobras.
            </p>
          </div>

          <div className="service-create-step">
            <span>01</span>

            <div>
              <strong>Información del servicio</strong>
              <p>Completa los datos para publicarlo.</p>
            </div>
          </div>
        </section>

        <div className="service-create-grid">
          <section className="service-create-form-card">
            <div className="service-form-section">
              <div className="service-form-title">
                <span>01</span>

                <div>
                  <h2>¿Qué servicio ofreces?</h2>
                  <p>
                    Selecciona una especialidad del catálogo o
                    agrega una nueva si todavía no existe.
                  </p>
                </div>
              </div>

              <div className="service-field">
                <div className="service-label-row specialty-label-row">
                  <label>Especialidad</label>

                  {selectedCategory && (
                    <span className="specialty-selected-status">
                      <i /> Seleccionada
                    </span>
                  )}
                </div>

                <div className="specialty-select-wrap">
                  <select
                    value={categoryId}
                    disabled={loadingCategories}
                    onChange={(event) =>
                      handleCategoryChange(event.target.value)
                    }
                  >
                    <option value="">
                      {loadingCategories
                        ? 'Cargando especialidades...'
                        : 'Selecciona una especialidad'}
                    </option>

                    {categories.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {formatCategoryLabel(category.name)}
                      </option>
                    ))}

                    <option value={ADD_SPECIALTY_OPTION}>
                      + Agregar otra especialidad
                    </option>
                  </select>
                </div>

                <div className="specialty-helper-card">
                  <span className="specialty-helper-icon">+</span>

                  <div>
                    <strong>¿No aparece tu especialidad?</strong>
                    <p>
                      Abre el selector y elige “Agregar otra
                      especialidad”.
                    </p>
                  </div>
                </div>
              </div>

              <div className="service-field">
                <label>Nombre del servicio</label>

                <input
                  type="text"
                  maxLength={100}
                  placeholder="Ej. Fabricación de muebles a medida"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />

                <span className="service-field-help">
                  Escribe el trabajo específico que ofreces dentro
                  de la especialidad seleccionada.
                </span>
              </div>

              <div className="service-field">
                <div className="service-label-row">
                  <label>Descripción</label>
                  <span>{description.length}/300</span>
                </div>

                <textarea
                  maxLength={300}
                  placeholder="Describe qué incluye el servicio, qué tipo de trabajos realizas y cualquier detalle que el cliente deba conocer."
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                />
              </div>
            </div>

            <div className="service-form-divider" />

            <div className="service-form-section">
              <div className="service-form-title">
                <span>02</span>

                <div>
                  <h2>Define cómo cobras</h2>
                  <p>
                    Establece un precio inicial y selecciona la
                    modalidad de cobro del servicio.
                  </p>
                </div>
              </div>

              <div className="service-price-grid">
                <div className="service-field">
                  <label>Precio</label>

                  <div className="service-price-input">
                    <span>$</span>

                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="0.00"
                      value={price}
                      onChange={(event) =>
                        setPrice(event.target.value)
                      }
                    />

                    <strong>MXN</strong>
                  </div>
                </div>

                <div className="service-field">
                  <label>Tipo de cobro</label>

                  <select
                    value={priceType}
                    onChange={(event) =>
                      setPriceType(
                        event.target.value as PriceType
                      )
                    }
                  >
                    <option value="ACTIVITY">Por servicio</option>
                    <option value="HOUR">Por hora</option>
                    <option value="DAY">Por día</option>
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div className="service-create-error">{error}</div>
            )}

            <div className="service-create-footer">
              <button
                type="button"
                className="service-cancel-button"
                disabled={saving}
                onClick={() => navigate('/specialist')}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="service-publish-button"
                disabled={saving || loadingCategories}
                onClick={handlePublish}
              >
                {saving ? 'Publicando...' : 'Publicar servicio'}
              </button>
            </div>
          </section>

          <aside className="service-create-sidebar">
            <span className="preview-label">VISTA PREVIA</span>

            <div className="service-preview-card">
              <div className="preview-category">
                {getCategoryName()}
              </div>

              <h3>{name.trim() || 'Nombre de tu servicio'}</h3>

              <p>
                {description.trim() ||
                  'La descripción de tu servicio aparecerá aquí para que el cliente conozca lo que ofreces.'}
              </p>

              <div className="preview-price">
                <div>
                  <span>Desde</span>

                  <strong>
                    {price && Number(price) > 0
                      ? `$${Number(price).toLocaleString('es-MX', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}`
                      : '$0'}
                  </strong>
                </div>

                <span className="preview-price-type">
                  {getPriceLabel()}
                </span>
              </div>
            </div>

            <div className="service-info-card">
              <strong>Tu servicio, a tu manera</strong>

              <p>
                El catálogo te ayuda a mantener FASYN ordenado,
                pero puedes agregar una especialidad cuando aún no
                exista.
              </p>

              <div className="service-info-row">
                <span />
                Todas las especialidades disponibles
              </div>

              <div className="service-info-row">
                <span />
                Puedes agregar una nueva
              </div>

              <div className="service-info-row">
                <span />
                Tú defines servicio y precio
              </div>
            </div>
          </aside>
        </div>
      </main>

      {showSpecialtyModal && (
        <div
          className="specialty-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeSpecialtyModal();
            }
          }}
        >
          <div
            className="specialty-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="specialty-modal-title"
          >
            <div className="specialty-modal-accent" />

            <div className="specialty-modal-header">
              <div>
                <span>NUEVA ESPECIALIDAD</span>
                <h2 id="specialty-modal-title">
                  Agrega lo que sabes hacer
                </h2>
              </div>

              <button
                type="button"
                className="specialty-modal-close"
                disabled={creatingSpecialty}
                onClick={closeSpecialtyModal}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <p className="specialty-modal-description">
              Escribe el nombre normal de la especialidad. Antes de
              guardarla te mostramos cómo quedará en camelCase.
            </p>

            <div className="specialty-modal-field">
              <label htmlFor="new-specialty-name">
                Nombre de la especialidad
              </label>

              <input
                id="new-specialty-name"
                type="text"
                autoFocus
                maxLength={80}
                placeholder="Ej. Aire acondicionado"
                value={newSpecialtyName}
                onChange={(event) => {
                  setNewSpecialtyName(event.target.value);
                  setSpecialtyError('');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleCreateSpecialty();
                  }
                }}
              />

              <span>
                Usa un nombre claro para que otros especialistas y
                clientes puedan identificarla.
              </span>
            </div>

            <div
              className={`specialty-camel-preview ${
                newSpecialtyName.trim() ? 'has-value' : ''
              }`}
            >
              <div className="specialty-camel-icon">Aa</div>

              <div>
                <span>SE GUARDARÁ COMO:</span>
                <strong>
            {newSpecialtyName.trim()
  ? formatSpecialtyName(newSpecialtyName)
  : 'Aire acondicionado'}
                </strong>
              </div>
            </div>

            {specialtyError && (
              <div className="specialty-modal-error">
                {specialtyError}
              </div>
            )}

            <div className="specialty-modal-note">
              <span>i</span>
              <p>
                Si ya existe una especialidad equivalente, FASYN la
                seleccionará en lugar de crear un duplicado.
              </p>
            </div>

            <div className="specialty-modal-actions">
              <button
                type="button"
                className="specialty-modal-cancel"
                disabled={creatingSpecialty}
                onClick={closeSpecialtyModal}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="specialty-modal-save"
                disabled={
                  creatingSpecialty ||
                  newSpecialtyName.trim().length < 3
                }
                onClick={handleCreateSpecialty}
              >
                {creatingSpecialty
                  ? 'Agregando...'
                  : 'Agregar especialidad'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateService;
