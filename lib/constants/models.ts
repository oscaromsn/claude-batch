export const CLAUDE_MODELS = {
    // Claude 4 models
    OPUS_4: "claude-opus-4-20250514",
    SONNET_4: "claude-sonnet-4-20250514",

    // Claude 3.7 models
    SONNET_3_7: "claude-3-7-sonnet-20250219",

    // Claude 3.5 models
    SONNET_3_5_V2: "claude-3-5-sonnet-20241022",
    SONNET_3_5: "claude-3-5-sonnet-20240620",
    HAIKU_3_5: "claude-3-5-haiku-20241022",

    // Claude 3 models
    OPUS_3: "claude-3-opus-20240229",
    SONNET_3: "claude-3-sonnet-20240229",
    HAIKU_3: "claude-3-haiku-20240307",
} as const;

export const MODEL_ALIASES = {
    "claude-opus-4-0": CLAUDE_MODELS.OPUS_4,
    "claude-sonnet-4-0": CLAUDE_MODELS.SONNET_4,
    "claude-3-7-sonnet-latest": CLAUDE_MODELS.SONNET_3_7,
    "claude-3-5-sonnet-latest": CLAUDE_MODELS.SONNET_3_5_V2,
    "claude-3-5-haiku-latest": CLAUDE_MODELS.HAIKU_3_5,
    "claude-3-opus-latest": CLAUDE_MODELS.OPUS_3,
} as const;

export const MODEL_DETAILS = {
    [CLAUDE_MODELS.OPUS_4]: {
        name: "Claude Opus 4",
        description: "Our most capable and intelligent model yet",
        contextWindow: 200000,
        maxOutput: 32000,
        supportsVision: true,
        supportsThinking: true,
        trainingCutoff: "Mar 2025",
        generation: "4",
        tier: "opus",
    },
    [CLAUDE_MODELS.SONNET_4]: {
        name: "Claude Sonnet 4",
        description:
            "High-performance model with exceptional reasoning capabilities",
        contextWindow: 200000,
        maxOutput: 64000,
        supportsVision: true,
        supportsThinking: true,
        trainingCutoff: "Mar 2025",
        generation: "4",
        tier: "sonnet",
    },
    [CLAUDE_MODELS.SONNET_3_7]: {
        name: "Claude 3.7 Sonnet",
        description: "High-performance model with early extended thinking",
        contextWindow: 200000,
        maxOutput: 64000,
        maxOutputExtended: 128000, // with output-128k beta flag
        supportsVision: true,
        supportsThinking: true,
        trainingCutoff: "Oct 2024",
        generation: "3.7",
        tier: "sonnet",
    },
    [CLAUDE_MODELS.SONNET_3_5_V2]: {
        name: "Claude 3.5 Sonnet (Oct 2024)",
        description: "Our previous intelligent model",
        contextWindow: 200000,
        maxOutput: 8192,
        supportsVision: true,
        supportsThinking: false,
        trainingCutoff: "Apr 2024",
        generation: "3.5",
        tier: "sonnet",
    },
    [CLAUDE_MODELS.SONNET_3_5]: {
        name: "Claude 3.5 Sonnet (Jun 2024)",
        description: "Previous version of Claude 3.5 Sonnet",
        contextWindow: 200000,
        maxOutput: 8192,
        supportsVision: true,
        supportsThinking: false,
        trainingCutoff: "Apr 2024",
        generation: "3.5",
        tier: "sonnet",
    },
    [CLAUDE_MODELS.HAIKU_3_5]: {
        name: "Claude 3.5 Haiku",
        description: "Our fastest model",
        contextWindow: 200000,
        maxOutput: 8192,
        supportsVision: true,
        supportsThinking: false,
        trainingCutoff: "Jul 2024",
        generation: "3.5",
        tier: "haiku",
    },
    [CLAUDE_MODELS.OPUS_3]: {
        name: "Claude 3 Opus",
        description: "Powerful model for complex tasks",
        contextWindow: 200000,
        maxOutput: 4096,
        supportsVision: true,
        supportsThinking: false,
        trainingCutoff: "Aug 2023",
        generation: "3",
        tier: "opus",
    },
    [CLAUDE_MODELS.SONNET_3]: {
        name: "Claude 3 Sonnet",
        description: "Balanced model for most tasks",
        contextWindow: 200000,
        maxOutput: 4096,
        supportsVision: true,
        supportsThinking: false,
        trainingCutoff: "Aug 2023",
        generation: "3",
        tier: "sonnet",
    },
    [CLAUDE_MODELS.HAIKU_3]: {
        name: "Claude 3 Haiku",
        description: "Fast and compact model for near-instant responsiveness",
        contextWindow: 200000,
        maxOutput: 4096,
        supportsVision: true,
        supportsThinking: false,
        trainingCutoff: "Aug 2023",
        generation: "3",
        tier: "haiku",
    },
} as const;

