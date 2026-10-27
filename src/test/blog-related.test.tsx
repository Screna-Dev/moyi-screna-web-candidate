/**
 * "Related articles" at the foot of /blog/:slug.
 *
 * Editors can pick up to 3 related posts in the Studio (post.relatedPosts,
 * fetched with the article). Those win; only a post without any falls back to
 * the automatic same-category list.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

const getPost = vi.fn();
const getRelatedPosts = vi.fn();

vi.mock('@/services/sanity', async (orig) => ({
  ...(await orig<object>()),
  getPost: (...a: unknown[]) => getPost(...a),
  getRelatedPosts: (...a: unknown[]) => getRelatedPosts(...a),
}));
vi.mock('@/components/newDesign/home/navbar', () => ({ Navbar: () => null }));
vi.mock('@/components/newDesign/home/footer', () => ({ Footer: () => null }));
vi.mock('@/components/newDesign/blog/portable-text', () => ({ PortableText: () => <p>Body</p> }));

import { BlogPostPage } from '@/pages/newDesign/blog/blog-post';

const card = (n: number) => ({
  _id: `r${n}`,
  slug: `related-${n}`,
  title: `Related title ${n}`,
  category: 'interview-prep',
  publishedAt: '2026-10-20T00:00:00Z',
});

const renderPost = () =>
  render(
    <MemoryRouter initialEntries={['/blog/main-post']}>
      <Routes>
        <Route path="/blog/:slug" element={<BlogPostPage />} />
      </Routes>
    </MemoryRouter>,
  );

const relatedLinks = async () => {
  const heading = await screen.findByRole('heading', { name: 'Related articles' });
  return within(heading.closest('aside')!).getAllByRole('link');
};

beforeEach(() => {
  getPost.mockReset();
  getRelatedPosts.mockReset();
});

describe('blog post — related articles', () => {
  it('shows the editor-picked posts, in order, as links to their pages', async () => {
    getPost.mockResolvedValue({
      _id: 'main', slug: 'main-post', title: 'Main', category: 'interview-prep',
      relatedPosts: [card(2), card(1), card(3)],
    });
    renderPost();
    const links = await relatedLinks();
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/blog/related-2', '/blog/related-1', '/blog/related-3']);
    expect(links[0]).toHaveTextContent('Related title 2');
    expect(getRelatedPosts).not.toHaveBeenCalled();
  });

  it('falls back to same-category posts when none were picked', async () => {
    getPost.mockResolvedValue({ _id: 'main', slug: 'main-post', title: 'Main', category: 'interview-prep', relatedPosts: [] });
    getRelatedPosts.mockResolvedValue([card(9)]);
    renderPost();
    const links = await relatedLinks();
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/blog/related-9']);
    expect(getRelatedPosts).toHaveBeenCalledWith({ category: 'interview-prep', excludeId: 'main', limit: 3 });
  });

  it('treats a missing field (posts saved before the Studio change) as none picked', async () => {
    getPost.mockResolvedValue({ _id: 'main', slug: 'main-post', title: 'Main', category: 'interview-prep' });
    getRelatedPosts.mockResolvedValue([card(4)]);
    renderPost();
    expect((await relatedLinks()).map((a) => a.getAttribute('href'))).toEqual(['/blog/related-4']);
  });
});
