import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import API from '@/services/api';

export function RefRedirect() {
  const { slug } = useParams<{ slug: string }>();

  useEffect(() => {
    const target = slug
      ? `${window.location.origin}/register?ref=${encodeURIComponent(slug)}`
      : `${window.location.origin}/register`;

    if (!slug) {
      window.location.replace(target);
      return;
    }

    API.get(`/pgs/ref/${encodeURIComponent(slug)}`)
      .catch(() => {})
      .finally(() => {
        window.location.replace(target);
      });
  }, [slug]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        color: '#6B7280',
        fontSize: 14,
      }}
    >
      Redirecting…
    </div>
  );
}
