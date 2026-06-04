// TASK-15 — Onboarding card with realistic NECCTON/Copernicus content
import { useFishStore } from '../../store/fishStore';
import { ConfigPanel } from './ConfigPanel';
import { PacificMap } from '../map/PacificMap';

function InstituteLogo({ name, abbr, color }: { name: string; abbr: string; color: string }) {
  return (
    <div title={name} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    }}>
      <svg width="32" height="32" viewBox="0 0 32 32">
        <rect width="32" height="32" rx="4" fill={color} fillOpacity="0.15" />
        <rect x="1" y="1" width="30" height="30" rx="3" fill="none" stroke={color} strokeOpacity="0.4" strokeWidth="1" />
        <text x="16" y="20" textAnchor="middle" fontSize="9" fontWeight="700" fill={color} fontFamily="Inter, sans-serif">{abbr}</text>
      </svg>
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 7, color: 'var(--text-lo)', textAlign: 'center', lineHeight: 1.2 }}>{name.split(' ').slice(0, 2).join(' ')}</span>
    </div>
  );
}

function OnboardingCard() {
  const dismiss = useFishStore(s => s.dismissOnboarding);

  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 390, zIndex: 10,
      background: 'var(--ink-700)',
      border: '1px solid var(--ice-border)',
      borderRadius: 8, padding: 24,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600, color: 'var(--text-hi)', marginBottom: 4 }}>
          Welcome to the Pacific Tuna Stock Simulator
        </h2>
        <div style={{ fontSize: 9, color: 'var(--signal-info)', fontFamily: 'var(--font-ui)', letterSpacing: '0.3px' }}>
          Based on the NECCTON tuna-viewer · Powered by Copernicus Marine Service
        </div>
      </div>

      {/* Context block */}
      <div style={{
        padding: '10px 12px', marginBottom: 10,
        background: 'rgba(168,216,232,0.06)',
        border: '1px solid var(--ice-border)',
        borderRadius: 'var(--radius-sm)',
        fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-mid)', lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--ice)', display: 'block', marginBottom: 4 }}>Context</strong>
        This tool builds on the NECCTON tuna-viewer prototype to demonstrate how Copernicus Marine Service data (SEAPODYM, CMEMS physical &amp; biogeochemical models) can inform fisheries management decisions in the Pacific Ocean under climate change. It is part of the EU Digital Twin Ocean (EDITO) framework.
      </div>

      {/* Objectives block */}
      <div style={{
        padding: '10px 12px', marginBottom: 14,
        background: 'rgba(168,216,232,0.06)',
        border: '1px solid var(--ice-border)',
        borderRadius: 'var(--radius-sm)',
        fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-mid)', lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--ice)', display: 'block', marginBottom: 4 }}>What you can explore</strong>
        Configure annual catch levels per fishery zone, select EEZ closure policies, and choose an IPCC climate scenario. The SEAPODYM model then projects skipjack &amp; bigeye tuna biomass, recruitment and catch over 2026–2099, enabling side-by-side comparison of management scenarios.
      </div>

      {/* Partner logos */}
      <div style={{
        padding: '10px 14px', marginBottom: 14,
        background: 'var(--ink-500)', borderRadius: 'var(--radius-sm)',
      }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 8, color: 'var(--text-lo)', textAlign: 'center', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Partners &amp; funding
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start' }}>
          <InstituteLogo name="Mercator Ocean Int'l" abbr="MOI" color="#A8D8E8" />
          <InstituteLogo name="Copernicus Marine" abbr="CMEMS" color="#4DA8DA" />
          <InstituteLogo name="NECCTON Project" abbr="NECCTON" color="#3AC58E" />
          <InstituteLogo name="EU Digital Twin Ocean" abbr="EDITO" color="#F2A93B" />
          <InstituteLogo name="Horizon Europe" abbr="EU" color="rgba(255,200,80,0.9)" />
        </div>
      </div>

      <button
        onClick={dismiss}
        style={{
          width: '100%', padding: '9px 0',
          background: 'var(--ice)', border: 'none',
          borderRadius: 'var(--radius-sm)',
          fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600,
          color: 'var(--ink-900)', cursor: 'pointer',
        }}>
        Get started →
      </button>
    </div>
  );
}

export function ConfigureScreen() {
  const onboardingDismissed = useFishStore(s => s.onboardingDismissed);

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0, position: 'relative' }}>
      <ConfigPanel dimmed={!onboardingDismissed} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, position: 'relative' }}>
        <PacificMap phase="configure" />
      </div>
      {!onboardingDismissed && (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,20,40,0.55)', zIndex: 9 }} />
          <OnboardingCard />
        </>
      )}
    </div>
  );
}
