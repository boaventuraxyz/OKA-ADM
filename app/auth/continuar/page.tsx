import { ShieldCheck } from "lucide-react";

import { AuthLinkBridge } from "./AuthLinkBridge";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Concluindo acesso",
};

export default function AuthContinuePage() {
  return (
    <main className="login-page">
      <div className="login-card">
        <div className="avatar" style={{ marginBottom: 16 }}>
          <ShieldCheck size={18} />
        </div>
        <h1>Concluindo seu acesso</h1>
        <AuthLinkBridge />
      </div>
    </main>
  );
}
