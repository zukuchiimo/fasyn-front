import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import { api } from '../../api/api';
import logo from '../../assets/logo.png';

import './AdminCategories.css';

interface CategorySpecialist {
  specialistId: number;
  categoryId: number;

  specialist?: {
    id: number;
    user?: {
      id: number;
      name: string;
      email: string;
    };
  };
}

interface CategoryService {
  id: number;
  name: string;
  description?: string | null;
  price: string;
  priceType: string;
  active: boolean;

  specialist?: {
    id: number;
    user?: {
      id: number;
      name: string;
      email: string;
    };
  };
}

interface Category {
  id: number;
  name: string;
  description?: string | null;
  createdAt: string;

  specialists: CategorySpecialist[];
  services: CategoryService[];
}

interface CategoryForm {
  name: string;
  description: string;
}

const EMPTY_FORM: CategoryForm = {
  name: '',
  description: '',
};

const AdminCategories = () => {
  const navigate = useNavigate();

  const token =
    localStorage.getItem('token');

  const userRaw =
    localStorage.getItem('user');

  const [
    categories,
    setCategories,
  ] = useState<Category[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('');

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState<Category | null>(
    null
  );

  const [
    editingCategory,
    setEditingCategory,
  ] = useState<Category | null>(
    null
  );

  const [
    deletingCategory,
    setDeletingCategory,
  ] = useState<Category | null>(
    null
  );

  const [
    showCreateModal,
    setShowCreateModal,
  ] = useState(false);

  const [
    form,
    setForm,
  ] = useState<CategoryForm>(
    EMPTY_FORM
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const currentUser =
    useMemo(() => {
      try {
        return userRaw
          ? JSON.parse(userRaw)
          : null;
      } catch {
        return null;
      }
    }, [userRaw]);

  /*
    CARGAR CATEGORÍAS
  */
  const loadCategories =
    useCallback(async () => {
      try {
        setLoading(true);
        setError('');

        if (!token) {
          navigate('/login');
          return;
        }

        const response =
          await api.get(
            '/admin/categories',
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        console.log(
          'ADMIN CATEGORIES:',
          response.data
        );

        setCategories(
          response.data
            ?.categories || []
        );
      } catch (err: any) {
        console.error(
          'GET ADMIN CATEGORIES ERROR:',
          err
        );

        if (
          err?.response?.status === 401
        ) {
          localStorage.removeItem(
            'token'
          );

          localStorage.removeItem(
            'user'
          );

          navigate('/login');
          return;
        }

        if (
          err?.response?.status === 403
        ) {
          setError(
            'No tienes permisos para consultar las categorías.'
          );

          return;
        }

        setError(
          err?.response?.data
            ?.message ||
            'No fue posible consultar las categorías.'
        );
      } finally {
        setLoading(false);
      }
    }, [
      navigate,
      token,
    ]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  /*
    OCULTAR MENSAJE DE ÉXITO
  */
  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setSuccessMessage('');
        },
        3500
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [successMessage]);

  /*
    ESTADÍSTICAS
  */
  const stats =
    useMemo(() => {
      const total =
        categories.length;

      const services =
        categories.reduce(
          (
            accumulator,
            category
          ) =>
            accumulator +
            (
              category.services ||
              []
            ).length,
          0
        );

      const activeServices =
        categories.reduce(
          (
            accumulator,
            category
          ) =>
            accumulator +
            (
              category.services ||
              []
            ).filter(
              (service) =>
                service.active
            ).length,
          0
        );

      const specialists =
        new Set(
          categories.flatMap(
            (category) =>
              (
                category.specialists ||
                []
              ).map(
                (item) =>
                  item.specialistId
              )
          )
        ).size;

      return {
        total,
        services,
        activeServices,
        specialists,
      };
    }, [categories]);

  /*
    FILTRO
  */
  const filteredCategories =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      if (!value) {
        return categories;
      }

      return categories.filter(
        (category) => {
          const services =
            (
              category.services ||
              []
            )
              .map(
                (service) =>
                  service.name
              )
              .join(' ');

          const searchable = [
            category.name,
            category.description,
            services,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return searchable.includes(
            value
          );
        }
      );
    }, [
      categories,
      search,
    ]);

  /*
    NUEVA CATEGORÍA
  */
  const openCreate = () => {
    setError('');

    setForm(
      EMPTY_FORM
    );

    setShowCreateModal(
      true
    );
  };

  /*
    EDITAR
  */
  const openEdit = (
    category: Category
  ) => {
    setError('');

    setForm({
      name:
        category.name || '',

      description:
        category.description ||
        '',
    });

    setEditingCategory(
      category
    );
  };

  const handleInputChange = (
    event:
      React.ChangeEvent<
        HTMLInputElement |
        HTMLTextAreaElement
      >
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  };

  /*
    CREAR
  */
  const handleCreate =
    async (
      event:
        React.FormEvent
    ) => {
      event.preventDefault();

      if (
        !form.name.trim()
      ) {
        setError(
          'El nombre de la categoría es obligatorio.'
        );

        return;
      }

      try {
        setSaving(true);
        setError('');

        await api.post(
          '/admin/categories',
          {
            name:
              form.name.trim(),

            description:
              form.description
                .trim() ||
              null,
          },
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        setShowCreateModal(
          false
        );

        setForm(
          EMPTY_FORM
        );

        setSuccessMessage(
          'Categoría creada correctamente.'
        );

        await loadCategories();
      } catch (err: any) {
        console.error(
          'CREATE CATEGORY ERROR:',
          err
        );

        setError(
          err?.response?.data
            ?.message ||
            'No fue posible crear la categoría.'
        );
      } finally {
        setSaving(false);
      }
    };

  /*
    ACTUALIZAR
  */
  const handleUpdate =
    async (
      event:
        React.FormEvent
    ) => {
      event.preventDefault();

      if (
        !editingCategory
      ) {
        return;
      }

      if (
        !form.name.trim()
      ) {
        setError(
          'El nombre de la categoría es obligatorio.'
        );

        return;
      }

      try {
        setSaving(true);
        setError('');

        await api.patch(
          `/admin/categories/${editingCategory.id}`,
          {
            name:
              form.name.trim(),

            description:
              form.description
                .trim() ||
              null,
          },
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        setEditingCategory(
          null
        );

        setForm(
          EMPTY_FORM
        );

        setSuccessMessage(
          'Categoría actualizada correctamente.'
        );

        await loadCategories();
      } catch (err: any) {
        console.error(
          'UPDATE CATEGORY ERROR:',
          err
        );

        setError(
          err?.response?.data
            ?.message ||
            'No fue posible actualizar la categoría.'
        );
      } finally {
        setSaving(false);
      }
    };

  /*
    ELIMINAR
  */
  const handleDelete =
    async () => {
      if (
        !deletingCategory
      ) {
        return;
      }

      try {
        setDeleting(true);
        setError('');

        await api.delete(
          `/admin/categories/${deletingCategory.id}`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        setDeletingCategory(
          null
        );

        setSuccessMessage(
          'Categoría eliminada correctamente.'
        );

        await loadCategories();
      } catch (err: any) {
        console.error(
          'DELETE CATEGORY ERROR:',
          err
        );

        setError(
          err?.response?.data
            ?.message ||
            'No fue posible eliminar la categoría.'
        );
      } finally {
        setDeleting(false);
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

  const formatDate = (
    date: string
  ) => {
    if (!date) {
      return '--';
    }

    return new Intl.DateTimeFormat(
      'es-MX',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    ).format(
      new Date(date)
    );
  };

  const formatMoney = (
    value?: string
  ) => {
    const amount =
      Number(value ?? 0);

    return new Intl.NumberFormat(
      'es-MX',
      {
        style: 'currency',
        currency: 'MXN',
      }
    ).format(
      Number.isNaN(amount)
        ? 0
        : amount
    );
  };

  return (
    <div className="admin-page">

      {/* SIDEBAR */}

      <aside className="admin-sidebar">

        <div>

          <div className="admin-brand">

            <img
              src={logo}
              alt="FASYN"
            />

            <div>
              <strong>
                FASYN
              </strong>

              <span>
                ADMIN
              </span>
            </div>

          </div>

          <nav className="admin-menu">

            <button
              type="button"
              onClick={() =>
                navigate('/admin')
              }
            >
              <span>⌂</span>
              Resumen
            </button>

            <button
              type="button"
              onClick={() =>
                navigate('/admin')
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
              className="active"
            >
              <span>▦</span>
              Categorías
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
            <span>↪</span>
            Cerrar sesión
          </button>

        </div>

      </aside>

      {/* CONTENIDO */}

      <main className="admin-content">

        <header className="admin-header">

          <div>

            <span className="admin-eyebrow">
              PANEL DE CONTROL
            </span>

            <h1>
              Categorías
            </h1>

            <p>
              Administra las categorías
              de servicios disponibles
              en FASYN.
            </p>

          </div>

          <div className="admin-user">

            <div className="admin-user-avatar">
              {currentUser
                ?.name
                ?.charAt(0)
                ?.toUpperCase() ||
                'A'}
            </div>

            <div>

              <strong>
                {currentUser
                  ?.name ||
                  'Administrador'}
              </strong>

              <span>
                Administrador
              </span>

            </div>

          </div>

        </header>

        {/* ESTADÍSTICAS */}

        <section className="category-stats">

          <article>
            <span>
              CATEGORÍAS
            </span>

            <strong>
              {stats.total}
            </strong>

            <small>
              Registradas
            </small>
          </article>

          <article>
            <span>
              SERVICIOS
            </span>

            <strong>
              {stats.services}
            </strong>

            <small>
              Asociados
            </small>
          </article>

          <article>
            <span>
              SERVICIOS ACTIVOS
            </span>

            <strong>
              {stats.activeServices}
            </strong>

            <small>
              Publicados
            </small>
          </article>

          <article>
            <span>
              ESPECIALISTAS
            </span>

            <strong>
              {stats.specialists}
            </strong>

            <small>
              Con especialidad
            </small>
          </article>

        </section>

        {successMessage && (
          <div className="admin-success-message">
            <span>✓</span>
            {successMessage}
          </div>
        )}

        {error && (
          <div className="admin-error-message">
            {error}
          </div>
        )}

        {/* PANEL */}

        <section className="categories-panel">

          <div className="categories-panel-header">

            <div>

              <span className="admin-eyebrow">
                CATÁLOGO
              </span>

              <h2 style={{ marginTop: 0,color: '#333' }}>
                Categorías registradas
              </h2>

              <p>
                Consulta y administra
                las categorías de
                servicios.
              </p>

            </div>

            <button
              type="button"
              className="category-create-button"
              onClick={openCreate}
            >
              + Nueva categoría
            </button>

          </div>

          <div className="categories-toolbar">

            <div className="categories-search">

              <span>⌕</span>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Buscar categoría o servicio..."
              />

            </div>

            <span className="categories-result-count">
              {filteredCategories.length}{' '}
              resultado
              {filteredCategories.length !==
              1
                ? 's'
                : ''}
            </span>

          </div>

          {loading ? (

            <div className="categories-state">

              <div className="admin-loader" />

              <h3>
                Cargando categorías
              </h3>

              <p>
                Estamos consultando
                la información.
              </p>

            </div>

          ) : filteredCategories
              .length === 0 ? (

            <div className="categories-state">

              <div className="categories-empty-icon">
                ▦
              </div>

              <h3>
                No encontramos
                categorías
              </h3>

              <p>
                Crea una categoría
                nueva o cambia tu
                búsqueda.
              </p>

            </div>

          ) : (

            <div className="categories-grid">

              {filteredCategories.map(
                (category) => {

                  const services =
                    category.services ||
                    [];

                  const activeServices =
                    services.filter(
                      (service) =>
                        service.active
                    ).length;

                  return (
                    <article
                      className="category-card"
                      key={
                        category.id
                      }
                    >

                      <div className="category-card-header">

                        <div className="category-icon">
                          {category.name
                            ?.charAt(0)
                            ?.toUpperCase() ||
                            'C'}
                        </div>

                        <div className="category-card-title">

                          <span>
                            CATEGORÍA #
                            {category.id}
                          </span>

                          <h3>
                            {category.name}
                          </h3>

                        </div>

                      </div>

                      <p className="category-description">
                        {category.description ||
                          'Sin descripción registrada.'}
                      </p>

                      <div className="category-card-stats">

                        <div>
                          <strong>
                            {
                              services.length
                            }
                          </strong>

                          <span>
                            Servicios
                          </span>
                        </div>

                        <div>
                          <strong>
                            {
                              activeServices
                            }
                          </strong>

                          <span>
                            Activos
                          </span>
                        </div>

                        <div>
                          <strong>
                            {
                              (
                                category.specialists ||
                                []
                              ).length
                            }
                          </strong>

                          <span>
                            Especialistas
                          </span>
                        </div>

                      </div>

                      <div className="category-created">
                        Registrada el{' '}
                        {formatDate(
                          category.createdAt
                        )}
                      </div>

                      <div className="category-actions">

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCategory(
                              category
                            )
                          }
                        >
                          Ver
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openEdit(
                              category
                            )
                          }
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="delete"
                          onClick={() =>
                            setDeletingCategory(
                              category
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

        </section>

      </main>

      {/* DETALLE */}

      {selectedCategory && (

        <div
          className="admin-modal-backdrop"
          onMouseDown={() =>
            setSelectedCategory(
              null
            )
          }
        >

          <div
            className="admin-modal category-detail-modal"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >

            <div className="admin-modal-header">

              <div>

                <span className="admin-eyebrow">
                  DETALLE DE CATEGORÍA
                </span>

                <h2>
                  {
                    selectedCategory.name
                  }
                </h2>

                <p>
                  {
                    selectedCategory.description ||
                    'Sin descripción'
                  }
                </p>

              </div>

              <button
                type="button"
                className="admin-modal-close"
                onClick={() =>
                  setSelectedCategory(
                    null
                  )
                }
              >
                ×
              </button>

            </div>

            <div className="admin-modal-body">

              <div className="category-detail-grid">

                <div>
                  <span>
                    ID
                  </span>

                  <strong>
                    #
                    {
                      selectedCategory.id
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    REGISTRO
                  </span>

                  <strong>
                    {formatDate(
                      selectedCategory.createdAt
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    SERVICIOS
                  </span>

                  <strong>
                    {
                      selectedCategory
                        .services
                        ?.length
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    ESPECIALISTAS
                  </span>

                  <strong>
                    {
                      selectedCategory
                        .specialists
                        ?.length
                    }
                  </strong>
                </div>

              </div>

              <div className="category-detail-section">

                <span className="admin-eyebrow">
                  SERVICIOS
                </span>

                <h3>
                  Servicios asociados
                </h3>

                {!selectedCategory
                  .services?.length ? (

                  <div className="category-no-services">
                    No existen servicios
                    asociados a esta
                    categoría.
                  </div>

                ) : (

                  <div className="category-services-list">

                    {selectedCategory
                      .services
                      .map(
                        (service) => (

                          <article
                            key={
                              service.id
                            }
                          >

                            <div>

                              <strong>
                                {
                                  service.name
                                }
                              </strong>

                              <span>
                                {service
                                  .specialist
                                  ?.user
                                  ?.name ||
                                  'Sin especialista'}
                              </span>

                            </div>

                            <div className="category-service-price">

                              <strong>
                                {formatMoney(
                                  service.price
                                )}
                              </strong>

                              <span>
                                {
                                  service.priceType
                                }
                              </span>

                            </div>

                          </article>

                        )
                      )}

                  </div>

                )}

              </div>

            </div>

            <div className="admin-modal-footer">

              <button
                type="button"
                className="modal-secondary-button"
                onClick={() =>
                  setSelectedCategory(
                    null
                  )
                }
              >
                Cerrar
              </button>

              <button
                type="button"
                className="modal-primary-button"
                onClick={() => {
                  const category =
                    selectedCategory;

                  setSelectedCategory(
                    null
                  );

                  openEdit(
                    category
                  );
                }}
              >
                Editar categoría
              </button>

            </div>

          </div>

        </div>

      )}

      {/* CREAR */}

      {showCreateModal && (

        <div className="admin-modal-backdrop">

          <div className="admin-modal category-form-modal">

            <div className="admin-modal-header">

              <div>

                <span className="admin-eyebrow">
                  NUEVA CATEGORÍA
                </span>

                <h2>
                  Crear categoría
                </h2>

                <p>
                  Registra una nueva
                  categoría de servicio.
                </p>

              </div>

              <button
                type="button"
                className="admin-modal-close"
                disabled={saving}
                onClick={() =>
                  setShowCreateModal(
                    false
                  )
                }
              >
                ×
              </button>

            </div>

            <form
              onSubmit={
                handleCreate
              }
            >

              <div className="admin-modal-body">

                <div className="category-form">

                  <label>

                    <span>
                      Nombre
                    </span>

                    <input
                      type="text"
                      name="name"
                      value={
                        form.name
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="Ej. Carpintería"
                      required
                    />

                  </label>

                  <label>

                    <span>
                      Descripción
                    </span>

                    <textarea
                      name="description"
                      value={
                        form.description
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="Descripción de la categoría..."
                      rows={4}
                    />

                  </label>

                </div>

              </div>

              <div className="admin-modal-footer">

                <button
                  type="button"
                  className="modal-secondary-button"
                  disabled={saving}
                  onClick={() =>
                    setShowCreateModal(
                      false
                    )
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="modal-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Guardando...'
                    : 'Crear categoría'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* EDITAR */}

      {editingCategory && (

        <div className="admin-modal-backdrop">

          <div className="admin-modal category-form-modal">

            <div className="admin-modal-header">

              <div>

                <span className="admin-eyebrow">
                  EDITAR CATEGORÍA
                </span>

                <h2>
                  {
                    editingCategory.name
                  }
                </h2>

              </div>

              <button
                type="button"
                className="admin-modal-close"
                disabled={saving}
                onClick={() =>
                  setEditingCategory(
                    null
                  )
                }
              >
                ×
              </button>

            </div>

            <form
              onSubmit={
                handleUpdate
              }
            >

              <div className="admin-modal-body">

                <div className="category-form">

                  <label>

                    <span>
                      Nombre
                    </span>

                    <input
                      type="text"
                      name="name"
                      value={
                        form.name
                      }
                      onChange={
                        handleInputChange
                      }
                      required
                    />

                  </label>

                  <label>

                    <span>
                      Descripción
                    </span>

                    <textarea
                      name="description"
                      value={
                        form.description
                      }
                      onChange={
                        handleInputChange
                      }
                      rows={4}
                    />

                  </label>

                </div>

              </div>

              <div className="admin-modal-footer">

                <button
                  type="button"
                  className="modal-secondary-button"
                  disabled={saving}
                  onClick={() =>
                    setEditingCategory(
                      null
                    )
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="modal-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Guardando...'
                    : 'Guardar cambios'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* ELIMINAR */}

      {deletingCategory && (

        <div className="admin-modal-backdrop">

          <div className="admin-modal admin-confirm-modal">

            <div className="confirm-icon danger">
              !
            </div>

            <h2>
              Eliminar categoría
            </h2>

            <p>
              Estás por eliminar{' '}
              <strong>
                {
                  deletingCategory.name
                }
              </strong>.
            </p>

            {(deletingCategory
              .services?.length >
              0 ||
              deletingCategory
                .specialists
                ?.length >
              0) && (

              <div className="delete-warning">
                Esta categoría tiene
                servicios o especialistas
                relacionados. El servidor
                puede impedir su
                eliminación.
              </div>

            )}

            <div className="confirm-actions">

              <button
                type="button"
                className="modal-secondary-button"
                disabled={deleting}
                onClick={() =>
                  setDeletingCategory(
                    null
                  )
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="modal-danger-button"
                disabled={deleting}
                onClick={
                  handleDelete
                }
              >
                {deleting
                  ? 'Eliminando...'
                  : 'Eliminar'}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
};

export default AdminCategories;