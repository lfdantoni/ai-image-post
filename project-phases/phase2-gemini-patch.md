# Parche Fase 2: Soporte Multi-Proveedor IA (OpenAI + Gemini)

## Resumen

Este parche extiende la Fase 2 para soportar múltiples proveedores de IA, permitiendo al usuario elegir entre **OpenAI (GPT-4)** y **Google Gemini** para la generación de captions y hashtags.

**Beneficios:**
- Flexibilidad de elección según preferencia del usuario
- Fallback automático si un proveedor falla
- Comparación de costos (Gemini es más económico)
- Reducción de dependencia de un solo proveedor

---

## 1. Nuevas Variables de Entorno

```env
# Agregar a .env.local (además de las existentes de OpenAI)

# Google Gemini
GOOGLE_GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-1.5-flash  # Opciones: gemini-1.5-pro, gemini-1.5-flash

# Configuración de proveedor por defecto
DEFAULT_AI_PROVIDER=gemini  # Opciones: openai, gemini
```

---

## 2. Nueva Dependencia

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.21.0"
  }
}
```

---

## 3. Arquitectura Multi-Proveedor

### 3.1 Tipos Comunes

**Ubicación:** `types/ai-providers.ts`

**Instrucciones para la AI:**
```
Crear tipos TypeScript para el sistema multi-proveedor:

type AIProvider = "openai" | "gemini";

interface AIProviderConfig {
  provider: AIProvider;
  model: string;
  maxTokens: number;
  temperature: number;
}

interface CaptionGenerationParams {
  prompt: string;
  tone: "artistic" | "casual" | "professional" | "inspirational";
  length: "short" | "medium" | "long";
  includeEmojis: boolean;
  includeQuestion: boolean;
  includeCTA: boolean;
  language: string;
  provider?: AIProvider;  // Opcional, usa el default si no se especifica
}

interface HashtagGenerationParams {
  prompt: string;
  caption?: string;
  count: number;
  categories: {
    trending: boolean;
    niche: boolean;
    branded: boolean;
  };
  provider?: AIProvider;
}

interface AIGenerationResult<T> {
  data: T;
  provider: AIProvider;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}
```

### 3.2 Clase Base del Proveedor

**Ubicación:** `lib/ai/base-provider.ts`

**Instrucciones para la AI:**
```
Crear una clase abstracta que defina la interfaz común para todos los proveedores:

abstract class BaseAIProvider {
  abstract readonly name: AIProvider;
  abstract readonly model: string;
  
  abstract generateCaption(params: CaptionGenerationParams): Promise<string>;
  abstract generateHashtags(params: HashtagGenerationParams): Promise<Hashtag[]>;
  
  // Método común para construir el system prompt de captions
  protected buildCaptionSystemPrompt(params: CaptionGenerationParams): string {
    // Lógica común para construir el prompt según tono, longitud, etc.
    // Este método es compartido entre proveedores
  }
  
  // Método común para construir el prompt de hashtags
  protected buildHashtagPrompt(params: HashtagGenerationParams): string {
    // Lógica común
  }
  
  // Mapeo de longitud a número de caracteres
  protected getLengthRange(length: string): { min: number; max: number } {
    // short: 50-100, medium: 100-300, long: 300-500
  }
}

Incluir la lógica compartida de construcción de prompts en la clase base
para evitar duplicación entre proveedores.
```

### 3.3 Proveedor OpenAI

**Ubicación:** `lib/ai/openai-provider.ts`

**Instrucciones para la AI:**
```
Crear implementación del proveedor OpenAI que extiende BaseAIProvider:

class OpenAIProvider extends BaseAIProvider {
  readonly name = "openai" as const;
  readonly model: string;
  private client: OpenAI;
  
  constructor(model?: string) {
    // Inicializar cliente OpenAI
    // Modelo por defecto: gpt-4o-mini
  }
  
