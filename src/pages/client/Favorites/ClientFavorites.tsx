import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import { api } from '../../../api/api';
import logo from '../../../assets/logo.png';

import '../ClientProfile.css';
import './ClientFavorites.css';

type ClientProfile = {
  id: number;
  name: string;
  email: string;
  profilePhotoUrl?: string | null;
};

type FavoriteSpecialist = {
  id: number;

  profilePhotoUrl?: string | null;

  user: {
    id: number;
    name: string;
    profilePhotoUrl?: string | null;
  };

  description?: string | null;
  experience?: number | null;

  state?: string | null;
  municipality?: string | null;

  specialties?: {
    category: {
      id: number;
      name: string;
    };
  }[];
};
const ClientFavorites = () => {
  const navigate =
    useNavigate();

  const token =
    localStorage.getItem('token');

  const [
    profile,
    setProfile,
  ] =
    useState<ClientProfile | null>(
      null
    );

  const [
    favorites,
    setFavorites,
  ] =
    useState<FavoriteSpecialist[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  const initials =
    useMemo(() => {
      const name =
        profile?.name ||
        'Cliente';

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
    }, [profile]);

  const resolveStoredFileUrl = (
    fileUrl?: string | null
  ) => {
    if (!fileUrl) {
      return '';
    }

    if (
      /^https?:\/\//i.test(
        fileUrl
      )
    ) {
      return fileUrl;
    }

    const apiBaseUrl =
      api.defaults.baseURL ||
      'http://localhost:3000/api';

    const apiOrigin =
      apiBaseUrl
        .replace(
          /\/api\/?$/,
          ''
        )
        .replace(
          /\/$/,
          ''
        );

    return `${apiOrigin}${
      fileUrl.startsWith('/')
        ? ''
        : '/'
    }${fileUrl}`;
  };

  const loadFavorites =
    async () => {
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        setError('');

        const [
          favoritesResponse,
          profileResponse,
        ] =
          await Promise.all([
            api.get(
              '/favorites',
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            ),

            api.get(
              '/clients/profile',
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            ),
          ]);

        setFavorites(
          favoritesResponse
            .data
            ?.favorites ||
            []
        );

        setProfile(
          profileResponse
            .data
            ?.profile ||
            null
        );
      } catch (
        requestError: any
      ) {
        console.error(
          'ERROR FAVORITOS:',
          requestError
        );

        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
            'No fue posible cargar tus favoritos.'
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadFavorites();
  }, []);

  const removeFavorite =
    async (
      specialistId: number
    ) => {
      if (!token) {
        return;
      }

      try {
        await api.delete(
          `/favorites/${specialistId}`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        setFavorites(
          (current) =>
            current.filter(
              (item) =>
                item.id !==
                specialistId
            )
        );
      } catch (
        requestError: any
      ) {
        alert(
          requestError
            ?.response
            ?.data
            ?.message ||
            'No fue posible eliminar el favorito.'
        );
      }
    };

const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');

  window.location.replace('/login');
};
  if (loading) {
    return (
      <div className="client-profile-loading">

        <div className="client-profile-spinner" />

        <strong>
          Cargando favoritos
        </strong>

        <span>
          Estamos buscando tus especialistas guardados.
        </span>

      </div>
    );
  }

  return (
    <div className="client-dashboard">

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
            alt="FEISIN"
          />
        </button>

        <div className="client-user">

          <div
            className="client-avatar"
            style={{
              overflow:
                'hidden',
            }}
          >
            {profile
              ?.profilePhotoUrl ? (
              <img
                src={
                  resolveStoredFileUrl(
                    profile
                      .profilePhotoUrl
                  )
                }
                alt={
                  profile.name
                }
                style={{
                  width:
                    '100%',
                  height:
                    '100%',
                  objectFit:
                    'cover',
                }}
              />
            ) : (
              initials
            )}
          </div>

          <div className="client-user-info">

            <strong>
              {profile?.name ||
                'Cliente'}
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
              navigate(
                '/client/requests'
              )
            }
          >
            <span>◉</span>
            Mis solicitudes
          </button>

          <button
            type="button"
            className="active"
          >
            <span>♥</span>
            Favoritos
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(
                '/client/history'
              )
            }
          >
            <span>✓</span>
            Historial
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(
                '/client/profile'
              )
            }
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
            ← Volver a FEISIN
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

      <main className="client-main">

        <header className="client-header">

          <div>

            <span className="client-eyebrow">
              PANEL DEL CLIENTE
            </span>

            <h1>
              Mis favoritos
            </h1>

            <p>
              Guarda especialistas para encontrarlos
              fácilmente cuando vuelvas a necesitar
              sus servicios.
            </p>

          </div>

          <button
            type="button"
            className="find-specialist-button"
            onClick={() =>
              navigate(
                '/specialists'
              )
            }
          >
            <span>＋</span>
            Buscar especialistas
          </button>

        </header>

        {error && (
          <div className="client-profile-message error">
            {error}
          </div>
        )}

        {favorites.length === 0 ? (

          <section className="favorites-empty">

            <div className="favorites-empty-icon">
              ♡
            </div>

            <h2>
              Aún no tienes favoritos
            </h2>

            <p>
              Cuando encuentres un especialista que
              te interese, agrégalo a favoritos para
              tenerlo siempre a la mano.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/specialists'
                )
              }
            >
              Buscar especialistas
            </button>

          </section>

        ) : (

          <section className="favorites-container">

            <div className="favorites-header">

              <div>
                <span className="client-section-eyebrow">
                  GUARDADOS
                </span>

                <h2>
                  Especialistas favoritos
                </h2>

                <p>
                  Tienes {favorites.length}{' '}
                  {favorites.length === 1
                    ? 'especialista guardado'
                    : 'especialistas guardados'}.
                </p>
              </div>

            </div>

    <div className="favorites-grid">

  {favorites.map(
    (specialist) => {

      const profilePhotoUrl =
        specialist
          .user
          ?.profilePhotoUrl ||
        specialist
          .profilePhotoUrl;

      return (
        <article
          key={specialist.id}
          className="favorite-card"
        >

          <button
            type="button"
            className="favorite-remove"
            title="Eliminar de favoritos"
            onClick={() =>
              removeFavorite(
                specialist.id
              )
            }
          >
            ♥
          </button>

          <div className="favorite-avatar">

            {profilePhotoUrl ? (

              <img
                src={
                  resolveStoredFileUrl(
                    profilePhotoUrl
                  )
                }
                alt={
                  specialist
                    .user
                    .name
                }
                onError={(event) => {
                  console.error(
                    'ERROR FOTO FAVORITO:',
                    profilePhotoUrl,
                    event.currentTarget.src
                  );
                }}
              />

            ) : (

              specialist
                .user
                .name
                .charAt(0)
                .toUpperCase()

            )}

          </div>

          <div className="favorite-info">

            <span className="favorite-label">
              ESPECIALISTA
            </span>

            <h3>
              {
                specialist
                  .user
                  .name
              }
            </h3>

            {specialist
              .experience !==
              null &&
              specialist
                .experience !==
                undefined && (

              <span className="favorite-experience">
                {
                  specialist
                    .experience
                }{' '}
                {specialist
                  .experience === 1
                  ? 'año'
                  : 'años'}{' '}
                de experiencia
              </span>

            )}

            {specialist
              .description && (

              <p>
                {
                  specialist
                    .description
                }
              </p>

            )}

          </div>

          <div className="favorite-actions">

            <button
              type="button"
              className="favorite-profile-button"
              onClick={() =>
                navigate(
                  `/specialists/${specialist.id}`
                )
              }
            >
              Ver perfil
            </button>

          </div>

        </article>
      );
    }
  )}

</div>
          </section>

        )}

      </main>

    </div>
  );
};

export default ClientFavorites;