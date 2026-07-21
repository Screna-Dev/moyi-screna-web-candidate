import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/newDesign/home/navbar';
import { Footer } from '@/components/newDesign/home/footer';
import { PortableText } from '@/components/newDesign/blog/portable-text';
import { getPost, urlFor, CATEGORY_LABELS, formatDate, type Post } from '@/services/sanity';

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    getPost(slug)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setNotFound(true);
        } else {
          setPost(data);
          document.title = `${data.seoTitle || data.title || 'Blog'} · Screna`;
        }
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
  }, [slug]);

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
            {post.category && (
              <p className="mt-8 text-[11px] font-semibold uppercase tracking-wider text-[#2E5BFF]">
                {CATEGORY_LABELS[post.category] ?? post.category}
              </p>
            )}
            <h1 className="mt-2 text-[34px] leading-[1.15] font-semibold tracking-tight text-[#0A0A0A]">
              {post.title}
            </h1>
            <p className="mt-3 text-[13px] text-[#8a8f9a]">
              {[
                post.author?.name,
                post.author?.role,
                post.publishedAt ? formatDate(post.publishedAt) : '',
              ]
                .filter(Boolean)
                .join(' · ')}
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
      </main>
      <Footer />
    </div>
  );
}
