export function EnvMissing({ vars }: { vars: string[] }) {
  return (<div style={{ maxWidth: 520, margin: '0 auto', padding: 24 }}><div className="card"><b>Configuração do Supabase ausente</b>
    <p style={{ color: 'var(--mu)' }}>Defina no arquivo <code>.env</code> (raiz do projeto) e reinicie o servidor:</p>
    <ul>{vars.map(v => <li key={v}><code>{v}</code></li>)}</ul><small style={{ color: 'var(--mu)' }}>Use apenas a anon key. Nunca a service_role.</small></div></div>)
}