  async generateCaption(params: CaptionGenerationParams): Promise<string> {
    // 1. Construir system prompt usando método heredado
    // 2. Llamar a OpenAI chat completions
    // 3. Extraer y retornar el caption
  }
  
  async generateHashtags(params: HashtagGenerationParams): Promise<Hashtag[]> {
    // 1. Construir prompt pidiendo respuesta JSON
    // 2. Llamar a OpenAI con response_format: { type: "json_object" }
    // 3. Parsear y retornar hashtags
  }
}

Usar el modelo gpt-4o-mini por defecto por costo.
Incluir manejo de errores específicos de OpenAI.
```

### 3.4 Proveedor Gemini

**Ubicación:** `lib/ai/gemini-provider.ts`

**Instrucciones para la AI:**
```
Crear implementación del proveedor Google Gemini que extiende BaseAIProvider:

class GeminiProvider extends BaseAIProvider {
  readonly name = "gemini" as const;
  readonly model: string;
  private client: GoogleGenerativeAI;
  private generativeModel: GenerativeModel;
  
  constructor(model?: string) {
    // Inicializar cliente Gemini
    // Modelo por defecto: gemini-1.5-flash (más económico y rápido)
    // Alternativa: gemini-1.5-pro (más capaz)
  }
  
  async generateCaption(params: CaptionGenerationParams): Promise<string> {
    // 1. Construir prompt (Gemini usa un solo prompt, no system + user)
    // 2. Llamar a generativeModel.generateContent()
    // 3. Extraer texto de response.response.text()
  }
  
  async generateHashtags(params: HashtagGenerationParams): Promise<Hashtag[]> {
    // 1. Construir prompt pidiendo JSON
    // 2. Configurar generationConfig con responseMimeType: "application/json"
    // 3. Parsear respuesta JSON
  }
}

Notas específicas de Gemini:
- No tiene "system prompt" separado, combinar todo en un solo prompt
- Usar generationConfig para controlar output
- El rate limit es más generoso que OpenAI
- Soporta responseMimeType para forzar JSON
```

### 3.5 Factory de Proveedores

**Ubicación:** `lib/ai/provider-factory.ts`

**Instrucciones para la AI:**
```
Crear un factory que instancie el proveedor correcto:

class AIProviderFactory {
  private static instances: Map<AIProvider, BaseAIProvider> = new Map();
  
  static getProvider(provider?: AIProvider): BaseAIProvider {
    // 1. Si no se especifica, usar DEFAULT_AI_PROVIDER del env
    // 2. Retornar instancia cacheada si existe (singleton por proveedor)
    // 3. Crear nueva instancia si no existe
    // 4. Cachear y retornar
  }
  
  static getDefaultProvider(): AIProvider {
    // Leer de env o retornar "gemini" como default
  }
  
  static getAllProviders(): AIProvider[] {
    return ["openai", "gemini"];
  }
  
  static isProviderAvailable(provider: AIProvider): boolean {
    // Verificar si las API keys necesarias están configuradas
  }
}

Implementar patrón singleton para evitar crear múltiples clientes.
```

### 3.6 Servicio Unificado con Fallback

**Ubicación:** `lib/ai/ai-service.ts`

**Instrucciones para la AI:**
```
Crear servicio de alto nivel que maneje la lógica de fallback:

class AIService {
  private primaryProvider: AIProvider;
  private fallbackProvider: AIProvider | null;
  
  constructor(primary?: AIProvider, fallback?: AIProvider) {
    // Configurar proveedor primario y fallback
  }
  
  async generateCaption(
    params: CaptionGenerationParams
  ): Promise<AIGenerationResult<string>> {
    const startTime = Date.now();
    const provider = params.provider || this.primaryProvider;
    
    try {
      // 1. Intentar con el proveedor seleccionado/primario
      const result = await AIProviderFactory.getProvider(provider)
        .generateCaption(params);
      
      return {
        data: result,
        provider,
        model: AIProviderFactory.getProvider(provider).model,
        usage: { /* extraer del response */ },
        latencyMs: Date.now() - startTime
      };
    } catch (error) {
      // 2. Si falla y hay fallback, intentar con fallback
      if (this.fallbackProvider && provider !== this.fallbackProvider) {
        console.warn(`Provider ${provider} failed, trying fallback...`);
        return this.generateCaption({
          ...params,
          provider: this.fallbackProvider
        });
      }
      throw error;
    }
  }
  
