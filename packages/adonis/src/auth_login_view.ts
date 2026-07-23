import type { AuthLoginMode } from '@shamar/cherubim';
import type { PanelBranding } from '@shamar/core';
import { isMasqueradeEnabled } from './auth/masquerade.js';
import {
  buildBrandingCss,
  resolveBranding,
  type ShamarBranding,
} from './shamar/branding.js';

export interface AuthLoginCopy {
  /** Subtitle under the brand name. */
  subtitle?: string;
  /** Optional hint under the form. Empty/omit hides it. */
  footer?: string;
  /** Placeholder for the username / email field. */
  usernamePlaceholder?: string;
  /** Label for the username / email field. */
  usernameLabel?: string;
}

export interface AuthLoginViewConfig {
  branding?: PanelBranding;
  auth?: {
    loginMode?: AuthLoginMode | string;
    login?: AuthLoginCopy;
    masquerade?: {
      password?: string;
    };
  };
}

export interface AuthLoginViewData {
  loginMode: AuthLoginMode | string;
  branding: ShamarBranding;
  brandingCss: string;
  /** Convenience alias for templates / titles. */
  brandName: string;
  /** Resolved subtitle under the brand. */
  loginSubtitle: string;
  /** Resolved footer hint; empty string means hide. */
  loginFooter: string;
  /** Username / email field label. */
  loginUsernameLabel: string;
  /** Username / email field placeholder. */
  loginUsernamePlaceholder: string;
  /** True when non-production masquerade login is available. */
  masqueradeEnabled: boolean;
}

const DEFAULT_SUBTITLES: Record<string, string> = {
  local: 'Sign in to continue.',
  ldap: 'Sign in with your directory account.',
  both: 'Sign in with your directory or local account.',
};

const DEFAULT_USERNAME_LABELS: Record<string, string> = {
  local: 'Email',
  ldap: 'Email or username',
  both: 'Email or username',
};

const DEFAULT_USERNAME_PLACEHOLDERS: Record<string, string> = {
  local: 'you@example.com',
  ldap: 'user@domain or DOMAIN\\user',
  both: 'user@domain or DOMAIN\\user',
};

/**
 * Resolve login page subtitle / footer / username field copy from config.
 * Footer defaults to empty (hidden).
 */
export function resolveAuthLoginCopy(
  loginMode: AuthLoginMode | string = 'local',
  copy?: AuthLoginCopy,
): {
  subtitle: string;
  footer: string;
  usernameLabel: string;
  usernamePlaceholder: string;
} {
  const mode = String(loginMode || 'local');
  const subtitle =
    copy?.subtitle?.trim() ||
    DEFAULT_SUBTITLES[mode] ||
    DEFAULT_SUBTITLES.local!;
  const footer = copy?.footer?.trim() ?? '';
  const usernameLabel =
    copy?.usernameLabel?.trim() ||
    DEFAULT_USERNAME_LABELS[mode] ||
    DEFAULT_USERNAME_LABELS.local!;
  const usernamePlaceholder =
    copy?.usernamePlaceholder?.trim() ||
    DEFAULT_USERNAME_PLACEHOLDERS[mode] ||
    DEFAULT_USERNAME_PLACEHOLDERS.local!;
  return { subtitle, footer, usernameLabel, usernamePlaceholder };
}

/**
 * View locals for the published Shamar login page.
 * Uses the same branding resolution as the admin shell.
 */
export function buildAuthLoginViewData(config: AuthLoginViewConfig = {}): AuthLoginViewData {
  const loginMode = config.auth?.loginMode ?? 'local';
  const branding = resolveBranding(config.branding);
  const { subtitle, footer, usernameLabel, usernamePlaceholder } = resolveAuthLoginCopy(
    loginMode,
    config.auth?.login,
  );
  return {
    loginMode,
    branding,
    brandingCss: buildBrandingCss(branding),
    brandName: branding.brandName,
    loginSubtitle: subtitle,
    loginFooter: footer,
    loginUsernameLabel: usernameLabel,
    loginUsernamePlaceholder: usernamePlaceholder,
    masqueradeEnabled: isMasqueradeEnabled(config),
  };
}
