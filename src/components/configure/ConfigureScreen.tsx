import { useFishStore } from '../../store/fishStore';
import { ConfigPanel } from './ConfigPanel';
import { PacificMap } from '../map/PacificMap';

function OnboardingCard() {
  const dismiss = useFishStore(s => s.dismissOnboarding);

  return (
    <div style={{
      position: 'absolute',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 360,
      background: 'var(--ink-700)',
      border: '1px solid var(--ice-border)',
      borderRadius: 8,
      padding: 24,
      zIndex: 10,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600, color: 'var(--text-hi)', marginBottom: 4 }}>
          Welcome to the Pacific Tuna Stock Simulator
        </h2>
        <div style={{ fontSize: 9, color: 'var(--text-lo)', fontFamily: 'var(--font-ui)', fontStyle: 'italic' }}>
          Shown on first launch only · content supplied by MOI
        </div>
      </div>

      {/* Placeholder content blocks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <div style={{
          padding: '10px 12px',
          background: 'rgba(168,216,232,0.06)',
          border: '1px dashed var(--ice-border)',
          borderRadius: 'var(--radius-sm)',
          fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-lo)', fontStyle: 'italic', lineHeight: 1.5,
        }}>
          [ Context ] — Placeholder for a short paragraph introducing what the tool does and why, written by Mercator Ocean International.
        </div>
        <div style={{
          padding: '10px 12px',
          background: 'rgba(168,216,232,0.06)',
          border: '1px dashed var(--ice-border)',
          borderRadius: 'var(--radius-sm)',
          fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-lo)', fontStyle: 'italic', lineHeight: 1.5,
        }}>
          [ Objectives ] — Placeholder describing what the user can explore: catch settings, climate scenarios, closure zones, and a 30-year stock projection.
        </div>
      </div>

      {/* Credits */}
      <div style={{
        padding: '8px 12px',
        background: 'var(--ink-500)',
        borderRadius: 'var(--radius-sm)',
        fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-lo)', fontStyle: 'italic',
        textAlign: 'center', marginBottom: 16,
      }}>
        [ Credits / partners / funding logos — placeholder ]
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
      {/* Left panel — dimmed when onboarding shown */}
      <ConfigPanel dimmed={!onboardingDismissed} />

      {/* Right — map */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, position: 'relative' }}>
        <PacificMap phase="configure" />
      </div>

      {/* Onboarding overlay */}
      {!onboardingDismissed && (
        <>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(10,20,40,0.55)',
            zIndex: 9,
          }} />
          <OnboardingCard />
        </>
      )}
    </div>
  );
}
