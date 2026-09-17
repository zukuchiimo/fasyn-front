import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { api } from '../../api/api';
import logo from '../../assets/logo.png';

import './CreateService.css';

const CreateService = () => {
  const navigate = useNavigate();

  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [priceType, setPriceType] = useState('ACTIVITY');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  const getCategoryName = () => {
    switch (categoryId) {
      case '1':
        return 'Carpintería';

      case '2':
        return 'Plomería';

      default:
        return 'Especialidad';
    }
  };

  const handlePublish = async () => {
    try {
      setSaving(true);
      setError('');

      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      if (!categoryId) {
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

      const response = await api.post(
        '/specialists/services',
        {
          categoryId: Number(categoryId),

          /*
            El nombre NO necesita existir previamente.
            El especialista puede escribir cualquier
            servicio relacionado con su especialidad.
          */
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

      console.log(
        'SERVICIO CREADO:',
        response.data
      );

      navigate('/specialist');

    } catch (error: any) {
      console.error(
        'ERROR PUBLICANDO SERVICIO:',
        error.response?.data || error
      );

      setError(
        error.response?.data?.message ||
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
          <img
            src={logo}
            alt="FASYN"
          />
        </button>

        <div className="service-create-navbar-actions">

          <span>
            Panel del especialista
          </span>

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

            <h1>
              Publica lo que sabes hacer.
            </h1>

            <p>
              Crea un servicio dentro de una de tus
              especialidades, define cómo trabajas y establece
              tu precio.
            </p>

          </div>

          <div className="service-create-step">

            <span>
              01
            </span>

            <div>
              <strong>
                Información del servicio
              </strong>

              <p>
                Completa los datos para publicarlo.
              </p>
            </div>

          </div>

        </section>

        <div className="service-create-grid">

          <section className="service-create-form-card">

            <div className="service-form-section">

              <div className="service-form-title">

                <span>
                  01
                </span>

                <div>

                  <h2>
                    ¿Qué servicio ofreces?
                  </h2>

                  <p>
                    Selecciona tu especialidad y describe
                    específicamente el trabajo que realizas.
                  </p>

                </div>

              </div>

              <div className="service-field">

                <label>
                  Especialidad
                </label>

                <select
                  value={categoryId}
                  onChange={(e) =>
                    setCategoryId(e.target.value)
                  }
                >

                  <option value="">
                    Selecciona una especialidad
                  </option>

                  <option value="1">
                    Carpintería
                  </option>

                  <option value="2">
                    Plomería
                  </option>

                </select>

                <span className="service-field-help">
                  La especialidad debe estar registrada
                  previamente en tu perfil profesional.
                </span>

              </div>

              <div className="service-field">

                <label>
                  Nombre del servicio
                </label>

                <input
                  type="text"
                  maxLength={100}
                  placeholder="Ej. Fabricación de muebles a medida"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                />

                <span className="service-field-help">
                  Escribe exactamente el servicio que ofreces.
                  No necesita existir previamente en FASYN.
                </span>

              </div>

              <div className="service-field">

                <div className="service-label-row">

                  <label>
                    Descripción
                  </label>

                  <span>
                    {description.length}/300
                  </span>

                </div>

                <textarea
                  maxLength={300}
                  placeholder="Describe qué incluye el servicio, qué tipo de trabajos realizas y cualquier detalle que el cliente deba conocer."
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                />

              </div>

            </div>

            <div className="service-form-divider" />

            <div className="service-form-section">

              <div className="service-form-title">

                <span>
                  02
                </span>

                <div>

                  <h2>
                    Define cómo cobras
                  </h2>

                  <p>
                    Establece un precio inicial y selecciona
                    la modalidad de cobro del servicio.
                  </p>

                </div>

              </div>

              <div className="service-price-grid">

                <div className="service-field">

                  <label>
                    Precio
                  </label>

                  <div className="service-price-input">

                    <span>
                      $
                    </span>

                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="0.00"
                      value={price}
                      onChange={(e) =>
                        setPrice(e.target.value)
                      }
                    />

                    <strong>
                      MXN
                    </strong>

                  </div>

                </div>

                <div className="service-field">

                  <label>
                    Tipo de cobro
                  </label>

                  <select
                    value={priceType}
                    onChange={(e) =>
                      setPriceType(e.target.value)
                    }
                  >

                    <option value="ACTIVITY">
                      Por servicio
                    </option>

                    <option value="HOUR">
                      Por hora
                    </option>

                    <option value="DAY">
                      Por día
                    </option>

                  </select>

                </div>

              </div>

            </div>

            {error && (
              <div className="service-create-error">
                {error}
              </div>
            )}

            <div className="service-create-footer">

              <button
                type="button"
                className="service-cancel-button"
                disabled={saving}
                onClick={() =>
                  navigate('/specialist')
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="service-publish-button"
                disabled={saving}
                onClick={handlePublish}
              >
                {saving
                  ? 'Publicando...'
                  : 'Publicar servicio'}
              </button>

            </div>

          </section>

          <aside className="service-create-sidebar">

            <span className="preview-label">
              VISTA PREVIA
            </span>

            <div className="service-preview-card">

              <div className="preview-category">
                {getCategoryName()}
              </div>

              <h3>
                {name.trim() ||
                  'Nombre de tu servicio'}
              </h3>

              <p>
                {description.trim() ||
                  'La descripción de tu servicio aparecerá aquí para que el cliente conozca lo que ofreces.'}
              </p>

              <div className="preview-price">

                <div>

                  <span>
                    Desde
                  </span>

                  <strong>
                    {price && Number(price) > 0
                      ? `$${Number(
                          price
                        ).toLocaleString(
                          'es-MX',
                          {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          }
                        )}`
                      : '$0'}
                  </strong>

                </div>

                <span className="preview-price-type">
                  {getPriceLabel()}
                </span>

              </div>

            </div>

            <div className="service-info-card">

              <strong>
                Tu servicio, a tu manera
              </strong>

              <p>
                Puedes publicar servicios específicos
                aunque todavía no existan dentro de FASYN.
                Solo deben corresponder a una de tus
                especialidades.
              </p>

              <div className="service-info-row">
                <span />
                Nombre de servicio libre
              </div>

              <div className="service-info-row">
                <span />
                Tú estableces el precio
              </div>

              <div className="service-info-row">
                <span />
                Puedes editarlo posteriormente
              </div>

            </div>

          </aside>

        </div>

      </main>

    </div>
  );
};

export default CreateService;