# Retail Showroom Hub (Modo Degustação)

Plataforma in-house de vitrine interativa e modo degustação para smartphones em bancadas de loja (Android e iOS).

---

## Como Rodar a Demonstração

### Opção 1: Via script pronto
Abra o PowerShell nesta pasta e execute:
```powershell
.\start-demo.ps1
```

### Opção 2: Via npm
```powershell
npm run dev
```

---

## Links de Acesso

| Destino | URL no Computador | URL no iPhone 16 (mesmo Wi-Fi) |
| :--- | :--- | :--- |
| **Celular de Vitrine** | `http://localhost:3000/display` | `http://192.168.1.3:3000/display` |
| **Painel Administrativo** | `http://localhost:3000/admin` | `http://192.168.1.3:3000/admin` |

> Dica: No rodapé da aplicação existe um seletor flutuante para alternar entre `/display` e `/admin` com 1 clique!

---

## Como Impressionar na Demonstração de Amanhã

1. **Abra o `/display`** no seu iPhone 16 (ou no navegador em modo celular pressionando F12).
2. **Deixe o vídeo em tela cheia rodando (Attract Mode):** O visual é dinâmico com branding TIM, preço parcelado e chamada para toque.
3. **Toque na tela:** O sistema transita suavemente para o **Interactive Hub** (recursos de IA, câmeras de 200MP, cores e ficha técnica).
4. **Demonstre o Watchdog de Inatividade:** Pare de mexer no celular por 30 segundos. O sistema detecta a ausência de clientes, reseta a navegação e volta sozinho para o vídeo de atração em tela cheia.
5. **Demonstre a Atualização em Tempo Real:** 
   - No computador, abra o `/admin`.
   - Mude o valor da parcela (ex: de R$ 541,58 para R$ 499,90) e clique em **Transmitir Preço**.
   - Observe a tela do iPhone/Display atualizar o valor **no mesmo segundo**, sem precisar recarregar a página (comunicação SSE).
6. **Demonstre o PIN do Promotor:**
   - No canto superior esquerdo, dê **3 toques rápidos sobre o logo TIM**.
   - O modal seguro com teclado numérico abrirá pedindo o PIN.
   - Digite `1234` para ativar o modo de demonstração assistida por promotor.

---

## Conformidade com a Segurança (TIM InfoSec)
- **Zero Instalação Nativa:** Opera 100% no sandbox do navegador (PWA), sem permissões perigosas de SO.
- **Zero Dados Sensíveis:** Não coleta nem armazena nenhum dado pessoal de clientes ou colaboradores.
- **Comunicação Criptografada:** Utiliza tráfego HTTPS / TLS padrão.
