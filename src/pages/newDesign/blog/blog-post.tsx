import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Navbar } from '@/components/newDesign/home/navbar';
import { Footer } from '@/components/newDesign/home/footer';
import { PortableText } from '@/components/newDesign/blog/portable-text';
import { useSeo, SITE_URL } from '@/hooks/useSeo';
import { readPrerenderSeed } from '@/utils/prerenderSeed';
import {
  getPost,
  getRelatedPosts,
  urlFor,
  CATEGORY_LABELS,
  formatDate,
  type Post,
  type PostListItem,
} from '@/services/sanity';

// Module scope, not render — see readPrerenderSeed.
const SEED = readPrerenderSeed<Post>('__prerender_post__');

function articleJsonLd(post: Post, url: string, image?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.seoTitle || post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(image ? { image: [image] } : {}),
    ...(post.author?.name
      ? { author: { '@type': 'Person', name: post.author.name, ...(post.author.role ? { jobTitle: post.author.role } : {}) } }
      : {}),
    publisher: {
      '@type': 'Organization',
      name: 'Screna AI',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
    },
  };
}

function breadcrumbJsonLd(post: Post, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  };
}

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();

  // The seed describes one specific post. Client-side navigation to a
  // different article must still hit the network.
  const seeded = SEED && SEED.slug === slug ? SEED : null;

  const [fetched, setFetched] = useState<Post | null>(seeded);
  const [loading, setLoading] = useState(!seeded);
  const [notFound, setNotFound] = useState(false);
  const [related, setRelated] = useState<PostListItem[]>([]);

  // While navigating from one article to the next, `fetched` still holds the
  // previous post for a render. Never show — or describe in <head> — a post
  // that doesn't match the URL.
  const post = fetched && fetched.slug === slug ? fetched : null;

  const url = `${SITE_URL}/blog/${slug}`;
  const coverUrl = post?.cover?.asset?._ref
    ? urlFor(post.cover).width(1200).height(630).fit('crop').url()
    : undefined;

  // `null` while loading keeps the prerenderer waiting for the real article.
  // The not-found branch must still report ready (as noindex), or the build
  // would stall on any dead slug.
  useSeo(
    post
      ? {
          title: `${post.seoTitle || post.title || 'Blog'} | Screna AI`,
          description: post.excerpt ?? '',
          path: `/blog/${slug}`,
          type: 'article',
          image: coverUrl,
          jsonLd: [articleJsonLd(post, url, coverUrl), breadcrumbJsonLd(post, url)],
        }
      : notFound
        ? {
            title: 'Post not found | Screna AI',
            description: 'This article may have been moved or unpublished.',
            path: `/blog/${slug}`,
            noindex: true,
          }
        : null,
  );

  useEffect(() => {
    if (!slug) return;
    // Already have this exact post from the prerender seed.
    if (post) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    getPost(slug)
      .then((data) => {
        if (cancelled) return;
        if (!data) setNotFound(true);
        else setFetched(data);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Related posts are internal-linking only — they must never gate
  // `data-seo-ready`, so this runs independently of the article fetch.
  useEffect(() => {
    if (!post?._id) return;
    let cancelled = false;
    getRelatedPosts({ category: post.category, excludeId: post._id, limit: 3 })
      .then((items) => {
        if (!cancelled) setRelated(items ?? []);
      })
      .catch(() => {
        if (!cancelled) setRelated([]);
      });
    return () => {
      cancelled = true;
    };
  }, [post?._id, post?.category]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-2xl px-6 pt-28 pb-20">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-[14px] text-[#2E5BFF] hover:text-[#1E48E6] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>

        {loading && (
          <div className="mt-8 animate-pulse">
            <div className="h-3 w-28 rounded bg-[#EEF1F5]" />
            <div className="mt-3 h-9 w-full rounded bg-[#EEF1F5]" />
            <div className="mt-2 h-9 w-2/3 rounded bg-[#EEF1F5]" />
            <div className="mt-6 aspect-video w-full rounded-xl bg-[#EEF1F5]" />
          </div>
        )}

        {!loading && notFound && (
          <div className="mt-16 text-center">
            <h1 className="text-2xl font-semibold text-[#0A0A0A]">Post not found</h1>
            <p className="mt-2 text-[#5b5f6b]">
              This article may have been moved or unpublished.
            </p>
            <Link
              to="/blog"
              className="mt-6 inline-flex items-center h-10 px-5 rounded-full bg-[#2E5BFF] text-white text-sm font-medium hover:bg-[#1E48E6] transition-colors"
            >
              Browse all posts
            </Link>
          </div>
        )}

        {!loading && post && (
          <article>
            {/* Visible breadcrumb, mirroring the BreadcrumbList JSON-LD above */}
            <nav aria-label="Breadcrumb" className="mt-8">
              <ol className="flex flex-wrap items-center gap-1.5 text-[12px] text-[#8a8f9a]">
                <li>
                  <Link to="/" className="hover:text-[#2E5BFF] transition-colors">
                    Home
                  </Link>
                </li>
                <ChevronRight className="w-3 h-3 shrink-0" aria-hidden="true" />
                <li>
                  <Link to="/blog" className="hover:text-[#2E5BFF] transition-colors">
                    Blog
                  </Link>
                </li>
                <ChevronRight className="w-3 h-3 shrink-0" aria-hidden="true" />
                <li aria-current="page" className="text-[#5b5f6b] line-clamp-1">
                  {post.title}
                </li>
              </ol>
            </nav>

            {post.category && (
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-[#2E5BFF]">
                {CATEGORY_LABELS[post.category] ?? post.category}
              </p>
            )}
            <h1 className="mt-2 text-[34px] leading-[1.15] font-semibold tracking-tight text-[#0A0A0A]">
              {post.title}
            </h1>
            <p className="mt-3 text-[13px] text-[#8a8f9a]">
              {[post.author?.name, post.author?.role].filter(Boolean).join(' · ')}
              {(post.author?.name || post.author?.role) && post.publishedAt ? ' · ' : ''}
              {post.publishedAt && (
                <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
              )}
            </p>

            {post.cover?.asset?._ref && (
              <img
                src={urlFor(post.cover).width(1600).height(900).fit('crop').url()}
                alt={post.cover.alt ?? post.title ?? ''}
                width={1600}
                height={900}
                className="mt-8 aspect-video w-full rounded-xl object-cover"
              />
            )}

            {Array.isArray(post.body) && (
              <div className="prose prose-lg prose-slate mt-8 max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-[#2E5BFF] prose-img:rounded-lg">
                <PortableText value={post.body} />
              </div>
            )}
          </article>
        )}

        {!loading && post && related.length > 0 && (
          <aside className="mt-16 border-t border-[#EEF1F5] pt-10">
            <h2 className="text-[19px] font-semibold text-[#0A0A0A]">Related articles</h2>
            <ul className="mt-5 space-y-5">
              {related.map((item) => (
                <li key={item._id}>
                  <Link to={`/blog/${item.slug}`} className="group block">
                    {item.category && (
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2E5BFF]">
                        {CATEGORY_LABELS[item.category] ?? item.category}
                      </span>
                    )}
                    <p className="mt-1 text-[16px] font-medium leading-snug text-[#0A0A0A] group-hover:text-[#2E5BFF] transition-colors">
                      {item.title}
                    </p>
                    {item.excerpt && (
                      <p className="mt-1 text-[14px] leading-relaxed text-[#5b5f6b] line-clamp-2">
                        {item.excerpt}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </main>
      <Footer />
    </div>
  );
}
