import { Component, PropsWithChildren } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

type ErrorBoundaryProps = PropsWithChildren<Record<string, never>>;

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: Readonly<ErrorBoundaryProps>;

  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Erro inesperado na interface:', { message: error.message, name: error.name });
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-[#f7f7f2] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-center">
            <h1 className="text-lg font-bold text-slate-900">Nao foi possivel carregar esta tela</h1>
            <p className="mt-2 text-sm text-slate-600">
              Atualize a pagina. Se o problema continuar, verifique se o servidor esta rodando.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Atualizar pagina
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