  async generateHashtags(
    params: HashtagGenerationParams
  ): Promise<AIGenerationResult<Hashtag[]>> {
    // Lógica similar con fallback
  }
}

// Exportar instancia singleton
export const aiService = new AIService();

El servicio debe:
- Medir latencia de cada request
- Loguear qué proveedor se usó
- Manejar fallback automático
- Retornar metadata sobre el proveedor usado
```

---

## 4. Actualizaciones a API Routes

### 4.1 Caption Generation (Actualizado)

**Ubicación:** `app/api/ai/caption/route.ts`

**Instrucciones para la AI:**
```
Actualizar la API route de caption para soportar selección de proveedor:

Request body actualizado:
{
  prompt: string,
  tone: string,
  length: string,
  includeEmojis: boolean,
  includeQuestion: boolean,
  includeCTA: boolean,
  language: string,
  provider?: "openai" | "gemini"  // NUEVO: opcional
}

Respuesta actualizada:
{
  caption: string,
  metadata: {
    provider: string,      // Qué proveedor se usó
    model: string,         // Qué modelo específico
    latencyMs: number,     // Tiempo de respuesta
    usage: {
      inputTokens: number,
      outputTokens: number,
      totalTokens: number
    }
  }
}

Implementación:
1. Extraer provider del body (o usar default)
2. Usar aiService.generateCaption()
3. Retornar resultado con metadata del proveedor
```

### 4.2 Hashtag Generation (Actualizado)

**Ubicación:** `app/api/ai/hashtags/route.ts`

**Instrucciones para la AI:**
```
Actualizar similarmente para hashtags:

Request body con provider opcional.

Respuesta incluye metadata del proveedor usado.

Misma estructura que caption route.
```

---

## 5. Actualizaciones a Componentes UI

### 5.1 Selector de Proveedor IA

**Ubicación:** `components/ai/AIProviderSelector.tsx`

**Instrucciones para la AI:**
```
Crear componente para seleccionar el proveedor de IA:

Props:
- selected: AIProvider
- onChange: (provider: AIProvider) => void
- showComparison?: boolean  // Mostrar info de comparación

Características:
- Dos opciones visuales: OpenAI y Gemini
- Cada opción muestra:
  - Logo/icono del proveedor
  - Nombre
  - Badge de "Recomendado" si es el default
  - Indicador de disponibilidad (si API key está configurada)
- Tooltip con info de comparación:
  - OpenAI: "Más preciso, mayor costo"
  - Gemini: "Más rápido, menor costo"
- Si solo un proveedor está disponible, mostrar mensaje y deshabilitar el otro

Diseño: Radio buttons estilizados como cards pequeñas lado a lado.
```

### 5.2 CaptionGenerator (Actualizado)

**Ubicación:** `components/ai/CaptionGenerator.tsx`

**Instrucciones para la AI:**
```
Agregar al componente CaptionGenerator existente:

Nuevos estados:
- selectedProvider: AIProvider (default del env)
- providerUsed: AIProvider | null (después de generar)
- generationMetadata: { latencyMs, model, tokens } | null

Nuevos elementos UI:
- Agregar AIProviderSelector debajo del selector de idioma
- Después de generar, mostrar badge pequeño indicando:
  "Generado con {provider} ({model}) en {latencyMs}ms"
- Si hubo fallback, mostrar: "Generado con {fallback} (fallback)"

