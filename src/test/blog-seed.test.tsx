/**
 * /blog booted from the build-time snapshot (__prerender_posts__).
 *
 * The snapshot paints the first page instantly, but it is frozen at the last
 * deploy: a post published since then was missing from "All" while its
 * category chip — always fetched live — showed it. The page now revalidates
 * the snapshot once in the background.
 *
 * The page reads the embedded tag once, at import, so each test plants it and
 * then imports a fresh copy of the page module.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const getPostsPage = vi.fn();

vi.mock('@/services/sanity', async (orig) => ({
  ...(await orig<object>()),
  getPostsPage: (...args: unknown[]) => getPostsPage(...args),
}));

vi.mock('@/components/newDesign/home/navbar', () => ({ Navbar: () => null }));
vi.mock('@/components/newDesign/home/footer', () => ({ Footer: () => null }));

const SEED = {
  posts: [{ _id: 'old', slug: 'old-post', title: 'Snapshot post', category: 'interview-prep' }],
  total: 1,
  categories: ['interview-prep'],
};

async function renderSeededBlog() {
  const tag = document.createElement('script');
  tag.type = 'application/json';
  tag.id = '__prerender_posts__';
  tag.textContent = JSON.stringify(SEED);
  document.body.appendChild(tag);
  vi.resetModules();
  const { BlogListPage } = await import('@/pages/newDesign/blog/blog-list');
  return render(
    <MemoryRouter initialEntries={['/blog']}>
      <BlogListPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getPostsPage.mockReset();
  window.scrollTo = vi.fn() as never;
});

describe('/blog — snapshot revalidation', () => {
  it('shows the snapshot first, then replaces it with the live list', async () => {
    getPostsPage.mockResolvedValue({
      posts: [
        { _id: 'new', slug: 'new-post', title: 'Published after the deploy', category: 'interview-prep' },
        { _id: 'old', slug: 'old-post', title: 'Snapshot post', category: 'interview-prep' },
      ],
      total: 2,
      categories: ['interview-prep'],
    });
    await renderSeededBlog();
    expect(screen.getByText('Snapshot post')).toBeInTheDocument();
    expect(await screen.findByText('Published after the deploy')).toBeInTheDocument();
    expect(getPostsPage).toHaveBeenCalledTimes(1);
    expect(getPostsPage).toHaveBeenCalledWith({ page: 1, pageSize: expect.any(Number), category: null });
    // Silent: no jump to the top on the first paint's refresh.
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('keeps the snapshot on screen when the live fetch fails', async () => {
    getPostsPage.mockRejectedValue(new Error('sanity down'));
    await renderSeededBlog();
    await waitFor(() => expect(getPostsPage).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText('Snapshot post')).toBeInTheDocument();
  });
});
