import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, Badge, StatusBadge, EmptyState, Avatar, ProgressBar } from '../src/components/ui';

describe('Button', () => {
  it('renders its label and fires onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Pay rent</Button>);
    const btn = screen.getByRole('button', { name: /pay rent/i });
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
  it('is disabled while loading', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('Badge / StatusBadge', () => {
  it('renders badge content', () => {
    render(<Badge tone="green">Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
  it('humanizes underscored status text', () => {
    render(<StatusBadge status="checked_in" />);
    expect(screen.getByText(/checked in/i)).toBeInTheDocument();
  });
});

describe('Avatar', () => {
  it('renders up to two uppercase initials', () => {
    render(<Avatar name="Rahul Mehta" />);
    expect(screen.getByText('RM')).toBeInTheDocument();
  });
});

describe('ProgressBar', () => {
  it('clamps width to a 0–100% range', () => {
    const { container } = render(<ProgressBar value={5} max={2} />);
    const bar = container.querySelector('[style*="width"]');
    expect(bar).toHaveStyle({ width: '100%' });
  });
});

describe('EmptyState', () => {
  it('renders the title and message', () => {
    render(<EmptyState title="No data" message="Nothing here yet" />);
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
  });
});
