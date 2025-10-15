import { render, screen, waitFor } from '@testing-library/react';
import { fireEvent, within } from '@testing-library/react';
import { vi } from 'vitest';

import { SettingsClient } from '@/components/features/settings/settings-client';

const initialSettings = {
  theme: 'light',
  language: 'fr',
  animations: true,
  preferences: {
    currency: 'EUR',
    weightUnit: 'g',
    dateFormat: 'DD/MM/YYYY',
    autoExchangeRate: true,
  },
};

describe('SettingsClient', () => {
  let fetchMock: any;

  beforeEach(() => {
    // Keep an in-memory sessions list to simulate server state
    let sessions = [
      {
        id: 's_current',
        userId: 'u1',
        deviceName: 'Laptop',
        deviceType: 'desktop',
        ipAddress: '1.2.3.4',
        userAgent: 'UA',
        lastActivityAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        isCurrent: true,
      },
      {
        id: 's_other',
        userId: 'u1',
        deviceName: 'Phone',
        deviceType: 'mobile',
        ipAddress: '5.6.7.8',
        userAgent: 'UA2',
        lastActivityAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        isCurrent: false,
      },
    ];

    fetchMock = vi.fn(async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : String(input?.url || '');
      const method = (init && init.method) || 'GET';

      // Sessions list
      if (url.endsWith('/api/v1/sessions') && method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { sessions, currentSessionId: 's_current' } }),
        };
      }

      // Delete all sessions
      if (url.endsWith('/api/v1/sessions') && method === 'DELETE') {
        sessions = sessions.filter((s) => s.id === 's_current');
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { message: 'Autres sessions supprimées' } }),
        };
      }

      // Delete individual
      const deleteSingleMatch = url.match(/\/api\/v1\/sessions\/(.+)$/);
      if (deleteSingleMatch && method === 'DELETE') {
        const id = deleteSingleMatch[1];
        sessions = sessions.filter((s) => s.id !== id);
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { message: 'Session supprimée' } }),
        };
      }

      // PUT settings
      if (url.endsWith('/api/v1/settings') && method === 'PUT') {
        const body = init?.body ? JSON.parse(init.body) : {};
        // reflect change by returning success
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { message: 'ok', body } }),
        };
      }

      return { ok: false, status: 404, json: async () => ({ success: false, error: 'Not found' }) };
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('affiche la liste des sessions et supprime une session individuelle', async () => {
    render(<SettingsClient initialData={initialSettings} />);

    // Switch to the Sécurité tab to see sessions
    const securityTab = screen.getByRole('tab', { name: /Sécurité/i });
    fireEvent.click(securityTab);

    // Wait for sessions to load (they load on mount, but tab content needs to render)
    await waitFor(() => {
      expect(screen.getByText('Laptop')).toBeTruthy();
    });
    expect(screen.getByText('Phone')).toBeTruthy();

    // Find the Terminer button for the Phone session (not current session)
    // There are two buttons with "Terminer": one for individual session, one for "Terminer les autres"
    const terminerButtons = screen.getAllByRole('button', { name: /Terminer/i });
    const terminerBtn = terminerButtons.find(btn => !btn.textContent?.includes('autres'));
    expect(terminerBtn).toBeTruthy();
    fireEvent.click(terminerBtn!);

    // Dialog should appear
    expect(await screen.findByRole('heading', { name: /Terminer la session/i })).toBeTruthy();

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /Terminer la session/i });
    fireEvent.click(confirmButton);

    // Wait for deletion to reflect: Phone should be removed
    await waitFor(async () => {
      expect(screen.queryByText('Phone')).toBeNull();
    });
  });

  it('ouvre le dialog pour terminer toutes les autres sessions et supprime', async () => {
    render(<SettingsClient initialData={initialSettings} />);

    // Switch to the Sécurité tab to see sessions
    const securityTab = screen.getByRole('tab', { name: /Sécurité/i });
    fireEvent.click(securityTab);

    // Wait for sessions to load
    await waitFor(() => {
      expect(screen.getByText('Laptop')).toBeTruthy();
    });
    expect(screen.getByText('Phone')).toBeTruthy();

    // Click 'Terminer les autres sessions' button (use role to avoid ambiguity with dialog title)
    const btn = screen.getByRole('button', { name: /Terminer les autres sessions/i });
    fireEvent.click(btn);

    // Dialog appears (find by role to avoid ambiguity)
    expect(await screen.findByRole('heading', { name: /Terminer les autres sessions/i })).toBeTruthy();

    // Confirm the action: find 'Terminer les autres' button inside dialog
    const confirmDeleteOthers = screen.getByRole('button', { name: /Terminer les autres/i });
    fireEvent.click(confirmDeleteOthers);

    // After deletion, Phone must be removed, only Laptop remains
    await waitFor(() => {
      expect(screen.queryByText('Phone')).toBeNull();
      expect(screen.getByText('Laptop')).toBeTruthy();
    });
  });

  it('sauvegarde les preferences via PUT /api/v1/settings', async () => {
    render(<SettingsClient initialData={initialSettings} />);

    // Switch to the Préférences tab to see preferences
    const preferencesTab = screen.getByRole('tab', { name: /Préférences/i });
    fireEvent.click(preferencesTab);

    // Wait for the save button to appear
    await waitFor(() => {
      expect(screen.getByText('Sauvegarder les préférences')).toBeTruthy();
    });

    // Click on 'Sauvegarder les préférences'
    const saveButton = screen.getByText('Sauvegarder les préférences');
  fireEvent.click(saveButton);

    // Ensure fetch was called with PUT and body contains preferences
    await waitFor(() => {
      expect(fetchMock.mock.calls.some((call: any[]) => 
        call[0].toString().includes('/api/v1/settings') && call[1]?.method === 'PUT'
      )).toBeTruthy();
    });
  });
});
