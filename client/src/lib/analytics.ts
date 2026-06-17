import posthog from 'posthog-js'

let _initialized = false

export function initAnalytics(): void {
  const key = (import.meta.env.VITE_POSTHOG_KEY as string | undefined) ?? ''
  if (!key) return
  posthog.init(key, {
    api_host: (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false,   // we fire page_view events manually
    capture_pageleave: false,
  })
  _initialized = true
}

export function identifyUser(distinctId: string, properties: { email: string }): void {
  if (!_initialized) return
  posthog.identify(distinctId, properties)
}

export type AnalyticsEvent =
  | { name: 'page_view'; props: { section_name: string } }
  | { name: 'email_submitted'; props: { valid: boolean } }
  | { name: 'session_started'; props: { session_id: string } }
  | { name: 'nrr_calculator_completed'; props: { nrr_value: number; grr_value: number; nrr_band: string } }
  | { name: 'nrr_calculator_skipped'; props: Record<string, never> }
  | { name: 'capabilities_selected'; props: { capabilities: string[]; scope: string; estimated_minutes: number } }
  | { name: 'assessment_section_completed'; props: { section_name: string; time_on_section_seconds: number; picks_count: number } }
  | { name: 'pick_made'; props: { lever_or_category_id: string; dimension: string | null; level: number } }
  | { name: 'scorecard_viewed'; props: { overall_intelligence: number | null; weakest_capability: string | null; capabilities_selected: string[] } }
  | { name: 'pdf_downloaded'; props: Record<string, never> }
  | { name: 'book_call_clicked'; props: Record<string, never> }
  | { name: 'assessment_completed'; props: { capabilities_selected: string[]; overall_intelligence: number | null } }

export function track(event: AnalyticsEvent): void {
  try {
    if (import.meta.env.DEV) {
      console.log('[analytics]', event.name, event.props)
    }
    if (_initialized) {
      posthog.capture(event.name, event.props)
    }
  } catch {
    // Analytics must never crash the app
  }
}