El selector de proveedor debe estar colapsado por defecto
en un acordeón "Opciones avanzadas" junto con otras configs.
```

### 5.3 HashtagGenerator (Actualizado)

**Ubicación:** `components/ai/HashtagGenerator.tsx`

**Instrucciones para la AI:**
```
Agregar selector de proveedor similar al CaptionGenerator.

Incluir los mismos elementos:
- Selector de proveedor
- Metadata de generación después de generar
- Indicador de fallback si aplica
```

---

## 6. Hooks Actualizados

### 6.1 useGenerateCaption (Actualizado)

**Ubicación:** `hooks/useGenerateCaption.ts`

**Instrucciones para la AI:**
```
Actualizar el hook para soportar selección de proveedor:

Nuevo parámetro en generateCaption:
- provider?: AIProvider

Nuevos valores de retorno:
- providerUsed: AIProvider | null
- metadata: GenerationMetadata | null

interface GenerationMetadata {
  provider: AIProvider;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
}

El hook debe:
- Aceptar provider opcional en generateCaption()
- Almacenar metadata de la última generación
- Exponer providerUsed para mostrar en UI
```

### 6.2 useGenerateHashtags (Actualizado)

**Instrucciones para la AI:**
```
Actualizar similarmente con:
- provider opcional
- metadata de generación
- providerUsed en el retorno
```

### 6.3 useAIProviders (Nuevo)

**Ubicación:** `hooks/useAIProviders.ts`

**Instrucciones para la AI:**
```
Crear hook para gestionar estado de proveedores:

Retorno:
{
  availableProviders: AIProvider[],
  defaultProvider: AIProvider,
  isProviderAvailable: (provider: AIProvider) => boolean,
  getProviderInfo: (provider: AIProvider) => ProviderInfo
}

interface ProviderInfo {
  name: string;
  displayName: string;  // "OpenAI GPT-4" o "Google Gemini"
  icon: string;         // URL o nombre de icono
  description: string;
  isAvailable: boolean;
  isDefault: boolean;
}

El hook debe:
- Llamar a un endpoint /api/ai/providers para obtener info
- Cachear la respuesta
- Determinar disponibilidad basado en si las API keys están configuradas
```

---

## 7. Nueva API Route: Provider Info

**Ubicación:** `app/api/ai/providers/route.ts`

**Instrucciones para la AI:**
```
Crear endpoint que retorna información de proveedores disponibles:

GET /api/ai/providers

Respuesta:
{
  providers: [
    {
      name: "openai",
      displayName: "OpenAI GPT-4",
      isAvailable: true,
      isDefault: false,
      models: ["gpt-4o-mini", "gpt-4o"],
      defaultModel: "gpt-4o-mini"
    },
    {
      name: "gemini", 
      displayName: "Google Gemini",
      isAvailable: true,
      isDefault: true,
      models: ["gemini-1.5-flash", "gemini-1.5-pro"],
      defaultModel: "gemini-1.5-flash"
    }
  ],
  defaultProvider: "gemini"
}

Determinar isAvailable verificando si la API key correspondiente
está presente en las variables de entorno.

No exponer las API keys, solo indicar si están configuradas.
```

---

## 8. Configuración del Usuario (Opcional)

### 8.1 Modelo de Datos

**Instrucciones para la AI:**
```
Agregar campo de preferencia de proveedor al modelo User en Prisma:

model User {
  // ... campos existentes ...
  
  // Preferencias de IA
  preferredAIProvider  String?  @default("gemini")
  
  // ... resto de campos ...
}

Esto permite que cada usuario tenga su proveedor preferido
guardado en su perfil.
```

### 8.2 Settings de Usuario

**Ubicación:** `app/(dashboard)/settings/page.tsx`

**Instrucciones para la AI:**
```
En la página de settings del usuario, agregar sección:

"Preferencias de IA"
- Selector de proveedor por defecto
- Descripción de cada opción
- Botón guardar

