/**
 * Markdown Rendering Tests
 * Covers: Markdown component renders backend markdown content properly
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Markdown } from '@/components/newDesign/ui/markdown';

describe('Markdown Component', () => {
  it('renders plain text correctly', () => {
    render(<Markdown>Hello world</Markdown>);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders bold text with <strong> tag', () => {
    render(<Markdown>{'This is **bold** text'}</Markdown>);
    const strong = screen.getByText('bold');
    expect(strong.tagName).toBe('STRONG');
  });

  it('renders italic text with <em> tag', () => {
    render(<Markdown>{'This is *italic* text'}</Markdown>);
    const em = screen.getByText('italic');
    expect(em.tagName).toBe('EM');
  });

  it('renders unordered list items', () => {
    const markdown = `- Item one\n- Item two\n- Item three`;
    render(<Markdown>{markdown}</Markdown>);
    expect(screen.getByText('Item one')).toBeInTheDocument();
    expect(screen.getByText('Item two')).toBeInTheDocument();
    expect(screen.getByText('Item three')).toBeInTheDocument();
  });

  it('renders ordered list items', () => {
    const markdown = `1. First\n2. Second\n3. Third`;
    render(<Markdown>{markdown}</Markdown>);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
  });

  it('renders headings as downsized elements', () => {
    render(<Markdown>{'# Heading One'}</Markdown>);
    // h1 is rendered as h3 by our component
    const heading = screen.getByText('Heading One');
    expect(heading.tagName).toBe('H3');
  });

  it('renders inline code', () => {
    render(<Markdown>{'Use `console.log()` for debugging'}</Markdown>);
    const code = screen.getByText('console.log()');
    expect(code.tagName).toBe('CODE');
  });

  it('renders blockquotes', () => {
    render(<Markdown>{'> This is a quote'}</Markdown>);
    const quote = screen.getByText('This is a quote');
    expect(quote.closest('blockquote')).toBeInTheDocument();
  });

  it('renders links', () => {
    render(<Markdown>{'[Click here](https://example.com)'}</Markdown>);
    const link = screen.getByText('Click here');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('applies custom className', () => {
    const { container } = render(<Markdown className="text-sm text-red-500">Test</Markdown>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('text-sm');
    expect(wrapper.className).toContain('text-red-500');
  });

  it('renders complex markdown with mixed content', () => {
    const markdown = `**Summary**: The candidate demonstrated strong analytical skills.

Key observations:
- Good problem decomposition
- Clear communication
- Could improve on **edge case handling**

Overall score: 8/10`;

    render(<Markdown>{markdown}</Markdown>);
    expect(screen.getByText(/The candidate demonstrated strong analytical skills/)).toBeInTheDocument();
    expect(screen.getByText('Good problem decomposition')).toBeInTheDocument();
    expect(screen.getByText(/edge case handling/)).toBeInTheDocument();
    expect(screen.getByText(/Overall score: 8\/10/)).toBeInTheDocument();
  });

  it('handles empty string without crashing', () => {
    const { container } = render(<Markdown>{''}</Markdown>);
    expect(container).toBeInTheDocument();
  });
});
