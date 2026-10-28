import { createContext, useContext } from 'react';
import type { CreditBalances } from './employerApi';

// GET /employer/credits, shared by the shell (top-bar badges, sidebar card)
// and the views that spend credits (unlocking a report), which call refresh()
// afterwards so the badges update without a screen change.
export type CreditsState = { credits: CreditBalances | null; refresh: () => void };

export const CreditsContext = createContext<CreditsState>({ credits: null, refresh: () => {} });

export const useEmployerCredits = () => useContext(CreditsContext);

// Report Credits bought from the board: Stripe returns to the same
// /employer/credits?checkout=…&jobId=… URL as Interview Credits bought from the
// wizard, so the board marks the purchase to be sent back to the board.
export const REPORT_CHECKOUT_KEY = 'screna_employer_report_checkout';