export const MODEL_TOKEN_LIMITS = {
    [CLAUDE_MODELS.OPUS_4]: {
        standardLimit: 32000,
        extendedLimit: 32000,
        thinkingLimit: 32000,
        supportsThinking: true,
    },
    [CLAUDE_MODELS.SONNET_4]: {
        standardLimit: 64000,
        extendedLimit: 64000,
        thinkingLimit: 64000,
        supportsThinking: true,
    },
    [CLAUDE_MODELS.SONNET_3_7]: {
        standardLimit: 8192,
        extendedLimit: 128000, // with output-128k beta flag
        thinkingLimit: 64000, // when thinking mode is enabled
        supportsThinking: true,
    },
    [CLAUDE_MODELS.SONNET_3_5_V2]: {
        standardLimit: 8192,
        extendedLimit: 8192,
        thinkingLimit: 8192, // same as standard
        supportsThinking: false,
    },
    [CLAUDE_MODELS.HAIKU_3_5]: {
        standardLimit: 8192,
        extendedLimit: 8192,
        thinkingLimit: 8192,
        supportsThinking: false,
    },
    [CLAUDE_MODELS.SONNET_3_5]: {
        standardLimit: 8192,
        extendedLimit: 8192,
        thinkingLimit: 8192,
        supportsThinking: false,
    },
    [CLAUDE_MODELS.OPUS_3]: {
        standardLimit: 4096,
        extendedLimit: 4096,
        thinkingLimit: 4096,
        supportsThinking: false,
    },
    [CLAUDE_MODELS.SONNET_3]: {
        standardLimit: 4096,
        extendedLimit: 4096,
        thinkingLimit: 4096,
        supportsThinking: false,
    },
    [CLAUDE_MODELS.HAIKU_3]: {
        standardLimit: 4096,
        extendedLimit: 4096,
        thinkingLimit: 4096,
        supportsThinking: false,
    },
} satisfies Record<
    string,
    {
        standardLimit: number;
        extendedLimit: number;
        thinkingLimit: number;
        supportsThinking: boolean;
    }
>;

export const BETA_HEADERS = {
    OUTPUT_128K: {
        name: "anthropic-beta",
        value: "output-128k-2025-02-19",
        description:
            "Extends output tokens up to 128k (Claude 3.7 Sonnet only)",
        modelRestriction: CLAUDE_MODELS.SONNET_3_7,
    },
} as const;

// Helper functions
export const getModelDetails = (modelId: string) => {
    return MODEL_DETAILS[modelId as keyof typeof MODEL_DETAILS];
};

export const getModelTokenLimits = (modelId: string) => {
    return MODEL_TOKEN_LIMITS[modelId as keyof typeof MODEL_TOKEN_LIMITS];
};

export const isModelSupported = (modelId: string): boolean => {
    return modelId in MODEL_DETAILS;
};

export const getModelsBy = (criteria: {
    generation?: string;
    tier?: string;
    supportsThinking?: boolean;
    supportsVision?: boolean;
}) => {
    return Object.entries(MODEL_DETAILS)
        .filter(([, details]) => {
            if (
                criteria.generation &&
                details.generation !== criteria.generation
            )
                return false;
            if (criteria.tier && details.tier !== criteria.tier) return false;
            if (
                criteria.supportsThinking !== undefined &&
                details.supportsThinking !== criteria.supportsThinking
            )
                return false;
            if (
                criteria.supportsVision !== undefined &&
                details.supportsVision !== criteria.supportsVision
            )
                return false;
            return true;
        })
        .map(([modelId]) => modelId);
};

export const DEFAULT_MODEL = CLAUDE_MODELS.SONNET_4;

// Export all model IDs as an array for validation schemas
export const ALL_MODEL_IDS = Object.values(CLAUDE_MODELS);

// Type definitions
export type ClaudeModel = (typeof CLAUDE_MODELS)[keyof typeof CLAUDE_MODELS];
export type ModelDetails = (typeof MODEL_DETAILS)[keyof typeof MODEL_DETAILS];
export type TokenLimits =
    (typeof MODEL_TOKEN_LIMITS)[keyof typeof MODEL_TOKEN_LIMITS];
