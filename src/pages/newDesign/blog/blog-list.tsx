import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Navbar } from '@/components/newDesign/home/navbar';
import { Footer } from '@/components/newDesign/home/footer';
import {
  getPostsPage,
  urlFor,
  CATEGORY_LABELS,
  formatDate,
  type PostListItem,
} from '@/services/sanity';

const PAGE_SIZE = 9;

export function BlogListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const category = searchParams.get('category');

  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    document.title = 'Blog · Screna';
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getPostsPage({ page, pageSize: PAGE_SIZE, category })
      .then((data) => {
        if (cancelled) return;
        setPosts(data.posts ?? []);
        setTotal(data.total ?? 0);
        setCategories((data.categories ?? []).filter(Boolean));
        // Scroll to top on page change so the new page starts at the header.
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, category]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Only show chips for categories that actually have posts (from the schema's
  // fixed set, so ordering/labels stay stable).
  const chips = useMemo(
    () => ['all', ...Object.keys(CATEGORY_LABELS).filter((c) => categories.includes(c))],
    [categories],
  );

  const setParams = (next: { page?: number; category?: string | null }) => {
    const params = new URLSearchParams(searchParams);
    if (next.category !== undefined) {
      if (next.category && next.category !== 'all') params.set('category', next.category);
      else params.delete('category');
    }
    if (next.page !== undefined) {
      if (next.page > 1) params.set('page', String(next.page));
      else params.delete('page');
    }
    setSearchParams(params);
  };

  const goToPage = (p: number) => setParams({ page: p });
  const selectCategory = (c: string) => setParams({ category: c, page: 1 });

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-6xl px-6 pt-28 pb-20">
        {/* Header */}
        <div className="max-w-2xl">
          <h1 className="text-[40px] leading-[1.1] font-semibold tracking-tight text-[#0A0A0A]">
            Blog
          </h1>
          <p className="mt-3 text-[17px] leading-relaxed text-[#5b5f6b]">
            Interview prep, career switches, mentorship, and more from the Screna team.
          </p>
        </div>

        {/* Category filter */}
        {!error && chips.length > 1 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {chips.map((cat) => {
              const active = cat === 'all' ? !category : category === cat;
              return (
                <button
                  key={cat}
                  onClick={() => selectCategory(cat)}
                  className={`h-8 px-3.5 rounded-full text-[13px] font-medium transition-colors ${
                    active
                      ? 'bg-[#2E5BFF] text-white'
                      : 'bg-[#F2F4F8] text-[#4a4d57] hover:bg-[#E7EBF3]'
                  }`}
                >
                  {cat === 'all' ? 'All' : CATEGORY_LABELS[cat] ?? cat}
                </button>
              );
            })}
          </div>
        )}

        {/* States */}
        {loading && (
          <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-video w-full rounded-xl bg-[#EEF1F5]" />
                <div className="mt-4 h-3 w-24 rounded bg-[#EEF1F5]" />
                <div className="mt-3 h-5 w-full rounded bg-[#EEF1F5]" />
                <div className="mt-2 h-4 w-3/4 rounded bg-[#EEF1F5]" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-16 text-center">
            <p className="text-[#5b5f6b]">Couldn't load posts right now. Please try again later.</p>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="mt-16 text-center">
            <p className="text-[#5b5f6b]">No published posts yet. Check back soon.</p>
          </div>
        )}

        {!loading && !error && posts.length > 0 && (
          <>
            <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, i) => (
                <motion.div
                  key={post._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link to={`/blog/${post.slug}`} className="group block">
                    {post.cover?.asset?._ref ? (
                      <img
                        src={urlFor(post.cover).width(800).height(450).fit('crop').url()}
                        alt={post.cover.alt ?? post.title ?? ''}
                        width={800}
                        height={450}
                        loading="lazy"
                        className="aspect-video w-full rounded-xl object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                      />
                    ) : (
                      <div className="aspect-video w-full rounded-xl bg-gradient-to-br from-[#EEF2FF] to-[#E7EBF3]" />
                    )}
                    <div className="mt-4">
                      {post.category && (
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2E5BFF]">
                          {CATEGORY_LABELS[post.category] ?? post.category}
                        </span>
                      )}
                      <h2 className="mt-1.5 text-[19px] font-semibold leading-snug text-[#0A0A0A] group-hover:text-[#2E5BFF] transition-colors">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="mt-2 text-[14px] leading-relaxed text-[#5b5f6b] line-clamp-3">
                          {post.excerpt}
                        </p>
                      )}
                      <p className="mt-3 text-[12px] text-[#8a8f9a]">
                        {[
                          post.author?.name,
                          post.author?.role,
                          post.publishedAt ? formatDate(post.publishedAt) : '',
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="mt-14 flex items-center justify-center gap-1.5" aria-label="Pagination">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-[#4a4d57] hover:bg-[#F2F4F8] disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    aria-current={p === page ? 'page' : undefined}
                    className={`inline-flex items-center justify-center h-9 min-w-9 px-3 rounded-lg text-[14px] font-medium transition-colors ${
                      p === page
                        ? 'bg-[#2E5BFF] text-white'
                        : 'text-[#4a4d57] hover:bg-[#F2F4F8]'
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-[#4a4d57] hover:bg-[#F2F4F8] disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </nav>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