Cuando el usuario cambia su preferencia, actualizar en BD
y usar ese valor como default en los hooks de generación.
```

---

## 9. Comparación de Proveedores

### Tabla de Referencia

| Aspecto | OpenAI (gpt-4o-mini) | Gemini (1.5-flash) |
|---------|---------------------|-------------------|
| Costo aproximado | $0.15/1M input, $0.60/1M output | $0.075/1M input, $0.30/1M output |
| Velocidad | ~1-2s por request | ~0.5-1s por request |
| Calidad captions | Excelente | Muy buena |
| JSON estructurado | Nativo con response_format | Nativo con responseMimeType |
| Rate limits | 500 RPM (tier 1) | 1500 RPM |
| Fallback recomendado | Gemini como fallback | OpenAI como fallback |

### Recomendación por Defecto

**Gemini 1.5 Flash** se recomienda como default porque:
1. ~50% más económico
2. ~2x más rápido
3. Rate limits más generosos
4. Calidad suficiente para captions e hashtags

OpenAI se recomienda para:
1. Casos que requieran máxima precisión
2. Usuarios con preferencia específica
3. Como fallback si Gemini falla

---

## 10. Testing Adicional

```markdown
## Tests Multi-Proveedor
- [ ] Generación de caption con OpenAI funciona
- [ ] Generación de caption con Gemini funciona
- [ ] Fallback a Gemini cuando OpenAI falla
- [ ] Fallback a OpenAI cuando Gemini falla
- [ ] Selector de proveedor cambia el proveedor usado
- [ ] Metadata muestra proveedor correcto después de generar
- [ ] Proveedor no disponible se muestra deshabilitado
- [ ] Preferencia de usuario se guarda correctamente
- [ ] Default del sistema se usa cuando no hay preferencia

## Tests de Edge Cases
- [ ] Solo OpenAI configurado - funciona sin selector
- [ ] Solo Gemini configurado - funciona sin selector
- [ ] Ningún proveedor configurado - muestra error amigable
- [ ] API key inválida - fallback funciona
- [ ] Rate limit alcanzado - fallback funciona
- [ ] Timeout - fallback funciona
```

---

## 11. Checklist de Implementación del Parche

```markdown
## Configuración
- [ ] Agregar GOOGLE_GEMINI_API_KEY a .env
- [ ] Agregar DEFAULT_AI_PROVIDER a .env
- [ ] Instalar @google/generative-ai

## Código Core
- [ ] Crear types/ai-providers.ts
- [ ] Crear lib/ai/base-provider.ts
- [ ] Crear lib/ai/openai-provider.ts
- [ ] Crear lib/ai/gemini-provider.ts
- [ ] Crear lib/ai/provider-factory.ts
- [ ] Crear lib/ai/ai-service.ts

## API Routes
- [ ] Actualizar /api/ai/caption con soporte multi-proveedor
- [ ] Actualizar /api/ai/hashtags con soporte multi-proveedor
- [ ] Crear /api/ai/providers

## Componentes UI
- [ ] Crear AIProviderSelector
- [ ] Actualizar CaptionGenerator
- [ ] Actualizar HashtagGenerator

## Hooks
- [ ] Actualizar useGenerateCaption
- [ ] Actualizar useGenerateHashtags
- [ ] Crear useAIProviders

## Base de Datos (Opcional)
- [ ] Agregar preferredAIProvider a User
- [ ] Crear página de settings con preferencia

## Testing
- [ ] Tests de integración para ambos proveedores
- [ ] Tests de fallback
- [ ] Tests de UI
```

---

## Notas de Migración

Si ya tienes la Fase 2 implementada solo con OpenAI:

1. **No hay breaking changes** - El código existente seguirá funcionando
2. **Agregar Gemini es opcional** - Si no configuras la API key, solo OpenAI estará disponible
3. **El default puede mantenerse en OpenAI** - Cambiar DEFAULT_AI_PROVIDER si prefieres
4. **Migración gradual** - Puedes implementar el parche por partes:
   - Primero: Agregar GeminiProvider
   - Después: Agregar UI de selección
   - Finalmente: Agregar preferencias de usuario