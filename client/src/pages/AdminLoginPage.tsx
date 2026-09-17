import React, { useState } from 'react';
import { TimLogo } from '../components/TimLogo';
import { Lock, User, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';

interface AdminLoginPageProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Preencha seu usuário e senha institucional.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        })
      });

      const data = await response.json();

      if (response.ok && data.success && data.token) {
        onLoginSuccess(data.token, data.user);
      } else {
        setErrorMessage(data.error || 'Credenciais inválidas. Verifique seu usuário e senha.');
      }
    } catch (err) {
      console.error('Erro de conexão ao realizar login:', err);
      setErrorMessage('Não foi possível conectar ao servidor. Tente novamente em instantes.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070C18] flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Luzes Ambientais de Fundo (Glow Effect) */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#002B7F]/40 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#00B5E2]/25 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#001438]/50 rounded-full filter blur-[150px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Card Principal de Autenticação */}
        <div className="bg-[#0E172C]/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-8 shadow-2xl shadow-black/80 space-y-7">
          
          {/* Topo com Logo Oficial TIM & Badge Corporativo */}
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-1">
              <TimLogo className="h-8 w-auto" variant="white" />
            </div>
            
            <div className="inline-flex items-center space-x-2 bg-[#002B7F]/60 border border-[#00B5E2]/30 px-3 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00B5E2]" />
              <span className="text-[10px] font-black uppercase tracking-wider text-[#00B5E2]">
                Acesso Corporativo Seguro
              </span>
            </div>

            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Showroom Retail Hub</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Central de Gestão de Ofertas, Enxovais & Vitrines
              </p>
            </div>
          </div>

          {/* Feedback de Erro */}
          {errorMessage && (
            <div className="bg-rose-500/15 border border-rose-500/30 rounded-2xl p-3.5 flex items-start space-x-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Formulário de Login */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Usuário */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-gray-300 block">
                Usuário Institucional
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-gray-400 pointer-events-none">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin ou gestor@tim.com.br"
                  autoComplete="username"
                  autoFocus
                  required
                  className="w-full bg-[#070C18] border border-white/15 focus:border-[#00B5E2] rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00B5E2] transition-all"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-gray-300 block">
                Senha de Acesso
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-gray-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full bg-[#070C18] border border-white/15 focus:border-[#00B5E2] rounded-xl pl-10 pr-10 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00B5E2] transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-gray-400 hover:text-white transition-colors cursor-pointer p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botão de Entrar */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#002B7F] hover:bg-[#0038A8] active:bg-[#002060] text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg shadow-[#002B7F]/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2 border border-[#00B5E2]/30"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Painel</span>
                  <ArrowRight className="w-4 h-4 text-[#00B5E2]" />
                </>
              )}
            </button>
          </form>

          {/* Dica Informativa Institucional */}
          <div className="pt-2 border-t border-white/10 text-center">
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Ambiente protegido. Acesso restrito a gestores de trade marketing, precificação e operações de loja física da TIM Brasil.
            </p>
          </div>
        </div>

        {/* Rodapé Corporativo */}
        <div className="text-center mt-6 space-y-1">
          <p className="text-[11px] text-gray-400 font-medium">
            TIM Brasil S.A. • Solução In-house de Degustação Digital
          </p>
          <div className="flex items-center justify-center space-x-2 text-[10px] text-gray-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Rede TIM 5G Segura</span>
          </div>
        </div>
      </div>
    </div>
  );
};
